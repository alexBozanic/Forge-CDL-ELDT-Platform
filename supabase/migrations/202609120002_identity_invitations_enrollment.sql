begin;

do $$ begin
  create type public.course_version_status as enum ('draft', 'published', 'retired');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.invitation_status as enum ('pending', 'accepted', 'revoked');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.enrollment_status as enum ('active', 'suspended', 'withdrawn', 'completed');
exception when duplicate_object then null;
end $$;

create or replace function private.has_organization_role(
  check_organization_id uuid,
  allowed_roles public.organization_role[],
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select check_user_id is not null and exists (
    select 1
    from public.organization_memberships m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = check_organization_id
      and m.user_id = check_user_id
      and m.status = 'active'
      and m.role = any(allowed_roles)
      and o.status = 'active'
  );
$$;

create table public.courses (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 160),
  description text not null default '',
  is_demo boolean not null default true,
  created_at timestamptz not null default statement_timestamp()
);

create table public.course_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  status public.course_version_status not null default 'draft',
  manifest_hash text not null check (manifest_hash ~ '^[0-9a-f]{64}$'),
  published_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  unique (course_id, version_number),
  check ((status = 'draft' and published_at is null) or (status <> 'draft' and published_at is not null)),
  check ((status = 'retired') = (retired_at is not null))
);

create table public.course_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  course_version_id uuid not null references public.course_versions(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 160),
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  unique (organization_id, id),
  unique (organization_id, id, course_version_id),
  unique (organization_id, title)
);

create table public.invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  email text not null check (email = lower(btrim(email)) and length(email) between 3 and 320),
  allowed_role public.organization_role not null default 'student' check (allowed_role = 'student'),
  assignment_id uuid,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  accepted_by uuid references auth.users(id) on delete restrict,
  accepted_at timestamptz,
  revoked_by uuid references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  foreign key (organization_id, assignment_id)
    references public.course_assignments (organization_id, id) on delete restrict,
  check ((status = 'accepted') = (accepted_by is not null and accepted_at is not null)),
  check ((status = 'revoked') = (revoked_by is not null and revoked_at is not null))
);
create unique index invitations_one_pending_email_idx
  on public.invitations (organization_id, email)
  where status = 'pending';

create table public.enrollments (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  student_user_id uuid not null,
  assignment_id uuid not null,
  course_version_id uuid not null,
  status public.enrollment_status not null default 'active',
  enrolled_by uuid not null references auth.users(id) on delete restrict,
  enrolled_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  foreign key (organization_id, student_user_id)
    references public.organization_memberships (organization_id, user_id) on delete restrict,
  foreign key (organization_id, assignment_id, course_version_id)
    references public.course_assignments (organization_id, id, course_version_id) on delete restrict,
  unique (organization_id, student_user_id, assignment_id),
  unique (organization_id, id)
);

create table public.enrollment_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  enrollment_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  from_status public.enrollment_status,
  to_status public.enrollment_status not null,
  reason text,
  occurred_at timestamptz not null default statement_timestamp(),
  foreign key (organization_id, enrollment_id)
    references public.enrollments (organization_id, id) on delete restrict
);

create or replace function private.require_published_assignment()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.course_versions v
    where v.id = new.course_version_id and v.status = 'published'
  ) then
    raise exception 'assignment requires a published course version' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger course_assignments_require_published
before insert or update of course_version_id on public.course_assignments
for each row execute function private.require_published_assignment();

create or replace function private.prevent_course_version_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status in ('published', 'retired') and (
    new.course_id <> old.course_id or new.version_number <> old.version_number
    or new.manifest_hash <> old.manifest_hash or new.published_at <> old.published_at
  ) then
    raise exception 'published course versions are immutable' using errcode = '23514';
  end if;
  if old.status = 'retired' and new.status <> 'retired' then
    raise exception 'retired course versions cannot be restored' using errcode = '23514';
  end if;
  if old.status = 'published' and new.status not in ('published', 'retired') then
    raise exception 'published course versions may only be retired' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger course_versions_immutable
before update on public.course_versions
for each row execute function private.prevent_course_version_mutation();

create or replace function public.create_organization(
  organization_name text, organization_slug text, organization_email text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if not private.is_platform_administrator(auth.uid()) then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  insert into public.organizations (name, slug, contact_email)
  values (organization_name, organization_slug, nullif(lower(btrim(organization_email)), ''))
  returning id into new_id;
  perform private.write_audit_event(new_id, 'organization.created', 'organization', new_id::text);
  return new_id;
end;
$$;

create or replace function public.update_organization_settings(
  target_organization_id uuid, organization_name text, organization_email text,
  primary_color text, accent_color text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_administrator(auth.uid()) and not private.has_organization_role(
    target_organization_id, array['school_admin']::public.organization_role[]
  ) then raise exception 'school administrator required' using errcode = '42501'; end if;
  update public.organizations set name = organization_name,
    contact_email = nullif(lower(btrim(organization_email)), ''),
    brand_primary_color = primary_color, brand_accent_color = accent_color,
    updated_at = statement_timestamp()
  where id = target_organization_id;
  if not found then raise exception 'organization not found' using errcode = 'P0002'; end if;
  perform private.write_audit_event(target_organization_id, 'organization.settings_updated', 'organization', target_organization_id::text);
end;
$$;

create or replace function public.create_student_invitation(
  target_organization_id uuid, invitation_email text, invitation_token_hash text,
  invitation_expires_at timestamptz, target_assignment_id uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if not private.has_organization_role(target_organization_id, array['school_admin']::public.organization_role[])
    and not private.is_platform_administrator(auth.uid()) then
    raise exception 'school administrator required' using errcode = '42501';
  end if;
  if invitation_expires_at <= statement_timestamp() or invitation_expires_at > statement_timestamp() + interval '30 days' then
    raise exception 'invitation expiry must be in the next 30 days' using errcode = '22023';
  end if;
  if target_assignment_id is not null and not exists (
    select 1 from public.course_assignments a where a.organization_id = target_organization_id
      and a.id = target_assignment_id and a.active
  ) then raise exception 'active tenant assignment required' using errcode = '23503'; end if;
  insert into public.invitations (organization_id, email, token_hash, expires_at, assignment_id, created_by)
  values (target_organization_id, lower(btrim(invitation_email)), invitation_token_hash,
    invitation_expires_at, target_assignment_id, auth.uid()) returning id into new_id;
  perform private.write_audit_event(target_organization_id, 'invitation.created', 'invitation', new_id::text,
    jsonb_build_object('assignment_id', target_assignment_id));
  return new_id;
end;
$$;

create or replace function public.revoke_invitation(target_invitation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare invitation_organization_id uuid;
begin
  select organization_id into invitation_organization_id from public.invitations where id = target_invitation_id for update;
  if invitation_organization_id is null then raise exception 'invitation not found' using errcode = 'P0002'; end if;
  if not private.has_organization_role(invitation_organization_id, array['school_admin']::public.organization_role[])
    and not private.is_platform_administrator(auth.uid()) then raise exception 'school administrator required' using errcode = '42501'; end if;
  update public.invitations set status = 'revoked', revoked_by = auth.uid(), revoked_at = statement_timestamp()
  where id = target_invitation_id and status = 'pending';
  if not found then raise exception 'only pending invitations can be revoked' using errcode = '55000'; end if;
  perform private.write_audit_event(invitation_organization_id, 'invitation.revoked', 'invitation', target_invitation_id::text);
end;
$$;

create or replace function public.accept_student_invitation(invitation_token_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invitation_row public.invitations%rowtype; authenticated_email text; new_enrollment_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select lower(email) into authenticated_email from auth.users
  where id = auth.uid() and email_confirmed_at is not null;
  select * into invitation_row from public.invitations where token_hash = invitation_token_hash for update;
  if not found then raise exception 'invitation is invalid' using errcode = '22023'; end if;
  if invitation_row.status <> 'pending' then raise exception 'invitation is no longer pending' using errcode = '55000'; end if;
  if invitation_row.expires_at <= statement_timestamp() then raise exception 'invitation has expired' using errcode = '22023'; end if;
  if authenticated_email is null or authenticated_email <> invitation_row.email then
    raise exception 'authenticated email does not match invitation' using errcode = '42501';
  end if;
  if exists (select 1 from public.organization_memberships m where m.organization_id = invitation_row.organization_id
    and m.user_id = auth.uid() and m.status in ('suspended', 'removed')) then
    raise exception 'suspended or removed membership cannot accept an invitation' using errcode = '42501';
  end if;
  insert into public.organization_memberships (organization_id, user_id, role, status, granted_by)
  values (invitation_row.organization_id, auth.uid(), invitation_row.allowed_role, 'active', invitation_row.created_by)
  on conflict (organization_id, user_id) do update set status = 'active', updated_at = statement_timestamp()
    where public.organization_memberships.status = 'invited' and public.organization_memberships.role = excluded.role;
  if not found then raise exception 'existing membership is not eligible for acceptance' using errcode = '42501'; end if;
  if invitation_row.assignment_id is not null then
    insert into public.enrollments (organization_id, student_user_id, assignment_id, course_version_id, enrolled_by)
    select a.organization_id, auth.uid(), a.id, a.course_version_id, invitation_row.created_by
    from public.course_assignments a where a.organization_id = invitation_row.organization_id
      and a.id = invitation_row.assignment_id and a.active
    on conflict (organization_id, student_user_id, assignment_id) do nothing
    returning id into new_enrollment_id;
    if new_enrollment_id is null then raise exception 'assignment is unavailable or enrollment already exists' using errcode = '55000'; end if;
    insert into public.enrollment_events (organization_id, enrollment_id, actor_user_id, to_status)
    values (invitation_row.organization_id, new_enrollment_id, auth.uid(), 'active');
  end if;
  update public.invitations set status = 'accepted', accepted_by = auth.uid(), accepted_at = statement_timestamp()
  where id = invitation_row.id;
  perform private.write_audit_event(invitation_row.organization_id, 'invitation.accepted', 'invitation', invitation_row.id::text);
  return invitation_row.organization_id;
end;
$$;

create or replace function public.create_student_enrollment(
  target_organization_id uuid, target_student_user_id uuid, target_assignment_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare new_enrollment_id uuid;
begin
  if not private.has_organization_role(target_organization_id, array['school_admin']::public.organization_role[])
    and not private.is_platform_administrator(auth.uid()) then
    raise exception 'school administrator required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.organization_memberships m
    where m.organization_id = target_organization_id and m.user_id = target_student_user_id
      and m.role = 'student' and m.status = 'active') then
    raise exception 'active tenant student membership required' using errcode = '23503';
  end if;
  insert into public.enrollments (organization_id, student_user_id, assignment_id, course_version_id, enrolled_by)
  select a.organization_id, target_student_user_id, a.id, a.course_version_id, auth.uid()
  from public.course_assignments a where a.organization_id = target_organization_id
    and a.id = target_assignment_id and a.active
  on conflict (organization_id, student_user_id, assignment_id) do update
    set updated_at = public.enrollments.updated_at
  returning id into new_enrollment_id;
  if new_enrollment_id is null then raise exception 'active tenant assignment required' using errcode = '23503'; end if;
  if not exists (select 1 from public.enrollment_events e where e.organization_id = target_organization_id
    and e.enrollment_id = new_enrollment_id) then
    insert into public.enrollment_events (organization_id, enrollment_id, actor_user_id, to_status)
    values (target_organization_id, new_enrollment_id, auth.uid(), 'active');
    perform private.write_audit_event(target_organization_id, 'enrollment.created', 'enrollment', new_enrollment_id::text,
      jsonb_build_object('assignment_id', target_assignment_id, 'student_user_id', target_student_user_id));
  end if;
  return new_enrollment_id;
end;
$$;

alter table public.courses enable row level security;
alter table public.course_versions enable row level security;
alter table public.course_assignments enable row level security;
alter table public.invitations enable row level security;
alter table public.enrollments enable row level security;
alter table public.enrollment_events enable row level security;
alter table public.courses force row level security;
alter table public.course_versions force row level security;
alter table public.course_assignments force row level security;
alter table public.invitations force row level security;
alter table public.enrollments force row level security;
alter table public.enrollment_events force row level security;

create policy courses_select_authenticated on public.courses for select to authenticated using (
  private.is_platform_administrator() or exists (
    select 1 from public.organization_memberships m join public.organizations o on o.id = m.organization_id
    where m.user_id = auth.uid() and m.status = 'active' and o.status = 'active'
  )
);
create policy course_versions_select_published on public.course_versions for select to authenticated
using (private.is_platform_administrator() or (
  status in ('published', 'retired') and exists (
    select 1 from public.organization_memberships m join public.organizations o on o.id = m.organization_id
    where m.user_id = auth.uid() and m.status = 'active' and o.status = 'active'
  )
));
create policy assignments_select_tenant on public.course_assignments for select to authenticated using (
  private.is_platform_administrator() or private.has_organization_role(organization_id, array['school_admin']::public.organization_role[])
  or exists (select 1 from public.enrollments e where e.organization_id = course_assignments.organization_id
    and e.assignment_id = course_assignments.id and e.student_user_id = auth.uid() and e.status = 'active')
);
create policy invitations_select_administrators on public.invitations for select to authenticated using (
  private.is_platform_administrator() or private.has_organization_role(organization_id, array['school_admin']::public.organization_role[])
);
create policy enrollments_select_tenant on public.enrollments for select to authenticated using (
  private.is_platform_administrator() or private.has_organization_role(organization_id, array['school_admin']::public.organization_role[])
  or (student_user_id = auth.uid() and private.has_organization_role(organization_id, array['student']::public.organization_role[]))
);
create policy enrollment_events_select_tenant on public.enrollment_events for select to authenticated using (
  private.is_platform_administrator() or private.has_organization_role(organization_id, array['school_admin']::public.organization_role[])
  or exists (select 1 from public.enrollments e where e.organization_id = enrollment_events.organization_id
    and e.id = enrollment_events.enrollment_id and e.student_user_id = auth.uid() and e.status = 'active')
);

revoke all on public.courses, public.course_versions, public.course_assignments, public.invitations,
  public.enrollments, public.enrollment_events from public, anon, authenticated;
grant select on public.courses, public.course_versions, public.course_assignments,
  public.enrollments, public.enrollment_events to authenticated;
grant select (id, organization_id, email, allowed_role, assignment_id, status, expires_at,
  created_by, created_at, accepted_by, accepted_at, revoked_by, revoked_at)
  on public.invitations to authenticated;
revoke all on function public.create_organization(text, text, text),
  public.update_organization_settings(uuid, text, text, text, text),
  public.create_student_invitation(uuid, text, text, timestamptz, uuid),
  public.revoke_invitation(uuid), public.accept_student_invitation(text),
  public.create_student_enrollment(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_organization(text, text, text),
  public.update_organization_settings(uuid, text, text, text, text),
  public.create_student_invitation(uuid, text, text, timestamptz, uuid),
  public.revoke_invitation(uuid), public.accept_student_invitation(text),
  public.create_student_enrollment(uuid, uuid, uuid) to authenticated;

comment on table public.invitations is 'Single-use invitations. Only SHA-256 token hashes are stored; raw tokens stay in the local delivery boundary.';
comment on table public.course_versions is 'Published instructional manifests are immutable except for explicit retirement metadata. Demo status is not curriculum approval.';
comment on table public.enrollments is 'Tenant-bound enrollments pinned to the exact course version selected by their assignment.';

commit;

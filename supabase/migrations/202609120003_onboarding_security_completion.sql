begin;

alter table public.invitations drop constraint invitations_allowed_role_check;
alter table public.invitations add constraint invitations_role_assignment_check check (
  (allowed_role = 'student')
  or (allowed_role = 'school_admin' and assignment_id is null)
);

create table private.invitation_redemption_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  attempt_count integer not null check (attempt_count > 0),
  last_attempt_at timestamptz not null,
  last_succeeded_at timestamptz
);
revoke all on private.invitation_redemption_limits from public, anon, authenticated;

create or replace function private.can_manage_organization(
  check_organization_id uuid,
  check_user_id uuid
) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organizations o
    where o.id = check_organization_id and o.status = 'active'
      and (
        private.is_platform_administrator(check_user_id)
        or private.has_organization_role(
          check_organization_id,
          array['school_admin']::public.organization_role[],
          check_user_id
        )
      )
  );
$$;

create or replace function public.create_school_admin_invitation(
  target_organization_id uuid,
  invitation_email text,
  invitation_token_hash text,
  invitation_expires_at timestamptz
) returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if not private.is_platform_administrator(auth.uid()) then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  if not private.can_manage_organization(target_organization_id, auth.uid()) then
    raise exception 'active organization required' using errcode = '42501';
  end if;
  if invitation_expires_at <= statement_timestamp()
    or invitation_expires_at > statement_timestamp() + interval '30 days' then
    raise exception 'invitation expiry must be in the next 30 days' using errcode = '22023';
  end if;
  insert into public.invitations (
    organization_id, email, allowed_role, token_hash, expires_at, created_by
  ) values (
    target_organization_id, lower(btrim(invitation_email)), 'school_admin',
    invitation_token_hash, invitation_expires_at, auth.uid()
  ) returning id into new_id;
  perform private.write_audit_event(
    target_organization_id, 'school_administrator_invitation.created',
    'invitation', new_id::text
  );
  return new_id;
end;
$$;

create or replace function public.accept_student_invitation(invitation_token_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  invitation_row public.invitations%rowtype;
  authenticated_email text;
  new_enrollment_id uuid;
  current_attempt_count integer;
begin
  if auth.uid() is null then return null; end if;

  insert into private.invitation_redemption_limits (
    user_id, window_started_at, attempt_count, last_attempt_at
  ) values (auth.uid(), statement_timestamp(), 1, statement_timestamp())
  on conflict (user_id) do update set
    window_started_at = case
      when private.invitation_redemption_limits.window_started_at <= statement_timestamp() - interval '15 minutes'
        then statement_timestamp()
      else private.invitation_redemption_limits.window_started_at
    end,
    attempt_count = case
      when private.invitation_redemption_limits.window_started_at <= statement_timestamp() - interval '15 minutes'
        then 1
      else private.invitation_redemption_limits.attempt_count + 1
    end,
    last_attempt_at = statement_timestamp()
  returning attempt_count into current_attempt_count;

  if current_attempt_count > 10 then return null; end if;

  select lower(email) into authenticated_email
  from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if authenticated_email is null then return null; end if;

  select * into invitation_row
  from public.invitations where token_hash = invitation_token_hash for update;
  if not found or invitation_row.status <> 'pending'
    or invitation_row.expires_at <= statement_timestamp()
    or authenticated_email <> invitation_row.email
    or not private.can_manage_organization(
      invitation_row.organization_id, invitation_row.created_by
    ) then return null;
  end if;

  if exists (
    select 1 from public.organization_memberships m
    where m.organization_id = invitation_row.organization_id
      and m.user_id = auth.uid() and m.status in ('suspended', 'removed')
  ) then return null; end if;

  if exists (
    select 1 from public.organization_memberships m
    where m.organization_id = invitation_row.organization_id
      and m.user_id = auth.uid()
      and (m.status <> 'invited' or m.role <> invitation_row.allowed_role)
  ) then return null; end if;
  if invitation_row.assignment_id is not null and (
    invitation_row.allowed_role <> 'student'
    or not exists (
      select 1 from public.course_assignments a
      where a.organization_id = invitation_row.organization_id
        and a.id = invitation_row.assignment_id and a.active
    )
    or exists (
      select 1 from public.enrollments e
      where e.organization_id = invitation_row.organization_id
        and e.student_user_id = auth.uid()
        and e.assignment_id = invitation_row.assignment_id
    )
  ) then return null; end if;

  begin
  insert into public.organization_memberships (
    organization_id, user_id, role, status, granted_by
  ) values (
    invitation_row.organization_id, auth.uid(), invitation_row.allowed_role,
    'active', invitation_row.created_by
  ) on conflict (organization_id, user_id) do update set
    status = 'active', updated_at = statement_timestamp()
  where public.organization_memberships.status = 'invited'
    and public.organization_memberships.role = excluded.role;
  if not found then raise exception 'membership mutation rejected'; end if;

  if invitation_row.assignment_id is not null then
    insert into public.enrollments (
      organization_id, student_user_id, assignment_id,
      course_version_id, enrolled_by
    ) select a.organization_id, auth.uid(), a.id, a.course_version_id,
      invitation_row.created_by
    from public.course_assignments a
    where a.organization_id = invitation_row.organization_id
      and a.id = invitation_row.assignment_id and a.active
    on conflict (organization_id, student_user_id, assignment_id) do nothing
    returning id into new_enrollment_id;
    if new_enrollment_id is null then raise exception 'enrollment mutation rejected'; end if;
    insert into public.enrollment_events (
      organization_id, enrollment_id, actor_user_id, to_status
    ) values (
      invitation_row.organization_id, new_enrollment_id, auth.uid(), 'active'
    );
  end if;

  update public.invitations set
    status = 'accepted', accepted_by = auth.uid(), accepted_at = statement_timestamp()
  where id = invitation_row.id;
  update private.invitation_redemption_limits
  set last_succeeded_at = statement_timestamp() where user_id = auth.uid();
  perform private.write_audit_event(
    invitation_row.organization_id, 'invitation.accepted',
    'invitation', invitation_row.id::text,
    jsonb_build_object('role', invitation_row.allowed_role)
  );
  exception when others then
    return null;
  end;
  return invitation_row.organization_id;
end;
$$;

revoke all on function private.can_manage_organization(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.create_school_admin_invitation(
  uuid, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.create_school_admin_invitation(
  uuid, text, text, timestamptz
) to authenticated;

comment on table private.invitation_redemption_limits is
  'Database-level per-user invitation guessing throttle. Edge/IP rate limiting remains an operational control.';
comment on function public.create_school_admin_invitation(uuid, text, text, timestamptz) is
  'Platform-admin-only path for assigning the first or later school administrator; never grants platform authority.';

commit;

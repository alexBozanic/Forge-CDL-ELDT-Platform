begin;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$ begin
  create type public.organization_status as enum ('active', 'suspended', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.organization_role as enum ('school_admin', 'student');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.membership_status as enum ('invited', 'active', 'suspended', 'removed');
exception when duplicate_object then null;
end $$;

create table public.organizations (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 1 and 160),
  contact_email text check (contact_email is null or length(contact_email) <= 320),
  brand_primary_color text not null default '#102a43' check (brand_primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  brand_accent_color text not null default '#1463ff' check (brand_accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  provider_identifier text,
  status public.organization_status not null default 'active',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

create table public.platform_administrators (
  user_id uuid primary key references auth.users(id) on delete restrict,
  granted_by uuid references auth.users(id) on delete restrict,
  granted_at timestamptz not null default statement_timestamp()
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role public.organization_role not null,
  status public.membership_status not null default 'active',
  granted_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (organization_id, user_id)
);

create index organization_memberships_user_active_idx
  on public.organization_memberships (user_id, organization_id)
  where status = 'active';

create table public.student_profiles (
  organization_id uuid not null,
  user_id uuid not null,
  legal_first_name text not null check (length(btrim(legal_first_name)) between 1 and 100),
  legal_middle_name text check (legal_middle_name is null or length(legal_middle_name) <= 100),
  legal_last_name text not null check (length(btrim(legal_last_name)) between 1 and 100),
  date_of_birth date,
  license_or_permit_number text check (license_or_permit_number is null or length(license_or_permit_number) <= 64),
  issuing_jurisdiction text check (issuing_jurisdiction is null or issuing_jurisdiction ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (organization_id, user_id),
  foreign key (organization_id, user_id)
    references public.organization_memberships (organization_id, user_id) on delete restrict
);

create index student_profiles_user_idx on public.student_profiles (user_id, organization_id);

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (length(btrim(action)) between 1 and 100),
  target_type text not null check (length(btrim(target_type)) between 1 and 80),
  target_id text not null check (length(btrim(target_id)) between 1 and 200),
  request_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default statement_timestamp()
);

create index audit_events_organization_time_idx
  on public.audit_events (organization_id, occurred_at desc);
create index audit_events_target_idx
  on public.audit_events (target_type, target_id, occurred_at desc);

create or replace function private.is_platform_administrator(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select check_user_id is not null and exists (
    select 1 from public.platform_administrators pa where pa.user_id = check_user_id
  );
$$;

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
    where m.organization_id = check_organization_id
      and m.user_id = check_user_id
      and m.status = 'active'
      and m.role = any(allowed_roles)
  );
$$;

create or replace function private.write_audit_event(
  event_organization_id uuid,
  event_action text,
  event_target_type text,
  event_target_id text,
  event_metadata jsonb default '{}'::jsonb,
  event_request_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id bigint;
begin
  if not private.is_platform_administrator(auth.uid())
     and not private.has_organization_role(
       event_organization_id,
       array['school_admin', 'student']::public.organization_role[],
       auth.uid()
     ) then
    raise exception 'not authorized to write this audit event' using errcode = '42501';
  end if;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, request_id, metadata
  ) values (
    event_organization_id, auth.uid(), event_action, event_target_type,
    event_target_id, event_request_id, coalesce(event_metadata, '{}'::jsonb)
  ) returning id into new_id;
  return new_id;
end;
$$;

create or replace function private.prevent_tenant_key_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id <> old.organization_id or new.user_id <> old.user_id then
    raise exception 'tenant ownership keys cannot be changed' using errcode = '23514';
  end if;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create or replace function private.require_student_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = new.organization_id
      and m.user_id = new.user_id
      and m.role = 'student'
      and m.status in ('invited', 'active')
  ) then
    raise exception 'student profile requires a tenant-matched student membership'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger student_profiles_prevent_tenant_key_change
before update on public.student_profiles
for each row execute function private.prevent_tenant_key_change();

create trigger student_profiles_require_student_membership
before insert or update on public.student_profiles
for each row execute function private.require_student_membership();

alter table public.organizations enable row level security;
alter table public.platform_administrators enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.student_profiles enable row level security;
alter table public.audit_events enable row level security;

create policy organizations_select_authorized
on public.organizations for select to authenticated
using (
  private.is_platform_administrator()
  or private.has_organization_role(id, array['school_admin', 'student']::public.organization_role[])
);

create policy platform_administrators_select_self
on public.platform_administrators for select to authenticated
using (user_id = auth.uid() or private.is_platform_administrator());

create policy memberships_select_authorized
on public.organization_memberships for select to authenticated
using (
  private.is_platform_administrator()
  or private.has_organization_role(organization_id, array['school_admin']::public.organization_role[])
  or user_id = auth.uid()
);

create policy student_profiles_select_authorized
on public.student_profiles for select to authenticated
using (
  private.is_platform_administrator()
  or private.has_organization_role(organization_id, array['school_admin']::public.organization_role[])
  or user_id = auth.uid()
);

create policy student_profiles_update_self
on public.student_profiles for update to authenticated
using (
  user_id = auth.uid()
  and private.has_organization_role(organization_id, array['student']::public.organization_role[])
)
with check (
  user_id = auth.uid()
  and private.has_organization_role(organization_id, array['student']::public.organization_role[])
);

create policy audit_events_select_administrators
on public.audit_events for select to authenticated
using (
  private.is_platform_administrator()
  or private.has_organization_role(organization_id, array['school_admin']::public.organization_role[])
);

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant usage on schema private to authenticated;
grant select on public.organizations, public.platform_administrators,
  public.organization_memberships, public.student_profiles, public.audit_events to authenticated;
grant update (
  legal_first_name, legal_middle_name, legal_last_name, date_of_birth,
  license_or_permit_number, issuing_jurisdiction, updated_at
) on public.student_profiles to authenticated;
grant execute on function private.is_platform_administrator(uuid) to authenticated;
grant execute on function private.has_organization_role(uuid, public.organization_role[], uuid) to authenticated;

alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges in schema private revoke all on functions from public, anon, authenticated;

comment on table public.student_profiles is
  'Current tenant student identity. Future completions copy immutable reporting snapshots; profile edits never rewrite history.';
comment on table public.audit_events is
  'Append-only for application roles. Database owners and service-role operators retain privileged capability.';
comment on schema private is
  'Not exposed through the data API. Holds authorization helpers and future answer keys.';

commit;

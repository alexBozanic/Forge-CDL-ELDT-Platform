begin;

alter table public.organizations add column is_demo boolean not null default false;
alter table public.course_versions
  add column title text,
  add column description text not null default '',
  add column manifest jsonb,
  add column created_by uuid references auth.users(id) on delete restrict,
  add column retirement_reason text;
update public.course_versions v set title = c.title, description = c.description
from public.courses c where c.id = v.course_id;
alter table public.course_versions alter column title set not null;
alter table public.course_versions add check (length(btrim(title)) between 1 and 160);
alter table public.course_versions add check (jsonb_typeof(manifest) = 'object' or manifest is null);
alter table public.course_versions add check (
  (status = 'retired') = (retirement_reason is not null and length(btrim(retirement_reason)) > 0)
);
alter table public.course_assignments
  add column withdrawn_at timestamptz,
  add column withdrawal_reason text,
  add check ((active = false) = (
    withdrawn_at is not null and withdrawal_reason is not null
    and length(btrim(withdrawal_reason)) > 0
  ));

create or replace function private.require_published_assignment()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.course_versions v
    where v.id = new.course_version_id and v.status = 'published'
  ) then
    raise exception 'assignment requires a published course version' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.course_versions v join public.courses c on c.id = v.course_id
    where v.id = new.course_version_id and c.is_demo
  ) and not exists (
    select 1 from public.organizations o where o.id = new.organization_id and o.is_demo
  ) then
    raise exception 'demo content may only be assigned to demo schools' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.prevent_demo_school_conversion()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.is_demo and not new.is_demo and exists (
    select 1 from public.course_assignments a
    join public.course_versions v on v.id = a.course_version_id
    join public.courses c on c.id = v.course_id
    where a.organization_id = old.id and c.is_demo
  ) then raise exception 'remove demo assignments before changing demo classification' using errcode = '55000'; end if;
  return new;
end;
$$;
create trigger organizations_protect_demo_classification
before update of is_demo on public.organizations
for each row execute function private.prevent_demo_school_conversion();

create or replace function private.prevent_course_reclassification()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.is_demo <> old.is_demo and exists (
    select 1 from public.course_versions v where v.course_id = old.id
  ) then raise exception 'course demo classification is immutable after versioning' using errcode = '55000'; end if;
  return new;
end;
$$;
create trigger courses_protect_demo_classification
before update of is_demo on public.courses
for each row execute function private.prevent_course_reclassification();

create or replace function private.require_current_enrollment_assignment()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.course_assignments a
    join public.course_versions v on v.id = a.course_version_id
    where a.organization_id = new.organization_id and a.id = new.assignment_id
      and a.course_version_id = new.course_version_id and a.active
      and v.status = 'published'
  ) then raise exception 'new enrollment requires an active assignment to a published version'
    using errcode = '23514'; end if;
  return new;
end;
$$;
create trigger enrollments_require_current_assignment
before insert on public.enrollments
for each row execute function private.require_current_enrollment_assignment();

do $$ begin
  create type public.curriculum_review_decision as enum ('approved', 'changes_requested');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.lesson_progress_status as enum ('not_started', 'in_progress', 'completed');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.lesson_interaction_type as enum ('opened', 'position_saved', 'completed');
exception when duplicate_object then null;
end $$;

create table public.course_modules (
  id uuid primary key default extensions.gen_random_uuid(),
  course_version_id uuid not null references public.course_versions(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 160),
  position integer not null check (position > 0),
  created_at timestamptz not null default statement_timestamp(),
  unique (course_version_id, id),
  unique (course_version_id, position)
);

create table public.course_lessons (
  id uuid primary key default extensions.gen_random_uuid(),
  course_version_id uuid not null references public.course_versions(id) on delete restrict,
  module_id uuid not null,
  title text not null check (length(btrim(title)) between 1 and 160),
  body_markdown text not null check (length(btrim(body_markdown)) between 1 and 50000),
  position integer not null check (position > 0),
  estimated_minutes integer not null check (estimated_minutes between 1 and 240),
  created_at timestamptz not null default statement_timestamp(),
  foreign key (course_version_id, module_id)
    references public.course_modules (course_version_id, id) on delete restrict,
  unique (course_version_id, id),
  unique (course_version_id, module_id, position)
);

create table public.course_version_manifest_lessons (
  course_version_id uuid not null references public.course_versions(id) on delete restrict,
  manifest_position integer not null check (manifest_position > 0),
  module_id uuid not null,
  lesson_id uuid not null,
  module_position integer not null,
  lesson_position integer not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  primary key (course_version_id, lesson_id),
  unique (course_version_id, manifest_position),
  foreign key (course_version_id, module_id)
    references public.course_modules (course_version_id, id) on delete restrict,
  foreign key (course_version_id, lesson_id)
    references public.course_lessons (course_version_id, id) on delete restrict
);

create table public.curriculum_reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  course_version_id uuid not null references public.course_versions(id) on delete restrict,
  manifest_hash text not null check (manifest_hash ~ '^[0-9a-f]{64}$'),
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  decision public.curriculum_review_decision not null,
  notes text not null check (length(btrim(notes)) between 1 and 4000),
  reviewed_at timestamptz not null default statement_timestamp(),
  unique (course_version_id, manifest_hash, reviewer_user_id)
);

alter table public.enrollments add unique (
  organization_id, id, student_user_id, course_version_id
);

create table public.lesson_progress (
  organization_id uuid not null,
  enrollment_id uuid not null,
  student_user_id uuid not null,
  course_version_id uuid not null,
  lesson_id uuid not null,
  status public.lesson_progress_status not null default 'not_started',
  resume_position integer not null default 0 check (resume_position >= 0),
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default statement_timestamp(),
  primary key (organization_id, enrollment_id, lesson_id),
  unique (organization_id, enrollment_id, lesson_id, student_user_id, course_version_id),
  foreign key (organization_id, enrollment_id, student_user_id, course_version_id)
    references public.enrollments (organization_id, id, student_user_id, course_version_id) on delete restrict,
  foreign key (course_version_id, lesson_id)
    references public.course_version_manifest_lessons (course_version_id, lesson_id) on delete restrict,
  check ((status = 'completed') = (completed_at is not null))
);

create table public.lesson_interaction_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  enrollment_id uuid not null,
  student_user_id uuid not null,
  course_version_id uuid not null,
  lesson_id uuid not null,
  interaction_type public.lesson_interaction_type not null,
  resume_position integer not null check (resume_position >= 0),
  idempotency_key uuid not null,
  metadata jsonb not null default '{"interaction_only":true}'::jsonb
    check (metadata = '{"interaction_only":true}'::jsonb),
  occurred_at timestamptz not null default statement_timestamp(),
  foreign key (organization_id, enrollment_id, lesson_id, student_user_id, course_version_id)
    references public.lesson_progress (
      organization_id, enrollment_id, lesson_id, student_user_id, course_version_id
    ) on delete restrict,
  unique (organization_id, enrollment_id, idempotency_key)
);

create or replace function private.compute_course_manifest(target_version_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'version_id', v.id,
    'title', v.title,
    'description', v.description,
    'modules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'title', m.title, 'position', m.position,
        'lessons', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', l.id, 'title', l.title, 'position', l.position,
            'estimated_minutes', l.estimated_minutes,
            'body_markdown', l.body_markdown
          ) order by l.position, l.id)
          from public.course_lessons l where l.module_id = m.id
        ), '[]'::jsonb)
      ) order by m.position, m.id)
      from public.course_modules m where m.course_version_id = v.id
    ), '[]'::jsonb)
  ) from public.course_versions v where v.id = target_version_id;
$$;

create or replace function private.refresh_draft_manifest(target_version_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare computed_manifest jsonb;
begin
  select private.compute_course_manifest(target_version_id) into computed_manifest;
  update public.course_versions set manifest = computed_manifest,
    manifest_hash = encode(extensions.digest(computed_manifest::text, 'sha256'), 'hex')
  where id = target_version_id and status = 'draft';
  if not found then raise exception 'draft course version required' using errcode = '55000'; end if;
end;
$$;

create or replace function private.require_draft_content()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (tg_op in ('UPDATE', 'DELETE') and not exists (
    select 1 from public.course_versions v
    where v.id = old.course_version_id and v.status = 'draft'
  )) or (tg_op in ('UPDATE', 'INSERT') and not exists (
    select 1 from public.course_versions v
    where v.id = new.course_version_id and v.status = 'draft'
  )) then
    raise exception 'published course content is immutable' using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create or replace function private.refresh_changed_draft_manifest()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform private.refresh_draft_manifest(old.course_version_id);
  end if;
  if tg_op in ('UPDATE', 'INSERT') and (
    tg_op <> 'UPDATE' or new.course_version_id <> old.course_version_id
  ) then perform private.refresh_draft_manifest(new.course_version_id); end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create trigger course_modules_require_draft before insert or update or delete on public.course_modules
for each row execute function private.require_draft_content();
create trigger course_modules_refresh_manifest after insert or update or delete on public.course_modules
for each row execute function private.refresh_changed_draft_manifest();
create trigger course_lessons_require_draft before insert or update or delete on public.course_lessons
for each row execute function private.require_draft_content();
create trigger course_lessons_refresh_manifest after insert or update or delete on public.course_lessons
for each row execute function private.refresh_changed_draft_manifest();
create trigger manifest_lessons_require_draft before insert or update or delete on public.course_version_manifest_lessons
for each row execute function private.require_draft_content();

create or replace function private.prevent_course_version_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status in ('published', 'retired') and (
    new.course_id <> old.course_id or new.version_number <> old.version_number
    or new.manifest_hash <> old.manifest_hash or new.published_at <> old.published_at
    or new.title <> old.title or new.description <> old.description
    or new.manifest is distinct from old.manifest or new.created_by is distinct from old.created_by
  ) then raise exception 'published course versions are immutable' using errcode = '55000'; end if;
  if old.status = 'retired' and new is distinct from old then
    raise exception 'retired course versions are immutable' using errcode = '55000';
  end if;
  if old.status = 'published' and new.status not in ('published', 'retired') then
    raise exception 'published course versions may only be retired' using errcode = '55000';
  end if;
  return new;
end;
$$;

create or replace function private.prevent_published_version_delete()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status <> 'draft' then
    raise exception 'published course versions cannot be deleted' using errcode = '55000';
  end if;
  return old;
end;
$$;
create trigger course_versions_prevent_published_delete before delete on public.course_versions
for each row execute function private.prevent_published_version_delete();

create or replace function private.prevent_review_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'curriculum reviews are immutable' using errcode = '55000'; end;
$$;
create trigger curriculum_reviews_immutable before update or delete on public.curriculum_reviews
for each row execute function private.prevent_review_mutation();

create or replace function private.prevent_historical_event_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'historical events are append-only' using errcode = '55000'; end;
$$;
create trigger enrollment_events_immutable before update or delete on public.enrollment_events
for each row execute function private.prevent_historical_event_mutation();
create trigger lesson_interaction_events_immutable before update or delete on public.lesson_interaction_events
for each row execute function private.prevent_historical_event_mutation();

create or replace function public.create_course(
  course_title text, course_description text, demo_content boolean
) returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if not private.is_platform_administrator(auth.uid()) then
    raise exception 'platform administrator required' using errcode = '42501'; end if;
  insert into public.courses (title, description, is_demo)
  values (course_title, course_description, demo_content) returning id into new_id;
  perform private.write_audit_event(null, 'course.created', 'course', new_id::text,
    jsonb_build_object('is_demo', demo_content));
  return new_id;
end;
$$;

create or replace function public.create_course_version(target_course_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid; next_version integer; source_course public.courses%rowtype;
begin
  if not private.is_platform_administrator(auth.uid()) then
    raise exception 'platform administrator required' using errcode = '42501'; end if;
  select * into source_course from public.courses where id = target_course_id;
  if not found then raise exception 'course not found' using errcode = 'P0002'; end if;
  select coalesce(max(version_number), 0) + 1 into next_version
  from public.course_versions where course_id = target_course_id;
  insert into public.course_versions (
    course_id, version_number, title, description, manifest_hash, created_by
  ) values (
    target_course_id, next_version, source_course.title, source_course.description,
    repeat('0', 64), auth.uid()
  ) returning id into new_id;
  perform private.refresh_draft_manifest(new_id);
  perform private.write_audit_event(null, 'course_version.created', 'course_version', new_id::text,
    jsonb_build_object('course_id', target_course_id, 'version_number', next_version));
  return new_id;
end;
$$;

create or replace function public.update_course_version_draft(
  target_version_id uuid, version_title text, version_description text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_administrator(auth.uid()) then
    raise exception 'platform administrator required' using errcode = '42501'; end if;
  update public.course_versions set title = version_title, description = version_description
  where id = target_version_id and status = 'draft';
  if not found then raise exception 'draft version required' using errcode = '55000'; end if;
  perform private.refresh_draft_manifest(target_version_id);
end;
$$;

create or replace function public.add_course_module(
  target_version_id uuid, module_title text, module_position integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if not private.is_platform_administrator(auth.uid()) then
    raise exception 'platform administrator required' using errcode = '42501'; end if;
  insert into public.course_modules (course_version_id, title, position)
  values (target_version_id, module_title, module_position) returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.add_course_lesson(
  target_version_id uuid, target_module_id uuid, lesson_title text,
  lesson_body_markdown text, lesson_position integer, lesson_estimated_minutes integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if not private.is_platform_administrator(auth.uid()) then
    raise exception 'platform administrator required' using errcode = '42501'; end if;
  insert into public.course_lessons (
    course_version_id, module_id, title, body_markdown, position, estimated_minutes
  ) values (
    target_version_id, target_module_id, lesson_title, lesson_body_markdown,
    lesson_position, lesson_estimated_minutes
  ) returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.update_course_module(
  target_module_id uuid, module_title text, module_position integer
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_administrator(auth.uid()) then
    raise exception 'platform administrator required' using errcode = '42501'; end if;
  update public.course_modules set title = module_title, position = module_position
  where id = target_module_id;
  if not found then raise exception 'module not found' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.update_course_lesson(
  target_lesson_id uuid, lesson_title text, lesson_body_markdown text,
  lesson_position integer, lesson_estimated_minutes integer
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_administrator(auth.uid()) then
    raise exception 'platform administrator required' using errcode = '42501'; end if;
  update public.course_lessons set title = lesson_title, body_markdown = lesson_body_markdown,
    position = lesson_position, estimated_minutes = lesson_estimated_minutes
  where id = target_lesson_id;
  if not found then raise exception 'lesson not found' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.review_course_version(
  target_version_id uuid, review_decision public.curriculum_review_decision,
  review_notes text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid; current_hash text;
begin
  if not private.is_platform_administrator(auth.uid()) then
    raise exception 'platform administrator required' using errcode = '42501'; end if;
  select manifest_hash into current_hash from public.course_versions
  where id = target_version_id and status = 'draft';
  if current_hash is null then raise exception 'draft version required' using errcode = '55000'; end if;
  insert into public.curriculum_reviews (
    course_version_id, manifest_hash, reviewer_user_id, decision, notes
  ) values (target_version_id, current_hash, auth.uid(), review_decision, review_notes)
  returning id into new_id;
  perform private.write_audit_event(null, 'course_version.reviewed', 'curriculum_review', new_id::text,
    jsonb_build_object('course_version_id', target_version_id, 'manifest_hash', current_hash,
      'decision', review_decision));
  return new_id;
end;
$$;

create or replace function public.publish_course_version(target_version_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare current_hash text; lesson_count integer;
begin
  if not private.is_platform_administrator(auth.uid()) then
    raise exception 'platform administrator required' using errcode = '42501'; end if;
  perform private.refresh_draft_manifest(target_version_id);
  select manifest_hash into current_hash from public.course_versions
  where id = target_version_id and status = 'draft' for update;
  select count(*) into lesson_count from public.course_lessons where course_version_id = target_version_id;
  if lesson_count = 0 then raise exception 'at least one lesson required' using errcode = '55000'; end if;
  if exists (select 1 from public.course_versions v join public.courses c on c.id = v.course_id
    where v.id = target_version_id and c.is_demo)
    and not exists (select 1 from public.organizations o where o.is_demo and o.status = 'active') then
    raise exception 'demo publication requires an active explicit demo school' using errcode = '55000';
  end if;
  if not exists (select 1 from public.curriculum_reviews r
    where r.course_version_id = target_version_id and r.manifest_hash = current_hash
      and r.decision = 'approved') then
    raise exception 'current manifest approval required' using errcode = '55000'; end if;
  insert into public.course_version_manifest_lessons (
    course_version_id, manifest_position, module_id, lesson_id,
    module_position, lesson_position, content_hash
  ) select target_version_id, row_number() over (order by m.position, l.position, l.id),
    m.id, l.id, m.position, l.position,
    encode(extensions.digest(jsonb_build_object(
      'module_title', m.title, 'lesson_title', l.title, 'body_markdown', l.body_markdown,
      'estimated_minutes', l.estimated_minutes
    )::text, 'sha256'), 'hex')
  from public.course_modules m join public.course_lessons l on l.module_id = m.id
  where m.course_version_id = target_version_id order by m.position, l.position, l.id;
  update public.course_versions set status = 'published', published_at = statement_timestamp()
  where id = target_version_id;
  perform private.write_audit_event(null, 'course_version.published', 'course_version', target_version_id::text,
    jsonb_build_object('manifest_hash', current_hash));
  return current_hash;
end;
$$;

create or replace function public.create_course_assignment(
  target_organization_id uuid, target_course_version_id uuid, assignment_title text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if not private.has_organization_role(target_organization_id, array['school_admin']::public.organization_role[])
    and not private.is_platform_administrator(auth.uid()) then
    raise exception 'school administrator required' using errcode = '42501'; end if;
  if exists (select 1 from public.courses c join public.course_versions v on v.course_id = c.id
    where v.id = target_course_version_id and c.is_demo)
    and not exists (select 1 from public.organizations o where o.id = target_organization_id and o.is_demo) then
    raise exception 'demo content may only be assigned to demo schools' using errcode = '42501'; end if;
  insert into public.course_assignments (
    organization_id, course_version_id, title, created_by
  ) values (target_organization_id, target_course_version_id, assignment_title, auth.uid())
  returning id into new_id;
  perform private.write_audit_event(target_organization_id, 'course_assignment.created', 'course_assignment', new_id::text,
    jsonb_build_object('course_version_id', target_course_version_id));
  return new_id;
end;
$$;

create or replace function public.retire_course_version(
  target_version_id uuid, reason text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_administrator(auth.uid()) then
    raise exception 'platform administrator required' using errcode = '42501'; end if;
  update public.course_versions set status = 'retired', retired_at = statement_timestamp(),
    retirement_reason = reason where id = target_version_id and status = 'published';
  if not found then raise exception 'published version required' using errcode = '55000'; end if;
  perform private.write_audit_event(null, 'course_version.retired', 'course_version', target_version_id::text,
    jsonb_build_object('reason', reason));
end;
$$;

create or replace function public.withdraw_course_assignment(
  target_assignment_id uuid, reason text
) returns void language plpgsql security definer set search_path = '' as $$
declare target_organization_id uuid;
begin
  select organization_id into target_organization_id from public.course_assignments
  where id = target_assignment_id;
  if not private.has_organization_role(target_organization_id, array['school_admin']::public.organization_role[])
    and not private.is_platform_administrator(auth.uid()) then
    raise exception 'school administrator required' using errcode = '42501'; end if;
  update public.course_assignments set active = false, withdrawn_at = statement_timestamp(),
    withdrawal_reason = reason where id = target_assignment_id and active;
  if not found then raise exception 'active assignment required' using errcode = '55000'; end if;
  perform private.write_audit_event(target_organization_id, 'course_assignment.withdrawn',
    'course_assignment', target_assignment_id::text, jsonb_build_object('reason', reason));
end;
$$;

create or replace function public.record_lesson_interaction(
  target_enrollment_id uuid, target_lesson_id uuid,
  target_interaction_type public.lesson_interaction_type,
  target_resume_position integer, request_idempotency_key uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare enrollment_row public.enrollments%rowtype; existing_event boolean;
begin
  select * into enrollment_row from public.enrollments e
  where e.id = target_enrollment_id and e.student_user_id = auth.uid() and e.status = 'active'
    and private.has_organization_role(e.organization_id, array['student']::public.organization_role[])
  for update;
  if not found then raise exception 'active student enrollment required' using errcode = '42501'; end if;
  if not exists (select 1 from public.course_version_manifest_lessons ml
    where ml.course_version_id = enrollment_row.course_version_id and ml.lesson_id = target_lesson_id) then
    raise exception 'lesson is not in enrollment manifest' using errcode = '42501'; end if;
  select exists (select 1 from public.lesson_interaction_events ev
    where ev.organization_id = enrollment_row.organization_id and ev.enrollment_id = enrollment_row.id
      and ev.idempotency_key = request_idempotency_key) into existing_event;
  if existing_event then return; end if;
  insert into public.lesson_progress (
    organization_id, enrollment_id, student_user_id, course_version_id, lesson_id,
    status, resume_position, first_opened_at, last_opened_at, completed_at
  ) values (
    enrollment_row.organization_id, enrollment_row.id, auth.uid(), enrollment_row.course_version_id,
    target_lesson_id,
    case when target_interaction_type = 'completed' then 'completed'::public.lesson_progress_status
      else 'in_progress'::public.lesson_progress_status end,
    target_resume_position, statement_timestamp(), statement_timestamp(),
    case when target_interaction_type = 'completed' then statement_timestamp() else null end
  ) on conflict (organization_id, enrollment_id, lesson_id) do update set
    status = case when public.lesson_progress.status = 'completed' or target_interaction_type = 'completed'
      then 'completed'::public.lesson_progress_status else 'in_progress'::public.lesson_progress_status end,
    resume_position = greatest(public.lesson_progress.resume_position, target_resume_position),
    last_opened_at = case when target_interaction_type = 'opened' then statement_timestamp()
      else public.lesson_progress.last_opened_at end,
    completed_at = case when public.lesson_progress.completed_at is not null then public.lesson_progress.completed_at
      when target_interaction_type = 'completed' then statement_timestamp() else null end,
    updated_at = statement_timestamp();
  insert into public.lesson_interaction_events (
    organization_id, enrollment_id, student_user_id, course_version_id, lesson_id,
    interaction_type, resume_position, idempotency_key
  ) values (
    enrollment_row.organization_id, enrollment_row.id, auth.uid(), enrollment_row.course_version_id,
    target_lesson_id, target_interaction_type, target_resume_position, request_idempotency_key
  );
  if target_interaction_type = 'completed' then
    perform private.write_audit_event(enrollment_row.organization_id, 'lesson.interaction_completed',
      'lesson_progress', target_enrollment_id::text || ':' || target_lesson_id::text,
      jsonb_build_object('interaction_only', true));
  end if;
end;
$$;

alter table public.course_modules enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_version_manifest_lessons enable row level security;
alter table public.curriculum_reviews enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.lesson_interaction_events enable row level security;
alter table public.course_modules force row level security;
alter table public.course_lessons force row level security;
alter table public.course_version_manifest_lessons force row level security;
alter table public.curriculum_reviews force row level security;
alter table public.lesson_progress force row level security;
alter table public.lesson_interaction_events force row level security;

create policy modules_select_authorized on public.course_modules for select to authenticated using (
  private.is_platform_administrator() or exists (select 1 from public.enrollments e
    where e.course_version_id = course_modules.course_version_id and e.student_user_id = auth.uid()
      and e.status = 'active' and private.has_organization_role(e.organization_id, array['student']::public.organization_role[]))
  or exists (select 1 from public.course_assignments a where a.course_version_id = course_modules.course_version_id
    and private.has_organization_role(a.organization_id, array['school_admin']::public.organization_role[]))
);
create policy lessons_select_authorized on public.course_lessons for select to authenticated using (
  private.is_platform_administrator() or exists (select 1 from public.enrollments e
    join public.course_version_manifest_lessons ml on ml.course_version_id = e.course_version_id
      and ml.lesson_id = course_lessons.id
    where e.course_version_id = course_lessons.course_version_id and e.student_user_id = auth.uid()
      and e.status = 'active' and private.has_organization_role(e.organization_id, array['student']::public.organization_role[]))
  or exists (select 1 from public.course_assignments a where a.course_version_id = course_lessons.course_version_id
    and private.has_organization_role(a.organization_id, array['school_admin']::public.organization_role[]))
);
create policy manifest_select_authorized on public.course_version_manifest_lessons for select to authenticated using (
  private.is_platform_administrator() or exists (select 1 from public.enrollments e
    where e.course_version_id = course_version_manifest_lessons.course_version_id and e.student_user_id = auth.uid()
      and e.status = 'active' and private.has_organization_role(e.organization_id, array['student']::public.organization_role[]))
  or exists (select 1 from public.course_assignments a where a.course_version_id = course_version_manifest_lessons.course_version_id
    and private.has_organization_role(a.organization_id, array['school_admin']::public.organization_role[]))
);
create policy reviews_select_platform on public.curriculum_reviews for select to authenticated
using (private.is_platform_administrator());
create policy progress_select_authorized on public.lesson_progress for select to authenticated using (
  private.is_platform_administrator() or private.has_organization_role(organization_id, array['school_admin']::public.organization_role[])
  or (student_user_id = auth.uid() and private.has_organization_role(organization_id, array['student']::public.organization_role[]))
);
create policy interaction_events_select_authorized on public.lesson_interaction_events for select to authenticated using (
  private.is_platform_administrator() or private.has_organization_role(organization_id, array['school_admin']::public.organization_role[])
  or (student_user_id = auth.uid() and private.has_organization_role(organization_id, array['student']::public.organization_role[]))
);

revoke all on public.course_modules, public.course_lessons, public.course_version_manifest_lessons,
  public.curriculum_reviews, public.lesson_progress, public.lesson_interaction_events
  from public, anon, authenticated;
grant select on public.course_modules, public.course_lessons, public.course_version_manifest_lessons,
  public.curriculum_reviews, public.lesson_progress, public.lesson_interaction_events to authenticated;
revoke all on function public.create_course(text, text, boolean), public.create_course_version(uuid),
  public.update_course_version_draft(uuid, text, text), public.add_course_module(uuid, text, integer),
  public.add_course_lesson(uuid, uuid, text, text, integer, integer),
  public.update_course_module(uuid, text, integer),
  public.update_course_lesson(uuid, text, text, integer, integer),
  public.review_course_version(uuid, public.curriculum_review_decision, text),
  public.publish_course_version(uuid), public.create_course_assignment(uuid, uuid, text),
  public.retire_course_version(uuid, text), public.withdraw_course_assignment(uuid, text),
  public.record_lesson_interaction(uuid, uuid, public.lesson_interaction_type, integer, uuid)
  from public, anon, authenticated;
grant execute on function public.create_course(text, text, boolean), public.create_course_version(uuid),
  public.update_course_version_draft(uuid, text, text), public.add_course_module(uuid, text, integer),
  public.add_course_lesson(uuid, uuid, text, text, integer, integer),
  public.update_course_module(uuid, text, integer),
  public.update_course_lesson(uuid, text, text, integer, integer),
  public.review_course_version(uuid, public.curriculum_review_decision, text),
  public.publish_course_version(uuid), public.create_course_assignment(uuid, uuid, text),
  public.retire_course_version(uuid, text), public.withdraw_course_assignment(uuid, text),
  public.record_lesson_interaction(uuid, uuid, public.lesson_interaction_type, integer, uuid)
  to authenticated;

comment on table public.curriculum_reviews is
  'Content review bound to an exact draft manifest hash; not a regulatory approval or instructor certification.';
comment on table public.lesson_interaction_events is
  'Append-only interaction metadata. Open/completion clicks are not proof of attention or course completion.';

commit;

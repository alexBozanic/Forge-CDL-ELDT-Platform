begin;

do $$ begin create type public.assessment_kind as enum ('lesson_quiz', 'final_exam'); exception when duplicate_object then null; end $$;
do $$ begin create type public.assessment_attempt_status as enum ('in_progress', 'passed', 'failed', 'expired'); exception when duplicate_object then null; end $$;
do $$ begin create type public.reporting_status as enum ('needs_attention', 'ready', 'submitted', 'accepted', 'rejected'); exception when duplicate_object then null; end $$;

create table public.assessments (
  id uuid primary key default extensions.gen_random_uuid(),
  course_version_id uuid not null references public.course_versions(id) on delete restrict,
  lesson_id uuid,
  kind public.assessment_kind not null,
  title text not null check (length(btrim(title)) between 1 and 160),
  position integer not null check (position > 0),
  question_count integer not null check (question_count > 0),
  passing_percent integer not null check (passing_percent between 1 and 100),
  time_limit_minutes integer not null check (time_limit_minutes between 1 and 240),
  created_at timestamptz not null default statement_timestamp(),
  foreign key (course_version_id, lesson_id) references public.course_lessons(course_version_id, id) on delete restrict,
  unique (course_version_id, id), unique (course_version_id, kind, position),
  check ((kind = 'lesson_quiz' and lesson_id is not null) or (kind = 'final_exam' and lesson_id is null)),
  check (kind <> 'final_exam' or passing_percent >= 80)
);

create table public.assessment_blueprint_topics (
  course_version_id uuid not null,
  assessment_id uuid not null,
  topic_code text not null check (topic_code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  required_count integer not null check (required_count > 0),
  primary key (course_version_id, assessment_id, topic_code),
  foreign key (course_version_id, assessment_id) references public.assessments(course_version_id, id) on delete restrict
);

create table public.assessment_questions (
  id uuid primary key default extensions.gen_random_uuid(),
  course_version_id uuid not null,
  assessment_id uuid not null,
  topic_code text not null,
  prompt text not null check (length(btrim(prompt)) between 1 and 4000),
  rationale text check (rationale is null or length(rationale) <= 4000),
  created_at timestamptz not null default statement_timestamp(),
  foreign key (course_version_id, assessment_id, topic_code)
    references public.assessment_blueprint_topics(course_version_id, assessment_id, topic_code) on delete restrict,
  unique (course_version_id, id), unique (assessment_id, id)
);

create table public.assessment_options (
  id uuid primary key default extensions.gen_random_uuid(),
  course_version_id uuid not null,
  question_id uuid not null,
  option_text text not null check (length(btrim(option_text)) between 1 and 1000),
  created_at timestamptz not null default statement_timestamp(),
  foreign key (course_version_id, question_id) references public.assessment_questions(course_version_id, id) on delete restrict,
  unique (course_version_id, question_id, id)
);

create table private.assessment_answer_keys (
  course_version_id uuid not null,
  question_id uuid not null,
  correct_option_id uuid not null,
  primary key (course_version_id, question_id),
  foreign key (course_version_id, question_id, correct_option_id)
    references public.assessment_options(course_version_id, question_id, id) on delete restrict
);
alter table private.assessment_answer_keys enable row level security;
revoke all on private.assessment_answer_keys from public, anon, authenticated;

create table public.course_version_manifest_assessments (
  course_version_id uuid not null references public.course_versions(id) on delete restrict,
  assessment_id uuid not null,
  manifest_position integer not null check (manifest_position > 0),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  primary key (course_version_id, assessment_id), unique (course_version_id, manifest_position),
  foreign key (course_version_id, assessment_id) references public.assessments(course_version_id, id) on delete restrict
);

create table public.assessment_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  enrollment_id uuid not null,
  student_user_id uuid not null,
  course_version_id uuid not null,
  assessment_id uuid not null,
  attempt_number integer not null check (attempt_number > 0),
  status public.assessment_attempt_status not null default 'in_progress',
  passing_percent integer not null check (passing_percent between 1 and 100),
  score_percent integer check (score_percent between 0 and 100),
  correct_count integer check (correct_count >= 0),
  question_count integer not null check (question_count > 0),
  started_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  start_idempotency_key uuid not null,
  foreign key (organization_id, enrollment_id, student_user_id, course_version_id)
    references public.enrollments(organization_id, id, student_user_id, course_version_id) on delete restrict,
  foreign key (course_version_id, assessment_id)
    references public.course_version_manifest_assessments(course_version_id, assessment_id) on delete restrict,
  unique (organization_id, enrollment_id, assessment_id, attempt_number),
  unique (organization_id, student_user_id, start_idempotency_key),
  unique (organization_id, id, student_user_id, course_version_id),
  check ((status = 'in_progress') = (submitted_at is null)),
  check (status = 'in_progress' or score_percent is not null)
);

create table private.assessment_attempt_payloads (
  organization_id uuid not null,
  attempt_id uuid primary key,
  student_user_id uuid not null,
  course_version_id uuid not null,
  selected_questions jsonb not null check (jsonb_typeof(selected_questions) = 'array'),
  foreign key (organization_id, attempt_id, student_user_id, course_version_id)
    references public.assessment_attempts(organization_id, id, student_user_id, course_version_id) on delete restrict
);
alter table private.assessment_attempt_payloads enable row level security;
revoke all on private.assessment_attempt_payloads from public, anon, authenticated;

create table public.assessment_answers (
  organization_id uuid not null,
  attempt_id uuid not null,
  student_user_id uuid not null,
  course_version_id uuid not null,
  question_id uuid not null,
  selected_option_id uuid not null,
  is_correct boolean not null,
  answered_at timestamptz not null default statement_timestamp(),
  primary key (organization_id, attempt_id, question_id),
  foreign key (organization_id, attempt_id, student_user_id, course_version_id)
    references public.assessment_attempts(organization_id, id, student_user_id, course_version_id) on delete restrict,
  foreign key (course_version_id, question_id, selected_option_id)
    references public.assessment_options(course_version_id, question_id, id) on delete restrict
);

create table public.course_completions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  enrollment_id uuid not null,
  student_user_id uuid not null,
  course_version_id uuid not null,
  qualifying_attempt_id uuid not null,
  course_manifest_hash text not null,
  completed_at timestamptz not null default statement_timestamp(),
  student_identity_snapshot jsonb not null check (jsonb_typeof(student_identity_snapshot) = 'object'),
  provider_snapshot jsonb not null check (jsonb_typeof(provider_snapshot) = 'object'),
  reporting_ready boolean not null,
  readiness_issues jsonb not null check (jsonb_typeof(readiness_issues) = 'array'),
  foreign key (organization_id, enrollment_id, student_user_id, course_version_id)
    references public.enrollments(organization_id, id, student_user_id, course_version_id) on delete restrict,
  foreign key (organization_id, qualifying_attempt_id, student_user_id, course_version_id)
    references public.assessment_attempts(organization_id, id, student_user_id, course_version_id) on delete restrict,
  unique (organization_id, enrollment_id), unique (organization_id, id)
);

create table public.reporting_records (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  completion_id uuid not null,
  status public.reporting_status not null,
  reporting_identity_snapshot jsonb not null check (jsonb_typeof(reporting_identity_snapshot) = 'object'),
  provider_snapshot jsonb not null check (jsonb_typeof(provider_snapshot) = 'object'),
  readiness_issues jsonb not null check (jsonb_typeof(readiness_issues) = 'array'),
  created_at timestamptz not null default statement_timestamp(),
  foreign key (organization_id, completion_id) references public.course_completions(organization_id, id) on delete restrict,
  unique (organization_id, completion_id), unique (organization_id, id)
);

create table public.reporting_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  reporting_record_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  from_status public.reporting_status,
  to_status public.reporting_status not null,
  reason text not null check (length(btrim(reason)) between 1 and 2000),
  occurred_at timestamptz not null default statement_timestamp(),
  idempotency_key uuid not null,
  foreign key (organization_id, reporting_record_id) references public.reporting_records(organization_id, id) on delete restrict,
  unique (organization_id, idempotency_key)
);

create table public.completion_corrections (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  completion_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  field_name text not null check (field_name in ('student_identity_note', 'provider_note')),
  prior_value text not null,
  corrected_value text not null,
  reason text not null check (length(btrim(reason)) between 1 and 2000),
  occurred_at timestamptz not null default statement_timestamp(),
  foreign key (organization_id, completion_id) references public.course_completions(organization_id, id) on delete restrict
);

create or replace function private.compute_course_manifest(target_version_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'version_id', v.id, 'title', v.title, 'description', v.description,
    'modules', coalesce((select jsonb_agg(jsonb_build_object(
      'id', m.id, 'title', m.title, 'position', m.position,
      'lessons', coalesce((select jsonb_agg(jsonb_build_object(
        'id', l.id, 'title', l.title, 'position', l.position,
        'estimated_minutes', l.estimated_minutes, 'body_markdown', l.body_markdown
      ) order by l.position, l.id) from public.course_lessons l where l.module_id = m.id), '[]'::jsonb)
    ) order by m.position, m.id) from public.course_modules m where m.course_version_id = v.id), '[]'::jsonb),
    'assessments', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'lesson_id', a.lesson_id, 'kind', a.kind, 'title', a.title,
      'position', a.position, 'question_count', a.question_count,
      'passing_percent', a.passing_percent, 'time_limit_minutes', a.time_limit_minutes,
      'blueprint', (select jsonb_agg(jsonb_build_object('topic_code', b.topic_code, 'required_count', b.required_count) order by b.topic_code)
        from public.assessment_blueprint_topics b where b.assessment_id = a.id),
      'questions', (select jsonb_agg(jsonb_build_object(
        'id', q.id, 'topic_code', q.topic_code, 'prompt', q.prompt, 'rationale', q.rationale,
        'options', (select jsonb_agg(jsonb_build_object('id', o.id, 'text', o.option_text) order by o.id)
          from public.assessment_options o where o.question_id = q.id)
      ) order by q.id) from public.assessment_questions q where q.assessment_id = a.id)
    ) order by a.kind, a.position, a.id) from public.assessments a where a.course_version_id = v.id), '[]'::jsonb)
  ) from public.course_versions v where v.id = target_version_id;
$$;

create or replace function private.refresh_draft_manifest(target_version_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare computed_manifest jsonb; key_material jsonb;
begin
  select private.compute_course_manifest(target_version_id) into computed_manifest;
  select coalesce(jsonb_agg(jsonb_build_object('question_id',k.question_id,'correct_option_id',k.correct_option_id)
    order by k.question_id),'[]'::jsonb) into key_material
  from private.assessment_answer_keys k where k.course_version_id=target_version_id;
  update public.course_versions set manifest=computed_manifest,
    manifest_hash=encode(extensions.digest(computed_manifest::text||key_material::text,'sha256'),'hex')
  where id=target_version_id and status='draft';
  if not found then raise exception 'draft course version required' using errcode='55000'; end if;
end $$;

create trigger assessments_require_draft before insert or update or delete on public.assessments for each row execute function private.require_draft_content();
create trigger assessments_refresh_manifest after insert or update or delete on public.assessments for each row execute function private.refresh_changed_draft_manifest();
create trigger blueprint_require_draft before insert or update or delete on public.assessment_blueprint_topics for each row execute function private.require_draft_content();
create trigger blueprint_refresh_manifest after insert or update or delete on public.assessment_blueprint_topics for each row execute function private.refresh_changed_draft_manifest();
create trigger questions_require_draft before insert or update or delete on public.assessment_questions for each row execute function private.require_draft_content();
create trigger questions_refresh_manifest after insert or update or delete on public.assessment_questions for each row execute function private.refresh_changed_draft_manifest();
create trigger options_require_draft before insert or update or delete on public.assessment_options for each row execute function private.require_draft_content();
create trigger options_refresh_manifest after insert or update or delete on public.assessment_options for each row execute function private.refresh_changed_draft_manifest();
create trigger answer_keys_require_draft before insert or update or delete on private.assessment_answer_keys for each row execute function private.require_draft_content();
create trigger answer_keys_refresh_manifest after insert or update or delete on private.assessment_answer_keys for each row execute function private.refresh_changed_draft_manifest();
create trigger manifest_assessments_require_draft before insert or update or delete on public.course_version_manifest_assessments for each row execute function private.require_draft_content();

create or replace function private.prevent_historical_event_mutation()
returns trigger language plpgsql set search_path = '' as $$ begin raise exception 'historical records are append-only' using errcode = '55000'; end; $$;
create trigger assessment_attempts_immutable before update or delete on public.assessment_attempts for each row
  when (old.status <> 'in_progress') execute function private.prevent_historical_event_mutation();
create trigger assessment_answers_immutable before update or delete on public.assessment_answers for each row execute function private.prevent_historical_event_mutation();
create trigger course_completions_immutable before update or delete on public.course_completions for each row execute function private.prevent_historical_event_mutation();
create trigger reporting_events_immutable before update or delete on public.reporting_events for each row execute function private.prevent_historical_event_mutation();
create trigger completion_corrections_immutable before update or delete on public.completion_corrections for each row execute function private.prevent_historical_event_mutation();

create or replace function public.add_assessment(target_version_id uuid, target_lesson_id uuid,
  assessment_kind public.assessment_kind, assessment_title text, assessment_position integer,
  assessment_question_count integer, assessment_passing_percent integer, assessment_time_limit_minutes integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if not private.is_platform_administrator(auth.uid()) then raise exception 'platform administrator required' using errcode='42501'; end if;
  insert into public.assessments(course_version_id, lesson_id, kind, title, position, question_count, passing_percent, time_limit_minutes)
  values(target_version_id, target_lesson_id, assessment_kind, assessment_title, assessment_position,
    assessment_question_count, assessment_passing_percent, assessment_time_limit_minutes) returning id into new_id;
  return new_id;
end $$;

create or replace function public.add_assessment_topic(target_version_id uuid, target_assessment_id uuid,
  assessment_topic_code text, topic_required_count integer)
returns void language plpgsql security definer set search_path = '' as $$ begin
  if not private.is_platform_administrator(auth.uid()) then raise exception 'platform administrator required' using errcode='42501'; end if;
  insert into public.assessment_blueprint_topics(course_version_id, assessment_id, topic_code, required_count)
  values(target_version_id, target_assessment_id, assessment_topic_code, topic_required_count);
end $$;

create or replace function public.add_assessment_question(target_version_id uuid, target_assessment_id uuid,
  question_topic_code text, question_prompt text, question_rationale text,
  option_texts text[], correct_option_number integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_question uuid; option_id uuid; option_number integer;
begin
  if not private.is_platform_administrator(auth.uid()) then raise exception 'platform administrator required' using errcode='42501'; end if;
  if cardinality(option_texts) < 2 or correct_option_number < 1 or correct_option_number > cardinality(option_texts)
    then raise exception 'at least two options and a valid correct option are required' using errcode='22023'; end if;
  insert into public.assessment_questions(course_version_id, assessment_id, topic_code, prompt, rationale)
  values(target_version_id, target_assessment_id, question_topic_code, question_prompt, nullif(btrim(question_rationale), '')) returning id into new_question;
  for option_number in 1..cardinality(option_texts) loop
    insert into public.assessment_options(course_version_id, question_id, option_text)
    values(target_version_id, new_question, option_texts[option_number]) returning id into option_id;
    if option_number = correct_option_number then
      insert into private.assessment_answer_keys(course_version_id, question_id, correct_option_id)
      values(target_version_id, new_question, option_id);
    end if;
  end loop;
  return new_question;
end $$;

create or replace function private.validate_assessment_publication(target_version_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare a record; available_count integer;
begin
  for a in select * from public.assessments where course_version_id=target_version_id loop
    if (select coalesce(sum(required_count),0) from public.assessment_blueprint_topics where assessment_id=a.id) <> a.question_count
      then raise exception 'blueprint counts must equal assessment question count' using errcode='55000'; end if;
    for available_count in select b.required_count - count(q.id) from public.assessment_blueprint_topics b
      left join public.assessment_questions q on q.assessment_id=b.assessment_id and q.topic_code=b.topic_code
      where b.assessment_id=a.id group by b.topic_code,b.required_count
    loop if available_count > 0 then raise exception 'blueprint topic lacks enough questions' using errcode='55000'; end if; end loop;
    if exists(select 1 from public.assessment_questions q where q.assessment_id=a.id and
      ((select count(*) from public.assessment_options o where o.question_id=q.id)<2 or
       not exists(select 1 from private.assessment_answer_keys k where k.question_id=q.id)))
      then raise exception 'every question requires options and a private key' using errcode='55000'; end if;
  end loop;
end $$;

create or replace function public.publish_course_version(target_version_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare current_hash text; lesson_count integer;
begin
  if not private.is_platform_administrator(auth.uid()) then raise exception 'platform administrator required' using errcode='42501'; end if;
  perform private.refresh_draft_manifest(target_version_id);
  perform private.validate_assessment_publication(target_version_id);
  select manifest_hash into current_hash from public.course_versions where id=target_version_id and status='draft' for update;
  select count(*) into lesson_count from public.course_lessons where course_version_id=target_version_id;
  if lesson_count=0 then raise exception 'at least one lesson required' using errcode='55000'; end if;
  if exists(select 1 from public.course_versions v join public.courses c on c.id=v.course_id where v.id=target_version_id and c.is_demo)
    and not exists(select 1 from public.organizations o where o.is_demo and o.status='active')
    then raise exception 'demo publication requires an active explicit demo school' using errcode='55000'; end if;
  if not exists(select 1 from public.curriculum_reviews r where r.course_version_id=target_version_id
    and r.manifest_hash=current_hash and r.decision='approved')
    then raise exception 'current manifest approval required' using errcode='55000'; end if;
  insert into public.course_version_manifest_lessons(course_version_id,manifest_position,module_id,lesson_id,module_position,lesson_position,content_hash)
  select target_version_id,row_number() over(order by m.position,l.position,l.id),m.id,l.id,m.position,l.position,
    encode(extensions.digest(jsonb_build_object('module_title',m.title,'lesson_title',l.title,'body_markdown',l.body_markdown,'estimated_minutes',l.estimated_minutes)::text,'sha256'),'hex')
  from public.course_modules m join public.course_lessons l on l.module_id=m.id where m.course_version_id=target_version_id;
  insert into public.course_version_manifest_assessments(course_version_id,assessment_id,manifest_position,content_hash)
  select target_version_id,a.id,row_number() over(order by a.kind,a.position,a.id),
    encode(extensions.digest((select x from jsonb_array_elements(private.compute_course_manifest(target_version_id)->'assessments') x where x->>'id'=a.id::text)::text,'sha256'),'hex')
  from public.assessments a where a.course_version_id=target_version_id;
  update public.course_versions set status='published',published_at=statement_timestamp() where id=target_version_id;
  perform private.write_audit_event(null,'course_version.published','course_version',target_version_id::text,jsonb_build_object('manifest_hash',current_hash));
  return current_hash;
end $$;

create or replace function public.start_assessment(target_enrollment_id uuid, target_assessment_id uuid, request_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.enrollments%rowtype; a public.assessments%rowtype; attempt_id uuid; attempt_no integer; selection jsonb;
begin
  select * into e from public.enrollments where id=target_enrollment_id and student_user_id=auth.uid() and status in ('active','completed')
    and private.has_organization_role(organization_id,array['student']::public.organization_role[]) for update;
  if not found then raise exception 'active student enrollment required' using errcode='42501'; end if;
  select a0.* into a from public.assessments a0 join public.course_version_manifest_assessments m
    on m.course_version_id=a0.course_version_id and m.assessment_id=a0.id
    where a0.id=target_assessment_id and a0.course_version_id=e.course_version_id;
  if not found then raise exception 'assessment is not in enrollment manifest' using errcode='42501'; end if;
  if a.kind='final_exam' and exists(select 1 from public.course_version_manifest_lessons ml where ml.course_version_id=e.course_version_id
    and not exists(select 1 from public.lesson_progress p where p.organization_id=e.organization_id and p.enrollment_id=e.id
      and p.lesson_id=ml.lesson_id and p.status='completed')) then raise exception 'required lessons are incomplete' using errcode='55000'; end if;
  select a0.id,p.selected_questions into attempt_id,selection from public.assessment_attempts a0
    join private.assessment_attempt_payloads p on p.attempt_id=a0.id where a0.organization_id=e.organization_id
    and a0.student_user_id=auth.uid() and a0.start_idempotency_key=request_idempotency_key;
  if attempt_id is not null then return jsonb_build_object('attempt_id',attempt_id,'questions',selection); end if;
  select coalesce(max(attempt_number),0)+1 into attempt_no from public.assessment_attempts
    where organization_id=e.organization_id and enrollment_id=e.id and assessment_id=a.id;
  select jsonb_agg(jsonb_build_object('question_id',q.id,'prompt',q.prompt,'options',
    (select jsonb_agg(jsonb_build_object('option_id',o.id,'text',o.option_text) order by random()) from public.assessment_options o where o.question_id=q.id)) order by random()) into selection
  from (select q0.* from public.assessment_blueprint_topics b cross join lateral
    (select q1.* from public.assessment_questions q1 where q1.assessment_id=b.assessment_id and q1.topic_code=b.topic_code order by random() limit b.required_count) q0
    where b.assessment_id=a.id) q;
  insert into public.assessment_attempts(organization_id,enrollment_id,student_user_id,course_version_id,assessment_id,
    attempt_number,passing_percent,question_count,expires_at,start_idempotency_key)
  values(e.organization_id,e.id,auth.uid(),e.course_version_id,a.id,attempt_no,a.passing_percent,a.question_count,
    statement_timestamp()+make_interval(mins=>a.time_limit_minutes),request_idempotency_key) returning id into attempt_id;
  insert into private.assessment_attempt_payloads(organization_id,attempt_id,student_user_id,course_version_id,selected_questions)
    values(e.organization_id,attempt_id,auth.uid(),e.course_version_id,selection);
  return jsonb_build_object('attempt_id',attempt_id,'questions',selection,'expires_at',statement_timestamp()+make_interval(mins=>a.time_limit_minutes));
end $$;

create or replace function public.get_assessment_attempt(target_attempt_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare a public.assessment_attempts%rowtype; selection jsonb;
begin
  select * into a from public.assessment_attempts where id=target_attempt_id and student_user_id=auth.uid()
    and private.has_organization_role(organization_id,array['student']::public.organization_role[]);
  if not found then return null; end if;
  if a.status='in_progress' then select selected_questions into selection from private.assessment_attempt_payloads where attempt_id=a.id; end if;
  return jsonb_build_object('id',a.id,'enrollment_id',a.enrollment_id,'assessment_id',a.assessment_id,
    'status',a.status,'score_percent',a.score_percent,'correct_count',a.correct_count,'question_count',a.question_count,
    'passing_percent',a.passing_percent,'started_at',a.started_at,'expires_at',a.expires_at,'submitted_at',a.submitted_at,
    'questions',selection);
end $$;

create or replace function private.create_completion_if_eligible(attempt public.assessment_attempts)
returns uuid language plpgsql security definer set search_path = '' as $$
declare completion_id uuid; student_snapshot jsonb; provider jsonb; issues jsonb := '[]'::jsonb;
begin
  if attempt.status<>'passed' or not exists(select 1 from public.assessments where id=attempt.assessment_id and kind='final_exam') then return null; end if;
  if exists(select 1 from public.course_version_manifest_lessons ml where ml.course_version_id=attempt.course_version_id
    and not exists(select 1 from public.lesson_progress p where p.organization_id=attempt.organization_id and p.enrollment_id=attempt.enrollment_id and p.lesson_id=ml.lesson_id and p.status='completed')) then return null; end if;
  select jsonb_build_object('legal_first_name',p.legal_first_name,'legal_middle_name',p.legal_middle_name,'legal_last_name',p.legal_last_name,
    'date_of_birth',p.date_of_birth,'license_or_permit_number',p.license_or_permit_number,'issuing_jurisdiction',p.issuing_jurisdiction)
    into student_snapshot from public.student_profiles p where p.organization_id=attempt.organization_id and p.user_id=attempt.student_user_id;
  select jsonb_build_object('organization_id',o.id,'name',o.name,'provider_identifier',o.provider_identifier)
    into provider from public.organizations o where o.id=attempt.organization_id;
  if student_snapshot is null then issues:=issues||'"missing_student_profile"'::jsonb; end if;
  if student_snapshot->>'date_of_birth' is null then issues:=issues||'"missing_date_of_birth"'::jsonb; end if;
  if student_snapshot->>'license_or_permit_number' is null then issues:=issues||'"missing_license_or_permit_number"'::jsonb; end if;
  if student_snapshot->>'issuing_jurisdiction' is null then issues:=issues||'"missing_issuing_jurisdiction"'::jsonb; end if;
  if provider->>'provider_identifier' is null then issues:=issues||'"missing_provider_identifier"'::jsonb; end if;
  insert into public.course_completions(organization_id,enrollment_id,student_user_id,course_version_id,qualifying_attempt_id,
    course_manifest_hash,student_identity_snapshot,provider_snapshot,reporting_ready,readiness_issues)
  select attempt.organization_id,attempt.enrollment_id,attempt.student_user_id,attempt.course_version_id,attempt.id,
    v.manifest_hash,coalesce(student_snapshot,'{}'::jsonb),provider,jsonb_array_length(issues)=0,issues from public.course_versions v where v.id=attempt.course_version_id
  on conflict(organization_id,enrollment_id) do nothing returning id into completion_id;
  if completion_id is not null then
    update public.enrollments set status='completed',updated_at=statement_timestamp() where id=attempt.enrollment_id;
    insert into public.enrollment_events(organization_id,enrollment_id,actor_user_id,from_status,to_status,reason)
      values(attempt.organization_id,attempt.enrollment_id,attempt.student_user_id,'active','completed','Passing final and required lesson interactions recorded');
    insert into public.reporting_records(organization_id,completion_id,status,reporting_identity_snapshot,provider_snapshot,readiness_issues)
      values(attempt.organization_id,completion_id,case when jsonb_array_length(issues)=0 then 'ready'::public.reporting_status else 'needs_attention'::public.reporting_status end,
        coalesce(student_snapshot,'{}'::jsonb),provider,issues);
    perform private.write_audit_event(attempt.organization_id,'course.completed','course_completion',completion_id::text,jsonb_build_object('reporting_ready',jsonb_array_length(issues)=0));
  end if;
  return completion_id;
end $$;

create or replace function public.prepare_reporting_record(target_reporting_record_id uuid, request_idempotency_key uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.reporting_records%rowtype; c public.course_completions%rowtype; student_snapshot jsonb; provider jsonb; issues jsonb := '[]'::jsonb;
begin
  select * into r from public.reporting_records where id=target_reporting_record_id for update;
  if not found or not private.has_organization_role(r.organization_id,array['school_admin']::public.organization_role[])
    then raise exception 'school administrator required' using errcode='42501'; end if;
  if exists(select 1 from public.reporting_events where organization_id=r.organization_id and idempotency_key=request_idempotency_key) then return; end if;
  if r.status not in ('needs_attention','rejected') then raise exception 'record is not available for preparation' using errcode='55000'; end if;
  select * into c from public.course_completions where organization_id=r.organization_id and id=r.completion_id;
  select jsonb_build_object('legal_first_name',p.legal_first_name,'legal_middle_name',p.legal_middle_name,'legal_last_name',p.legal_last_name,
    'date_of_birth',p.date_of_birth,'license_or_permit_number',p.license_or_permit_number,'issuing_jurisdiction',p.issuing_jurisdiction)
    into student_snapshot from public.student_profiles p where p.organization_id=r.organization_id and p.user_id=c.student_user_id;
  select jsonb_build_object('organization_id',o.id,'name',o.name,'provider_identifier',o.provider_identifier)
    into provider from public.organizations o where o.id=r.organization_id;
  if student_snapshot is null then issues:=issues||'"missing_student_profile"'::jsonb; end if;
  if student_snapshot->>'date_of_birth' is null then issues:=issues||'"missing_date_of_birth"'::jsonb; end if;
  if student_snapshot->>'license_or_permit_number' is null then issues:=issues||'"missing_license_or_permit_number"'::jsonb; end if;
  if student_snapshot->>'issuing_jurisdiction' is null then issues:=issues||'"missing_issuing_jurisdiction"'::jsonb; end if;
  if provider->>'provider_identifier' is null then issues:=issues||'"missing_provider_identifier"'::jsonb; end if;
  if jsonb_array_length(issues)>0 then raise exception 'required reporting data is incomplete' using errcode='55000'; end if;
  update public.reporting_records set status='ready',reporting_identity_snapshot=student_snapshot,provider_snapshot=provider,readiness_issues=issues where id=r.id;
  insert into public.reporting_events(organization_id,reporting_record_id,actor_user_id,from_status,to_status,reason,idempotency_key)
    values(r.organization_id,r.id,auth.uid(),r.status,'ready','Required reporting fields reviewed and snapshotted',request_idempotency_key);
  perform private.write_audit_event(r.organization_id,'reporting.prepared','reporting_record',r.id::text);
end $$;

create or replace function public.update_reporting_identifiers(target_organization_id uuid, target_student_user_id uuid,
  student_date_of_birth date, student_license_or_permit_number text, student_issuing_jurisdiction text,
  organization_provider_identifier text)
returns void language plpgsql security definer set search_path = '' as $$ begin
  if not private.has_organization_role(target_organization_id,array['school_admin']::public.organization_role[])
    then raise exception 'school administrator required' using errcode='42501'; end if;
  update public.student_profiles set date_of_birth=student_date_of_birth,
    license_or_permit_number=student_license_or_permit_number,
    issuing_jurisdiction=upper(student_issuing_jurisdiction),updated_at=statement_timestamp()
    where organization_id=target_organization_id and user_id=target_student_user_id;
  if not found then raise exception 'student profile not found' using errcode='P0002'; end if;
  update public.organizations set provider_identifier=organization_provider_identifier,updated_at=statement_timestamp()
    where id=target_organization_id;
  perform private.write_audit_event(target_organization_id,'reporting.identifiers_updated','student_profile',target_student_user_id::text);
end $$;

create or replace function public.submit_assessment(target_attempt_id uuid, submitted_answers jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.assessment_attempts%rowtype; selection jsonb; expected integer; correct integer; passed boolean; completion_id uuid;
begin
  select * into a from public.assessment_attempts where id=target_attempt_id and student_user_id=auth.uid()
    and private.has_organization_role(organization_id,array['student']::public.organization_role[]) for update;
  if not found then raise exception 'assessment attempt not found' using errcode='42501'; end if;
  if a.status<>'in_progress' then return jsonb_build_object('status',a.status,'score_percent',a.score_percent); end if;
  if statement_timestamp()>a.expires_at then
    update public.assessment_attempts set status='expired',score_percent=0,correct_count=0,submitted_at=statement_timestamp() where id=a.id;
    return jsonb_build_object('status','expired','score_percent',0);
  end if;
  if jsonb_typeof(submitted_answers)<>'object' then raise exception 'answers must be an object' using errcode='22023'; end if;
  select selected_questions into selection from private.assessment_attempt_payloads where attempt_id=a.id;
  select jsonb_array_length(selection) into expected;
  if (select count(*) from jsonb_each_text(submitted_answers))<>expected then raise exception 'answer every selected question exactly once' using errcode='22023'; end if;
  insert into public.assessment_answers(organization_id,attempt_id,student_user_id,course_version_id,question_id,selected_option_id,is_correct)
  select a.organization_id,a.id,a.student_user_id,a.course_version_id,x.key::uuid,x.value::uuid,k.correct_option_id=x.value::uuid
  from jsonb_each_text(submitted_answers) x
  join lateral (select 1 from jsonb_array_elements(selection) q where q->>'question_id'=x.key) selected on true
  join public.assessment_options o on o.course_version_id=a.course_version_id and o.question_id=x.key::uuid and o.id=x.value::uuid
  join private.assessment_answer_keys k on k.course_version_id=a.course_version_id and k.question_id=x.key::uuid;
  if not found or (select count(*) from public.assessment_answers where organization_id=a.organization_id and attempt_id=a.id)<>expected
    then raise exception 'answers do not match selected questions and options' using errcode='22023'; end if;
  select count(*) filter(where is_correct) into correct from public.assessment_answers where organization_id=a.organization_id and attempt_id=a.id;
  passed := correct*100 >= a.passing_percent*expected;
  update public.assessment_attempts set status=case when passed then 'passed'::public.assessment_attempt_status else 'failed'::public.assessment_attempt_status end,
    score_percent=(correct*100)/expected,correct_count=correct,submitted_at=statement_timestamp() where id=a.id returning * into a;
  if passed then completion_id:=private.create_completion_if_eligible(a); end if;
  perform private.write_audit_event(a.organization_id,'assessment.submitted','assessment_attempt',a.id::text,
    jsonb_build_object('status',a.status,'score_percent',a.score_percent,'completion_id',completion_id));
  return jsonb_build_object('status',a.status,'score_percent',a.score_percent,'correct_count',correct,'question_count',expected,'completion_id',completion_id);
end $$;

create or replace function public.transition_reporting(target_reporting_record_id uuid, target_status public.reporting_status,
  transition_reason text, request_idempotency_key uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.reporting_records%rowtype; prior public.reporting_status;
begin
  select * into r from public.reporting_records where id=target_reporting_record_id for update;
  if not found or not private.has_organization_role(r.organization_id,array['school_admin']::public.organization_role[])
    then raise exception 'school administrator required' using errcode='42501'; end if;
  if exists(select 1 from public.reporting_events where organization_id=r.organization_id and idempotency_key=request_idempotency_key) then return; end if;
  prior:=r.status;
  if (target_status='submitted' and prior<>'ready') or (target_status in ('accepted','rejected') and prior<>'submitted')
    or target_status in ('ready','needs_attention') then raise exception 'invalid reporting transition' using errcode='55000'; end if;
  update public.reporting_records set status=target_status where id=r.id;
  insert into public.reporting_events(organization_id,reporting_record_id,actor_user_id,from_status,to_status,reason,idempotency_key)
    values(r.organization_id,r.id,auth.uid(),prior,target_status,transition_reason,request_idempotency_key);
  perform private.write_audit_event(r.organization_id,'reporting.status_changed','reporting_record',r.id::text,jsonb_build_object('from',prior,'to',target_status));
end $$;

create or replace function public.add_completion_correction(target_completion_id uuid, correction_field text,
  previous_value text, replacement_value text, correction_reason text)
returns void language plpgsql security definer set search_path = '' as $$ declare org uuid; begin
  select organization_id into org from public.course_completions where id=target_completion_id;
  if not private.has_organization_role(org,array['school_admin']::public.organization_role[]) then raise exception 'school administrator required' using errcode='42501'; end if;
  insert into public.completion_corrections(organization_id,completion_id,actor_user_id,field_name,prior_value,corrected_value,reason)
    values(org,target_completion_id,auth.uid(),correction_field,previous_value,replacement_value,correction_reason);
  perform private.write_audit_event(org,'completion.correction_recorded','course_completion',target_completion_id::text,jsonb_build_object('field',correction_field));
end $$;

alter table public.assessments enable row level security; alter table public.assessments force row level security;
alter table public.assessment_blueprint_topics enable row level security; alter table public.assessment_blueprint_topics force row level security;
alter table public.assessment_questions enable row level security; alter table public.assessment_questions force row level security;
alter table public.assessment_options enable row level security; alter table public.assessment_options force row level security;
alter table public.course_version_manifest_assessments enable row level security; alter table public.course_version_manifest_assessments force row level security;
alter table public.assessment_attempts enable row level security; alter table public.assessment_attempts force row level security;
alter table public.assessment_answers enable row level security; alter table public.assessment_answers force row level security;
alter table public.course_completions enable row level security; alter table public.course_completions force row level security;
alter table public.reporting_records enable row level security; alter table public.reporting_records force row level security;
alter table public.reporting_events enable row level security; alter table public.reporting_events force row level security;
alter table public.completion_corrections enable row level security; alter table public.completion_corrections force row level security;

create policy assessment_content_read on public.assessments for select to authenticated using (private.is_platform_administrator() or exists(select 1 from public.course_assignments ca where ca.course_version_id=assessments.course_version_id and private.has_organization_role(ca.organization_id,array['school_admin']::public.organization_role[])) or exists(select 1 from public.enrollments e where e.course_version_id=assessments.course_version_id and e.student_user_id=auth.uid() and e.status in ('active','completed') and private.has_organization_role(e.organization_id,array['student']::public.organization_role[])));
create policy blueprint_read on public.assessment_blueprint_topics for select to authenticated using (private.is_platform_administrator());
create policy questions_read on public.assessment_questions for select to authenticated using (private.is_platform_administrator());
create policy options_read on public.assessment_options for select to authenticated using (private.is_platform_administrator());
create policy assessment_manifest_read on public.course_version_manifest_assessments for select to authenticated using (private.is_platform_administrator() or exists(select 1 from public.enrollments e where e.course_version_id=course_version_manifest_assessments.course_version_id and (private.has_organization_role(e.organization_id,array['school_admin']::public.organization_role[]) or (e.student_user_id=auth.uid() and private.has_organization_role(e.organization_id,array['student']::public.organization_role[])))));
create policy attempts_read on public.assessment_attempts for select to authenticated using (private.is_platform_administrator() or private.has_organization_role(organization_id,array['school_admin']::public.organization_role[]) or (student_user_id=auth.uid() and private.has_organization_role(organization_id,array['student']::public.organization_role[])));
create policy answers_read_admin on public.assessment_answers for select to authenticated using (private.is_platform_administrator() or private.has_organization_role(organization_id,array['school_admin']::public.organization_role[]));
create policy completions_read on public.course_completions for select to authenticated using (private.is_platform_administrator() or private.has_organization_role(organization_id,array['school_admin']::public.organization_role[]) or (student_user_id=auth.uid() and private.has_organization_role(organization_id,array['student']::public.organization_role[])));
create policy reporting_read on public.reporting_records for select to authenticated using (private.is_platform_administrator() or private.has_organization_role(organization_id,array['school_admin']::public.organization_role[]));
create policy reporting_events_read on public.reporting_events for select to authenticated using (private.is_platform_administrator() or private.has_organization_role(organization_id,array['school_admin']::public.organization_role[]));
create policy corrections_read on public.completion_corrections for select to authenticated using (private.is_platform_administrator() or private.has_organization_role(organization_id,array['school_admin']::public.organization_role[]));

revoke all on public.assessments,public.assessment_blueprint_topics,public.assessment_questions,public.assessment_options,
 public.course_version_manifest_assessments,public.assessment_attempts,public.assessment_answers,public.course_completions,
 public.reporting_records,public.reporting_events,public.completion_corrections from public,anon,authenticated;
grant select on public.assessments,public.assessment_blueprint_topics,public.assessment_questions,public.assessment_options,
 public.course_version_manifest_assessments,public.assessment_attempts,public.assessment_answers,public.course_completions,
 public.reporting_records,public.reporting_events,public.completion_corrections to authenticated;
revoke all on function public.add_assessment(uuid,uuid,public.assessment_kind,text,integer,integer,integer,integer),
 public.add_assessment_topic(uuid,uuid,text,integer), public.add_assessment_question(uuid,uuid,text,text,text,text[],integer),
 public.start_assessment(uuid,uuid,uuid),public.get_assessment_attempt(uuid),public.submit_assessment(uuid,jsonb),
 public.update_reporting_identifiers(uuid,uuid,date,text,text,text),public.prepare_reporting_record(uuid,uuid),public.transition_reporting(uuid,public.reporting_status,text,uuid),public.add_completion_correction(uuid,text,text,text,text)
 from public,anon,authenticated;
grant execute on function public.add_assessment(uuid,uuid,public.assessment_kind,text,integer,integer,integer,integer),
 public.add_assessment_topic(uuid,uuid,text,integer), public.add_assessment_question(uuid,uuid,text,text,text,text[],integer),
 public.start_assessment(uuid,uuid,uuid),public.get_assessment_attempt(uuid),public.submit_assessment(uuid,jsonb),
 public.update_reporting_identifiers(uuid,uuid,date,text,text,text),public.prepare_reporting_record(uuid,uuid),public.transition_reporting(uuid,public.reporting_status,text,uuid),public.add_completion_correction(uuid,text,text,text,text)
 to authenticated;

comment on table private.assessment_answer_keys is 'Protected server-only answer keys; never granted to browser roles.';
comment on table public.course_completions is 'Immutable software completion snapshot. This is not external TPR acceptance, provider eligibility, or certification.';
comment on table public.reporting_records is 'Manual reporting workflow; submitted and accepted are distinct explicit states and no FMCSA API call occurs.';
commit;

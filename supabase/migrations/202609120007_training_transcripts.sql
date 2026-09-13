begin;

create or replace function public.get_training_transcript(target_completion_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  completion public.course_completions%rowtype;
  transcript jsonb;
begin
  select * into completion
  from public.course_completions
  where id = target_completion_id;

  if not found or not (
    private.is_platform_administrator(auth.uid())
    or private.has_organization_role(
      completion.organization_id,
      array['school_admin']::public.organization_role[]
    )
  ) then
    raise exception 'training transcript not found' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'completion', jsonb_build_object(
      'id', completion.id,
      'completed_at', completion.completed_at,
      'course_manifest_hash', completion.course_manifest_hash,
      'qualifying_attempt_id', completion.qualifying_attempt_id,
      'student_identity_snapshot', completion.student_identity_snapshot,
      'provider_snapshot', completion.provider_snapshot,
      'reporting_ready_at_completion', completion.reporting_ready,
      'readiness_issues_at_completion', completion.readiness_issues
    ),
    'course', jsonb_build_object(
      'version_id', v.id,
      'title', v.title,
      'version_number', v.version_number,
      'published_at', v.published_at
    ),
    'lessons', coalesce((
      select jsonb_agg(jsonb_build_object(
        'lesson_id', ml.lesson_id,
        'title', l.title,
        'manifest_position', ml.manifest_position,
        'content_hash', ml.content_hash,
        'first_opened_at', p.first_opened_at,
        'last_opened_at', p.last_opened_at,
        'completed_at', p.completed_at
      ) order by ml.manifest_position)
      from public.course_version_manifest_lessons ml
      join public.course_lessons l
        on l.course_version_id = ml.course_version_id and l.id = ml.lesson_id
      left join public.lesson_progress p
        on p.organization_id = completion.organization_id
       and p.enrollment_id = completion.enrollment_id
       and p.lesson_id = ml.lesson_id
      where ml.course_version_id = completion.course_version_id
    ), '[]'::jsonb),
    'attempts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'assessment_title', assessment.title,
        'assessment_kind', assessment.kind,
        'attempt_number', a.attempt_number,
        'status', a.status,
        'passing_percent', a.passing_percent,
        'score_percent', a.score_percent,
        'correct_count', a.correct_count,
        'question_count', a.question_count,
        'started_at', a.started_at,
        'expires_at', a.expires_at,
        'submitted_at', a.submitted_at,
        'qualifying', a.id = completion.qualifying_attempt_id
      ) order by a.started_at, a.id)
      from public.assessment_attempts a
      join public.assessments assessment
        on assessment.course_version_id = a.course_version_id
       and assessment.id = a.assessment_id
      where a.organization_id = completion.organization_id
        and a.enrollment_id = completion.enrollment_id
    ), '[]'::jsonb),
    'corrections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'field_name', correction.field_name,
        'prior_value', correction.prior_value,
        'corrected_value', correction.corrected_value,
        'reason', correction.reason,
        'occurred_at', correction.occurred_at
      ) order by correction.occurred_at, correction.id)
      from public.completion_corrections correction
      where correction.organization_id = completion.organization_id
        and correction.completion_id = completion.id
    ), '[]'::jsonb),
    'reporting', (
      select jsonb_build_object(
        'status', reporting.status,
        'identity_snapshot', reporting.reporting_identity_snapshot,
        'provider_snapshot', reporting.provider_snapshot,
        'events', coalesce((
          select jsonb_agg(jsonb_build_object(
            'from_status', event.from_status,
            'to_status', event.to_status,
            'reason', event.reason,
            'occurred_at', event.occurred_at
          ) order by event.occurred_at, event.id)
          from public.reporting_events event
          where event.organization_id = reporting.organization_id
            and event.reporting_record_id = reporting.id
        ), '[]'::jsonb)
      )
      from public.reporting_records reporting
      where reporting.organization_id = completion.organization_id
        and reporting.completion_id = completion.id
    )
  ) into transcript
  from public.course_versions v
  where v.id = completion.course_version_id;

  return transcript;
end;
$$;

revoke all on function public.get_training_transcript(uuid) from public, anon, authenticated;
grant execute on function public.get_training_transcript(uuid) to authenticated;

comment on function public.get_training_transcript(uuid) is
  'Tenant-authorized printable software training history assembled from immutable completion, published curriculum, append-only attempts, and correction/event records. It is not certification or regulatory approval.';

commit;

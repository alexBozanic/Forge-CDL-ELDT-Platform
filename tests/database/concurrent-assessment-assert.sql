do $$ begin
 if (select count(*) from public.assessment_answers a join public.assessment_attempts t on t.id=a.attempt_id where t.start_idempotency_key='73100000-0000-4000-8000-000000000004') <> 1 then raise exception 'concurrent submit duplicated answers'; end if;
 if (select count(*) from public.course_completions where enrollment_id='73000000-0000-4000-8000-000000000001') <> 1 then raise exception 'concurrent submit did not create exactly one completion'; end if;
 if (select count(*) from public.reporting_records r join public.course_completions c on c.id=r.completion_id where c.enrollment_id='73000000-0000-4000-8000-000000000001') <> 1 then raise exception 'concurrent submit duplicated reporting record'; end if;
end $$;
\echo 'Concurrent assessment submission assertions passed.'

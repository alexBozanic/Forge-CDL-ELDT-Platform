-- Read-only preflight for the partially initialized hosted test project.
-- Run in a trusted SQL session and retain the output in the private deployment log.
select version, name
from supabase_migrations.schema_migrations
order by version;

select n.nspname as schema_name, c.relname as relation_name, c.relrowsecurity,
       c.relforcerowsecurity
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where (n.nspname, c.relname) in (
  ('private', 'invitation_redemption_limits'),
  ('public', 'invitations'),
  ('public', 'enrollments'),
  ('public', 'course_modules'),
  ('public', 'lesson_progress')
)
order by 1, 2;

select to_regprocedure('public.accept_student_invitation(text)') as invitation_acceptance,
       to_regprocedure('public.record_lesson_interaction(uuid,uuid,public.lesson_interaction_type,integer,uuid)')
         as lesson_interaction;

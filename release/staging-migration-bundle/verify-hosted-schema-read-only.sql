begin transaction read only;

-- Archive this output privately. It inspects but cannot prove source equivalence.
select current_database() as connected_database, current_user as connected_user,
  inet_server_addr() as server_address, inet_server_port() as server_port;

select version, name
from supabase_migrations.schema_migrations
order by version;

select expected.schema_name, expected.relation_name,
  to_regclass(format('%I.%I', expected.schema_name, expected.relation_name)) is not null as exists,
  coalesce(actual.relrowsecurity, false) as rls_enabled,
  coalesce(actual.relforcerowsecurity, false) as rls_forced
from (values
  ('public', 'organizations'),
  ('public', 'organization_memberships'),
  ('public', 'invitations'),
  ('public', 'enrollments'),
  ('private', 'invitation_redemption_limits')
) expected(schema_name, relation_name)
left join pg_namespace namespace on namespace.nspname = expected.schema_name
left join pg_class actual on actual.relnamespace = namespace.oid
  and actual.relname = expected.relation_name
order by expected.schema_name, expected.relation_name;

select routine.routine_schema, routine.routine_name, routine.security_type
from information_schema.routines routine
where (routine.routine_schema, routine.routine_name) in (
  ('public', 'accept_student_invitation'),
  ('public', 'create_organization'),
  ('public', 'invite_school_administrator')
)
order by routine.routine_schema, routine.routine_name;

rollback;

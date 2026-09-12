\set ON_ERROR_STOP on

do $$
begin
  if (select count(*) from public.organization_memberships
      where organization_id = 'aaaaaaaa-0000-4000-8000-000000000001'
        and user_id = '40000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'ASSERTION FAILED: concurrent redemption created incorrect membership count';
  end if;
  if (select status from public.invitations
      where id = 'ffffffff-0000-4000-8000-000000000007') <> 'accepted' then
    raise exception 'ASSERTION FAILED: concurrent invitation was not accepted exactly once';
  end if;
  if (select count(*) from public.audit_events
      where action = 'invitation.accepted'
        and target_id = 'ffffffff-0000-4000-8000-000000000007') <> 1 then
    raise exception 'ASSERTION FAILED: concurrent redemption created incorrect audit count';
  end if;
  if (select attempt_count from private.invitation_redemption_limits
      where user_id = '40000000-0000-4000-8000-000000000001') <> 2 then
    raise exception 'ASSERTION FAILED: concurrent redemption attempts were not both recorded';
  end if;
end $$;

\echo 'Concurrent PostgreSQL invitation redemption assertions passed.'

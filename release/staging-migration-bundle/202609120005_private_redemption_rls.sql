begin;

-- This table is intentionally accessed only by owner-executed, security-definer
-- invitation functions. RLS is an additional fail-closed boundary if a table
-- grant is ever added accidentally; no client-facing policy is required.
alter table if exists private.invitation_redemption_limits enable row level security;

comment on table private.invitation_redemption_limits is
  'RLS-protected per-user invitation guessing throttle. Access is limited to narrow security-definer invitation functions; edge/IP rate limiting remains an operational control.';

commit;

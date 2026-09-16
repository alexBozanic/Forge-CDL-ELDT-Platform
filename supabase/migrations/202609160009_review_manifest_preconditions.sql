begin;

-- Require the hash displayed to the operator. Lock the version through review
-- or publication so a concurrent manifest refresh cannot change that hash
-- between the comparison and the existing privileged operation.
create function public.review_course_version_at_hash(
  target_version_id uuid, expected_manifest_hash text,
  review_decision public.curriculum_review_decision, review_notes text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare current_hash text;
begin
  if not private.is_platform_administrator(auth.uid()) then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  if expected_manifest_hash is null or expected_manifest_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'displayed manifest hash required' using errcode = '22023';
  end if;
  select manifest_hash into current_hash from public.course_versions
    where id = target_version_id and status = 'draft' for update;
  if not found then
    raise exception 'draft version required' using errcode = '55000';
  end if;
  if current_hash <> expected_manifest_hash then
    raise exception 'draft changed since it was displayed' using errcode = '40001';
  end if;
  return public.review_course_version(target_version_id, review_decision, review_notes);
end;
$$;

create function public.publish_course_version_at_hash(
  target_version_id uuid, expected_manifest_hash text
) returns text language plpgsql security definer set search_path = '' as $$
declare current_hash text;
begin
  if not private.is_platform_administrator(auth.uid()) then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  if expected_manifest_hash is null or expected_manifest_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'displayed manifest hash required' using errcode = '22023';
  end if;
  select manifest_hash into current_hash from public.course_versions
    where id = target_version_id and status = 'draft' for update;
  if not found then
    raise exception 'draft version required' using errcode = '55000';
  end if;
  if current_hash <> expected_manifest_hash then
    raise exception 'draft changed since it was displayed' using errcode = '40001';
  end if;
  return public.publish_course_version(target_version_id);
end;
$$;

-- The old operations remain implementation details for the wrappers' owner.
-- Authenticated callers cannot bypass the displayed-hash precondition.
revoke execute on function public.review_course_version(uuid, public.curriculum_review_decision, text),
  public.publish_course_version(uuid) from public, anon, authenticated;
revoke all on function public.review_course_version_at_hash(uuid, text, public.curriculum_review_decision, text),
  public.publish_course_version_at_hash(uuid, text) from public, anon;
grant execute on function public.review_course_version_at_hash(uuid, text, public.curriculum_review_decision, text),
  public.publish_course_version_at_hash(uuid, text) to authenticated;

commit;

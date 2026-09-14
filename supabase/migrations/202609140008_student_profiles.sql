begin;
-- Current profiles are editable; historical completion snapshots remain immutable.
create or replace function public.save_student_profile(
  target_organization_id uuid, target_student_user_id uuid,
  first_name text, middle_name text, last_name text,
  birth_date date, permit_number text, jurisdiction text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not (
    private.is_platform_administrator()
    or private.has_organization_role(target_organization_id,array['school_admin']::public.organization_role[])
    or (auth.uid()=target_student_user_id and private.has_organization_role(target_organization_id,array['student']::public.organization_role[]))
  ) then raise exception 'Profile access denied' using errcode='42501'; end if;
  -- Lock membership so suspension/removal cannot race profile creation.
  perform 1 from public.organization_memberships m
    join public.organizations o on o.id=m.organization_id
    where m.organization_id=target_organization_id and m.user_id=target_student_user_id
      and m.role='student' and m.status='active' and o.status='active'
    for share of m,o;
  if not found then raise exception 'Active student membership required' using errcode='42501'; end if;
  if first_name is null or last_name is null or length(btrim(first_name)) not between 1 and 100
    or length(btrim(last_name)) not between 1 and 100 or length(btrim(middle_name))>100
    or length(btrim(permit_number))>64
    or (nullif(btrim(jurisdiction),'') is not null and upper(btrim(jurisdiction)) !~ '^[A-Z]{2}$')
    or birth_date >= current_date then
    raise exception 'Check profile names, date of birth, permit number and two-letter jurisdiction' using errcode='22023';
  end if;
  insert into public.student_profiles(organization_id,user_id,legal_first_name,legal_middle_name,legal_last_name,
    date_of_birth,license_or_permit_number,issuing_jurisdiction)
  values(target_organization_id,target_student_user_id,btrim(first_name),nullif(btrim(middle_name),''),btrim(last_name),
    birth_date,nullif(btrim(permit_number),''),upper(nullif(btrim(jurisdiction),'')))
  on conflict (organization_id,user_id) do update set
    legal_first_name=excluded.legal_first_name,legal_middle_name=excluded.legal_middle_name,
    legal_last_name=excluded.legal_last_name,date_of_birth=excluded.date_of_birth,
    license_or_permit_number=excluded.license_or_permit_number,issuing_jurisdiction=excluded.issuing_jurisdiction,
    updated_at=statement_timestamp();
  perform private.write_audit_event(target_organization_id,'student.profile_saved','student_profile',target_student_user_id::text);
end $$;
revoke all on function public.save_student_profile(uuid,uuid,text,text,text,date,text,text) from public,anon;
grant execute on function public.save_student_profile(uuid,uuid,text,text,text,date,text,text) to authenticated;
commit;

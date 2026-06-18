alter table public.agencies
  alter column primary_color set default '#18181B';

create or replace function public.create_agency_for_current_user(
  agency_name text,
  agency_slug text,
  agency_primary_color text default '#18181B'
)
returns public.agencies
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := coalesce(auth.jwt() ->> 'email', 'unknown@example.invalid');
  created_agency public.agencies;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to create an agency.';
  end if;

  if agency_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Agency slug must be lowercase letters, numbers, and hyphens.';
  end if;

  insert into public.profiles (id, email, name)
  values (current_user_id, current_email, split_part(current_email, '@', 1))
  on conflict (id) do nothing;

  insert into public.agencies (name, slug, primary_color)
  values (agency_name, agency_slug, coalesce(nullif(agency_primary_color, ''), '#18181B'))
  returning * into created_agency;

  insert into public.memberships (agency_id, user_id, role)
  values (created_agency.id, current_user_id, 'owner');

  return created_agency;
end;
$$;

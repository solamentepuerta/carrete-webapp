-- Make pairing behave like a stable two-person room.

create or replace function create_pairing_code(
  p_display_name text,
  p_timezone text default 'UTC'
)
returns table (
  invite_code text,
  couple_id uuid,
  member_count int,
  is_paired boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_name text := nullif(btrim(coalesce(p_display_name, '')), '');
  v_timezone text := nullif(btrim(coalesce(p_timezone, '')), '');
  v_couple_id uuid;
  v_existing_couple_id uuid;
  v_existing_code text;
  v_existing_count int := 0;
begin
  if auth.uid() is null then
    raise exception 'debes iniciar sesion';
  end if;

  if v_name is null then
    v_name := 'Alguien especial';
  end if;

  if v_timezone is null then
    v_timezone := 'UTC';
  end if;

  select p.couple_id,
         c.invite_code,
         coalesce(member_counts.member_count, 0)::int
  into v_existing_couple_id,
       v_existing_code,
       v_existing_count
  from profiles p
  left join couples c on c.id = p.couple_id
  left join lateral (
    select count(*)::int as member_count
    from profiles p2
    where p2.couple_id = p.couple_id
  ) member_counts on true
  where p.id = auth.uid();

  if v_existing_couple_id is not null then
    update profiles
    set display_name = v_name,
        timezone = v_timezone
    where id = auth.uid();

    return query
    select v_existing_code::text as invite_code,
           v_existing_couple_id::uuid as couple_id,
           v_existing_count::int as member_count,
           (v_existing_count >= 2) as is_paired;
    return;
  end if;

  loop
    v_couple_id := null;
    v_code := generate_pairing_code();

    begin
      insert into couples (invite_code)
      values (v_code)
      returning id into v_couple_id;
    exception
      when unique_violation then
        v_couple_id := null;
    end;

    exit when v_couple_id is not null;
  end loop;

  insert into profiles (id, couple_id, display_name, timezone)
  values (auth.uid(), v_couple_id, v_name, v_timezone)
  on conflict (id) do update set
    couple_id = excluded.couple_id,
    display_name = excluded.display_name,
    timezone = excluded.timezone;

  return query
  select v_code::text as invite_code,
         v_couple_id::uuid as couple_id,
         1::int as member_count,
         false as is_paired;
end;
$$;

revoke all on function create_pairing_code(text, text) from public;
grant execute on function create_pairing_code(text, text) to authenticated;

create or replace function join_pairing_code(
  p_invite_code text,
  p_display_name text,
  p_timezone text default 'UTC'
)
returns table (
  invite_code text,
  couple_id uuid,
  member_count int,
  is_paired boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_invite_code, ''), '\s+', '', 'g'));
  v_name text := nullif(btrim(coalesce(p_display_name, '')), '');
  v_timezone text := nullif(btrim(coalesce(p_timezone, '')), '');
  v_couple_id uuid;
  v_current_couple_id uuid;
  v_current_count int := 0;
  v_target_count int := 0;
  v_count int := 0;
begin
  if auth.uid() is null then
    raise exception 'debes iniciar sesion';
  end if;

  if v_code = '' then
    raise exception 'codigo requerido';
  end if;

  if v_name is null then
    v_name := 'Alguien especial';
  end if;

  if v_timezone is null then
    v_timezone := 'UTC';
  end if;

  select c.id into v_couple_id
  from couples c
  where c.invite_code = v_code
  for update;

  if v_couple_id is null then
    raise exception 'codigo invalido';
  end if;

  select p.couple_id,
         coalesce(member_counts.member_count, 0)::int
  into v_current_couple_id,
       v_current_count
  from profiles p
  left join lateral (
    select count(*)::int as member_count
    from profiles p2
    where p2.couple_id = p.couple_id
  ) member_counts on true
  where p.id = auth.uid();

  select count(*)::int into v_target_count
  from profiles p
  where p.couple_id = v_couple_id;

  if v_current_couple_id = v_couple_id then
    update profiles
    set display_name = v_name,
        timezone = v_timezone
    where id = auth.uid();

    if v_target_count < 2 then
      raise exception 'esta es tu propia sala; entra con la cuenta de tu pareja para completarla';
    end if;

    return query
    select v_code::text as invite_code,
           v_couple_id::uuid as couple_id,
           v_target_count::int as member_count,
           true as is_paired;
    return;
  end if;

  if v_current_couple_id is not null and v_current_count >= 2 then
    raise exception 'ya tienes una sala activa';
  end if;

  if v_target_count >= 2 then
    raise exception 'este codigo ya esta completo';
  end if;

  insert into profiles (id, couple_id, display_name, timezone)
  values (auth.uid(), v_couple_id, v_name, v_timezone)
  on conflict (id) do update set
    couple_id = excluded.couple_id,
    display_name = excluded.display_name,
    timezone = excluded.timezone;

  select count(*)::int into v_count
  from profiles p
  where p.couple_id = v_couple_id;

  return query
  select v_code::text as invite_code,
         v_couple_id::uuid as couple_id,
         v_count::int as member_count,
         (v_count >= 2) as is_paired;
end;
$$;

revoke all on function join_pairing_code(text, text, text) from public;
grant execute on function join_pairing_code(text, text, text) to authenticated;

-- Avoid invite_code ambiguity inside RETURNS TABLE functions.

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
  v_count int;
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
  where c.invite_code = v_code;

  if v_couple_id is null then
    raise exception 'codigo invalido';
  end if;

  select count(*)::int into v_count
  from profiles p
  where p.couple_id = v_couple_id
    and p.id <> auth.uid();

  if v_count >= 2 then
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

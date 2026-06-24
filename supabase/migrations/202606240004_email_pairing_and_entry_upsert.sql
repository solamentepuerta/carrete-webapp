-- Email/password pairing flow and same-day category replacement.

create index if not exists profiles_couple_id_idx on profiles (couple_id);

create or replace function generate_pairing_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i int;
begin
  for i in 1..6 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;

  return code;
end;
$$;

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
    v_code := generate_pairing_code();

    insert into couples (invite_code)
    values (v_code)
    on conflict (invite_code) do nothing
    returning id into v_couple_id;

    exit when v_couple_id is not null;
  end loop;

  insert into profiles (id, couple_id, display_name, timezone)
  values (auth.uid(), v_couple_id, v_name, v_timezone)
  on conflict (id) do update set
    couple_id = excluded.couple_id,
    display_name = excluded.display_name,
    timezone = excluded.timezone;

  return query
  select v_code,
         v_couple_id,
         1,
         false;
end;
$$;

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

  select id into v_couple_id
  from couples
  where invite_code = v_code;

  if v_couple_id is null then
    raise exception 'codigo invalido';
  end if;

  select count(*)::int into v_count
  from profiles
  where couple_id = v_couple_id
    and id <> auth.uid();

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
  from profiles
  where couple_id = v_couple_id;

  return query
  select v_code,
         v_couple_id,
         v_count,
         (v_count >= 2);
end;
$$;

create or replace function get_pairing_status()
returns table (
  invite_code text,
  couple_id uuid,
  member_count int,
  is_paired boolean
)
language sql
security definer
set search_path = public
as $$
  select c.invite_code,
         p.couple_id,
         coalesce(member_counts.member_count, 0)::int,
         coalesce(member_counts.member_count, 0) >= 2
  from profiles p
  left join couples c on c.id = p.couple_id
  left join lateral (
    select count(*)::int as member_count
    from profiles p2
    where p2.couple_id = p.couple_id
  ) member_counts on true
  where p.id = auth.uid();
$$;

create or replace function create_entry(
  p_category_id smallint,
  p_image_path text,
  p_caption text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz text;
  v_date date;
  v_id uuid;
begin
  select timezone into v_tz from profiles where id = auth.uid();
  v_date := (now() at time zone coalesce(v_tz, 'UTC'))::date;

  insert into entries (couple_id, author_id, entry_date, category_id, image_path, caption)
  values (my_couple_id(), auth.uid(), v_date, p_category_id, p_image_path, p_caption)
  on conflict (author_id, entry_date, category_id) do update set
    image_path = excluded.image_path,
    caption = excluded.caption,
    created_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function generate_pairing_code() from public;
revoke all on function create_pairing_code(text, text) from public;
revoke all on function join_pairing_code(text, text, text) from public;
revoke all on function get_pairing_status() from public;

grant execute on function create_pairing_code(text, text) to authenticated;
grant execute on function join_pairing_code(text, text, text) to authenticated;
grant execute on function get_pairing_status() to authenticated;

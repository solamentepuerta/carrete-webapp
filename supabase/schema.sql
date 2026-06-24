-- =========================================================
-- Carrete - Supabase schema, RLS, RPCs, and private storage
-- =========================================================

-- Required for gen_random_uuid().
create extension if not exists pgcrypto;

-- =========================================================
-- TABLAS
-- =========================================================

create table if not exists couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid references couples(id) on delete set null,
  display_name text not null,
  avatar_url text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id smallint primary key,
  key text unique not null,
  label text not null,
  emoji text,
  sort_order smallint not null
);

insert into categories (id, key, label, emoji, sort_order) values
  (1, 'smile', 'Me sacó una sonrisa', '😊', 1),
  (2, 'you', 'Me acordé de ti', '💭', 2),
  (3, 'now', 'Lo que veo ahora', '👀', 3),
  (4, 'mood', 'Mi mood de hoy', '🌈', 4),
  (5, 'wish', 'Ojalá estuvieras aquí', '🫶', 5)
on conflict (id) do update set
  key = excluded.key,
  label = excluded.label,
  emoji = excluded.emoji,
  sort_order = excluded.sort_order;

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  entry_date date not null,
  category_id smallint not null references categories(id),
  image_path text not null,
  caption text,
  created_at timestamptz not null default now(),
  unique (author_id, entry_date, category_id)
);

create table if not exists guesses (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references entries(id) on delete cascade,
  guesser_id uuid not null references profiles(id) on delete cascade,
  guessed_category_id smallint not null references categories(id),
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  unique (entry_id, guesser_id)
);

create index if not exists entries_couple_date_idx on entries (couple_id, entry_date);
create index if not exists guesses_guesser_idx on guesses (guesser_id);
create index if not exists profiles_couple_id_idx on profiles (couple_id);

-- =========================================================
-- RLS
-- =========================================================

alter table couples enable row level security;
alter table profiles enable row level security;
alter table entries enable row level security;
alter table guesses enable row level security;
alter table categories enable row level security;

create or replace function my_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from profiles where id = auth.uid()
$$;

create or replace function join_couple(
  p_invite_code text,
  p_display_name text,
  p_timezone text default 'UTC'
)
returns table (
  profile_id uuid,
  couple_id uuid,
  display_name text,
  timezone text
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

  insert into couples (invite_code)
  values (v_code)
  on conflict (invite_code) do update set invite_code = excluded.invite_code
  returning id into v_couple_id;

  insert into profiles (id, couple_id, display_name, timezone)
  values (auth.uid(), v_couple_id, v_name, v_timezone)
  on conflict (id) do update set
    couple_id = excluded.couple_id,
    display_name = excluded.display_name,
    timezone = excluded.timezone
  returning profiles.id, profiles.couple_id, profiles.display_name, profiles.timezone
  into profile_id, couple_id, display_name, timezone;

  return next;
end;
$$;

revoke all on function join_couple(text, text, text) from public;
grant execute on function join_couple(text, text, text) to authenticated;

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

revoke all on function generate_pairing_code() from public;
revoke all on function create_pairing_code(text, text) from public;
revoke all on function join_pairing_code(text, text, text) from public;
revoke all on function get_pairing_status() from public;

grant execute on function create_pairing_code(text, text) to authenticated;
grant execute on function join_pairing_code(text, text, text) to authenticated;
grant execute on function get_pairing_status() to authenticated;

drop policy if exists couples_read_own on couples;
create policy couples_read_own on couples for select to authenticated
  using (id = my_couple_id());

drop policy if exists cat_read on categories;
create policy cat_read on categories for select to authenticated
  using (true);

drop policy if exists prof_read on profiles;
create policy prof_read on profiles for select to authenticated
  using (id = auth.uid() or couple_id = my_couple_id());

drop policy if exists prof_update on profiles;
create policy prof_update on profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists entries_read_own on entries;
create policy entries_read_own on entries for select to authenticated
  using (author_id = auth.uid());

drop policy if exists entries_insert_own on entries;
create policy entries_insert_own on entries for insert to authenticated
  with check (author_id = auth.uid() and couple_id = my_couple_id());

drop policy if exists guesses_read_own on guesses;
create policy guesses_read_own on guesses for select to authenticated
  using (guesser_id = auth.uid());

drop policy if exists guesses_insert_own on guesses;
create policy guesses_insert_own on guesses for insert to authenticated
  with check (guesser_id = auth.uid());

-- =========================================================
-- RPCS DEL JUEGO
-- =========================================================

create or replace function get_entries_to_guess(p_date date)
returns table (
  entry_id uuid,
  image_path text,
  already_guessed boolean,
  guessed_category_id smallint
)
language sql
security definer
set search_path = public
as $$
  select e.id,
         e.image_path,
         (g.id is not null) as already_guessed,
         g.guessed_category_id
  from entries e
  left join guesses g
    on g.entry_id = e.id and g.guesser_id = auth.uid()
  where e.couple_id = my_couple_id()
    and e.author_id <> auth.uid()
    and e.entry_date = p_date
  order by e.created_at;
$$;

create or replace function submit_guess(p_entry_id uuid, p_category_id smallint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_real smallint;
  v_correct boolean;
begin
  select category_id into v_real
  from entries
  where id = p_entry_id
    and couple_id = my_couple_id()
    and author_id <> auth.uid();

  if v_real is null then
    raise exception 'entrada inválida';
  end if;

  v_correct := (v_real = p_category_id);

  insert into guesses (entry_id, guesser_id, guessed_category_id, is_correct)
  values (p_entry_id, auth.uid(), p_category_id, v_correct)
  on conflict (entry_id, guesser_id) do nothing;

  return v_correct;
end;
$$;

create or replace function get_day_results(p_date date)
returns table (
  entry_id uuid,
  image_path text,
  caption text,
  real_category_id smallint,
  guessed_category_id smallint,
  is_correct boolean
)
language sql
security definer
set search_path = public
as $$
  select e.id,
         e.image_path,
         e.caption,
         e.category_id,
         g.guessed_category_id,
         g.is_correct
  from entries e
  join guesses g on g.entry_id = e.id and g.guesser_id = auth.uid()
  where e.couple_id = my_couple_id()
    and e.author_id <> auth.uid()
    and e.entry_date = p_date
    and (
      select count(*) from entries e2
      where e2.couple_id = my_couple_id()
        and e2.author_id <> auth.uid()
        and e2.entry_date = p_date
    ) = 5
    and (
      select count(*) from guesses g2
      join entries e2 on e2.id = g2.entry_id
      where g2.guesser_id = auth.uid()
        and e2.couple_id = my_couple_id()
        and e2.author_id <> auth.uid()
        and e2.entry_date = p_date
    ) = 5;
$$;

create or replace function get_day_status(p_date date)
returns table (
  my_uploads int,
  partner_uploads int,
  my_guesses int,
  partner_guesses int
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*)::int from entries e
      where e.couple_id = my_couple_id()
        and e.author_id = auth.uid()
        and e.entry_date = p_date),
    (select count(*)::int from entries e
      where e.couple_id = my_couple_id()
        and e.author_id <> auth.uid()
        and e.entry_date = p_date),
    (select count(*)::int from guesses g
      join entries e on e.id = g.entry_id
      where g.guesser_id = auth.uid()
        and e.entry_date = p_date),
    (select count(*)::int from guesses g
      join entries e on e.id = g.entry_id
      where g.guesser_id <> auth.uid()
        and e.couple_id = my_couple_id()
        and e.entry_date = p_date);
$$;

create or replace function get_calendar_month(p_start date, p_end date)
returns table (
  entry_date date,
  my_uploads int,
  partner_uploads int,
  my_guesses int,
  partner_guesses int
)
language sql
security definer
set search_path = public
as $$
  with days as (
    select generate_series(p_start, p_end, interval '1 day')::date as entry_date
  )
  select
    d.entry_date,
    (select count(*)::int from entries e
      where e.couple_id = my_couple_id()
        and e.author_id = auth.uid()
        and e.entry_date = d.entry_date) as my_uploads,
    (select count(*)::int from entries e
      where e.couple_id = my_couple_id()
        and e.author_id <> auth.uid()
        and e.entry_date = d.entry_date) as partner_uploads,
    (select count(*)::int from guesses g
      join entries e on e.id = g.entry_id
      where g.guesser_id = auth.uid()
        and e.couple_id = my_couple_id()
        and e.author_id <> auth.uid()
        and e.entry_date = d.entry_date) as my_guesses,
    (select count(*)::int from guesses g
      join entries e on e.id = g.entry_id
      where g.guesser_id <> auth.uid()
        and e.couple_id = my_couple_id()
        and e.author_id = auth.uid()
        and e.entry_date = d.entry_date) as partner_guesses
  from days d
  order by d.entry_date;
$$;

revoke all on function get_calendar_month(date, date) from public;
grant execute on function get_calendar_month(date, date) to authenticated;

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

create or replace function get_streak()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple uuid := my_couple_id();
  v_day date;
  v_min date;
  v_streak int := 0;
  v_ok boolean;
begin
  select max(entry_date), min(entry_date) into v_day, v_min
  from entries
  where couple_id = v_couple;

  if v_day is null then
    return 0;
  end if;

  loop
    select (
      (select count(distinct author_id) from entries
        where couple_id = v_couple and entry_date = v_day) = 2
      and
      (select count(*) from entries
        where couple_id = v_couple and entry_date = v_day) = 10
      and
      (select count(*) from guesses g
        join entries e on e.id = g.entry_id
        where e.couple_id = v_couple and e.entry_date = v_day) = 10
    ) into v_ok;

    if v_ok then
      v_streak := v_streak + 1;
      v_day := v_day - 1;
    elsif v_streak = 0 then
      v_day := v_day - 1;
    else
      exit;
    end if;

    exit when v_day < v_min;
  end loop;

  return v_streak;
end;
$$;

-- =========================================================
-- STORAGE PRIVADO
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists photos_read_own_couple on storage.objects;
create policy photos_read_own_couple on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = my_couple_id()::text
  );

drop policy if exists photos_insert_own_couple on storage.objects;
create policy photos_insert_own_couple on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = my_couple_id()::text
  );

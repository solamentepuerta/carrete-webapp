-- Fase 2 - Acceso MVP por codigo compartido.

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

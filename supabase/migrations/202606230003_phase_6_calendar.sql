-- Fase 6 - Resumen mensual sin exponer categorias reales.

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

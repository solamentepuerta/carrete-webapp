-- Fase 5 - No revelar resultados hasta adivinar las 5 entradas de la pareja.

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

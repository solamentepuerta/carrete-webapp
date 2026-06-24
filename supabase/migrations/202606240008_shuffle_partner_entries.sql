-- Show partner entries in a stable random order per user and day.

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
  order by md5(e.id::text || ':' || p_date::text || ':' || auth.uid()::text);
$$;

revoke all on function get_entries_to_guess(date) from public;
grant execute on function get_entries_to_guess(date) to authenticated;

import Link from "next/link";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  formatMonthLabel,
  getAdjacentMonthParam,
  getCalendarCells,
  getDateForTimezone,
  getMonthBounds,
  getMonthFromParam,
  weekdayLabels
} from "@/lib/dates";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CalendarSearchParams = {
  mes?: string | string[];
};

type CalendarDayRow = {
  entry_date: string;
  my_guesses: number;
  my_uploads: number;
  partner_guesses: number;
  partner_uploads: number;
};

const emptyDay: CalendarDayRow = {
  entry_date: "",
  my_guesses: 0,
  my_uploads: 0,
  partner_guesses: 0,
  partner_uploads: 0
};

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getDayState(day: CalendarDayRow) {
  const isComplete =
    day.my_uploads === 5 &&
    day.partner_uploads === 5 &&
    day.my_guesses === 5 &&
    day.partner_guesses === 5;
  const hasSomething =
    day.my_uploads +
      day.partner_uploads +
      day.my_guesses +
      day.partner_guesses >
    0;

  if (isComplete) {
    return {
      className: "calendar-day-complete",
      icon: "✅",
      label: "completo"
    };
  }

  if (hasSomething) {
    return {
      className: "calendar-day-partial",
      icon: "🟡",
      label: "a medias"
    };
  }

  return {
    className: "calendar-day-empty",
    icon: "⬜",
    label: "vacío"
  };
}

export default async function CalendarPage({
  searchParams
}: {
  searchParams?: Promise<CalendarSearchParams>;
}) {
  if (!hasSupabaseEnv()) {
    return (
      <main className="min-h-dvh px-4 py-5 text-ink">
        <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-md flex-col gap-5">
          <div className="window-shell w-full p-6 text-center">
            <p className="font-hand text-5xl text-lavender-deep">Carrete</p>
            <h1 className="mt-2 text-3xl font-bold">Calendario</h1>
            <p className="mt-4 font-bold">Faltan variables de Supabase.</p>
          </div>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,timezone")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/login");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const today = getDateForTimezone(profile.timezone || "UTC");
  const monthCursor = getMonthFromParam(
    getFirstParam(resolvedSearchParams.mes),
    today
  );
  const monthBounds = getMonthBounds(monthCursor);
  const { data, error } = await supabase.rpc("get_calendar_month", {
    p_end: monthBounds.end,
    p_start: monthBounds.start
  });
  const days = ((data ?? []) as CalendarDayRow[]).map(
    (day): [string, CalendarDayRow] => [day.entry_date, day]
  );
  const dayByDate = new Map<string, CalendarDayRow>(days);
  const cells = getCalendarCells(monthCursor, today);

  return (
    <main className="min-h-dvh px-4 py-5 text-ink">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-md flex-col gap-5">
        <div className="flex items-center justify-between">
          <Link className="soft-button w-fit px-5" href="/">
            Volver
          </Link>
          <ThemeToggle />
        </div>

        <header className="window-shell p-5 text-center">
          <p className="font-hand text-5xl text-lavender-deep">Carrete</p>
          <h1 className="mt-2 text-3xl font-bold">Calendario</h1>
        </header>

        <section className="window-shell calendar-shell">
          <div className="calendar-nav">
            <Link
              aria-label="Mes anterior"
              className="calendar-nav-button"
              href={`/calendario?mes=${getAdjacentMonthParam(monthCursor, -1)}`}
            >
              ‹
            </Link>
            <h2>{formatMonthLabel(monthCursor)}</h2>
            <Link
              aria-label="Mes siguiente"
              className="calendar-nav-button"
              href={`/calendario?mes=${getAdjacentMonthParam(monthCursor, 1)}`}
            >
              ›
            </Link>
          </div>

          <div className="calendar-weekdays">
            {weekdayLabels.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {cells.map((cell) => {
              const day = dayByDate.get(cell.date) ?? {
                ...emptyDay,
                entry_date: cell.date
              };
              const state = getDayState(day);

              return (
                <Link
                  aria-label={`${cell.date} ${state.label}`}
                  className={`calendar-day ${state.className} ${
                    cell.isCurrentMonth ? "" : "calendar-day-muted"
                  } ${cell.isToday ? "calendar-day-today" : ""}`}
                  href={`/dia/${cell.date}`}
                  key={cell.date}
                >
                  <span className="calendar-date">{cell.day}</span>
                  <span className="calendar-marker">{state.icon}</span>
                </Link>
              );
            })}
          </div>

          {error ? (
            <p className="auth-error mt-4">
              Falta ejecutar la migración de calendario en Supabase.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

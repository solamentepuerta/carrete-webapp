const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const monthPattern = /^\d{4}-\d{2}$/;

export const weekdayLabels = ["L", "M", "X", "J", "V", "S", "D"] as const;

export type MonthCursor = {
  month: number;
  year: number;
};

export type CalendarCell = {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function isIsoDate(value: string) {
  if (!isoDatePattern.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function getDateForTimezone(timezone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric"
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getMonthFromParam(
  monthParam: string | undefined,
  fallbackDate: string
): MonthCursor {
  const safeMonth =
    monthParam && monthPattern.test(monthParam) && isIsoDate(`${monthParam}-01`)
      ? monthParam
      : fallbackDate.slice(0, 7);
  const [year, month] = safeMonth.split("-").map(Number);

  return { month, year };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getMonthBounds({ month, year }: MonthCursor) {
  return {
    end: toIsoDate(year, month, getDaysInMonth(year, month)),
    start: toIsoDate(year, month, 1)
  };
}

export function getAdjacentMonthParam(
  { month, year }: MonthCursor,
  delta: number
) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

export function getCalendarCells(
  { month, year }: MonthCursor,
  today: string
): CalendarCell[] {
  const cells: CalendarCell[] = [];
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const leadingDays = (firstDay + 6) % 7;
  const previousMonth = new Date(Date.UTC(year, month - 2, 1));
  const previousYear = previousMonth.getUTCFullYear();
  const previousMonthNumber = previousMonth.getUTCMonth() + 1;
  const previousMonthDays = getDaysInMonth(previousYear, previousMonthNumber);
  const currentMonthDays = getDaysInMonth(year, month);

  for (let index = leadingDays - 1; index >= 0; index -= 1) {
    const day = previousMonthDays - index;
    const date = toIsoDate(previousYear, previousMonthNumber, day);
    cells.push({ date, day, isCurrentMonth: false, isToday: date === today });
  }

  for (let day = 1; day <= currentMonthDays; day += 1) {
    const date = toIsoDate(year, month, day);
    cells.push({ date, day, isCurrentMonth: true, isToday: date === today });
  }

  const nextMonth = new Date(Date.UTC(year, month, 1));
  const nextYear = nextMonth.getUTCFullYear();
  const nextMonthNumber = nextMonth.getUTCMonth() + 1;
  let nextDay = 1;

  while (cells.length < 42) {
    const date = toIsoDate(nextYear, nextMonthNumber, nextDay);
    cells.push({
      date,
      day: nextDay,
      isCurrentMonth: false,
      isToday: date === today
    });
    nextDay += 1;
  }

  return cells;
}

export function formatMonthLabel({ month, year }: MonthCursor) {
  const label = new Intl.DateTimeFormat("es", {
    month: "long",
    timeZone: "UTC",
    year: "numeric"
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatLongDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

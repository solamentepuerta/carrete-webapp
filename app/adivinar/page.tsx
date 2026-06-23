import Link from "next/link";
import { redirect } from "next/navigation";
import { GuessBoard, type DayResult, type GuessEntry } from "@/components/GuessBoard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EntryToGuessRow = {
  already_guessed: boolean;
  entry_id: string;
  guessed_category_id: number | null;
  image_path: string;
};

type DayResultRow = {
  entry_id: string;
  guessed_category_id: number;
  is_correct: boolean;
  real_category_id: number;
};

function getDateForTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric"
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default async function GuessPage() {
  if (!hasSupabaseEnv()) {
    return (
      <main className="min-h-dvh px-4 py-5 text-ink">
        <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-md flex-col gap-5">
          <div className="window-shell w-full p-6 text-center">
            <p className="font-hand text-5xl text-lavender-deep">Carrete</p>
            <h1 className="mt-2 text-3xl font-bold">Adivinar</h1>
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

  const logicalDate = getDateForTimezone(profile.timezone || "UTC");
  const { data } = await supabase.rpc("get_entries_to_guess", {
    p_date: logicalDate
  });
  const entriesWithoutUrls = (data ?? []) as EntryToGuessRow[];
  const entries: GuessEntry[] = await Promise.all(
    entriesWithoutUrls.map(async (entry) => {
      const { data: signed } = await supabase.storage
        .from("photos")
        .createSignedUrl(entry.image_path, 60 * 60);

      return {
        already_guessed: entry.already_guessed,
        entry_id: entry.entry_id,
        guessed_category_id: entry.guessed_category_id,
        image_url: signed?.signedUrl ?? ""
      };
    })
  );
  let initialResults: DayResult[] = [];

  if (entries.length === 5 && entries.every((entry) => entry.already_guessed)) {
    const { data: results } = await supabase.rpc("get_day_results", {
      p_date: logicalDate
    });

    initialResults = ((results ?? []) as DayResultRow[]).map((result) => ({
      entry_id: result.entry_id,
      guessed_category_id: result.guessed_category_id,
      is_correct: result.is_correct,
      real_category_id: result.real_category_id
    }));
  }

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
          <h1 className="mt-2 text-3xl font-bold">Adivinar</h1>
        </header>

        <GuessBoard
          entries={entries}
          initialResults={initialResults}
          logicalDate={logicalDate}
        />
      </div>
    </main>
  );
}

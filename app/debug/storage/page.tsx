import Link from "next/link";
import { redirect } from "next/navigation";
import {
  StorageDebugPanel,
  type StorageDebugRow
} from "@/app/debug/storage/StorageDebugPanel";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProfileRow = {
  couple_id: string | null;
  display_name: string;
  id: string;
  timezone: string;
};

type EntryToGuessRow = {
  already_guessed: boolean;
  entry_id: string;
  guessed_category_id: number | null;
  image_path: string;
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" && message
      ? message
      : "Error desconocido.";
  }

  return "Error desconocido.";
}

export default async function StorageDebugPage() {
  if (!hasSupabaseEnv()) {
    return (
      <main className="min-h-dvh px-4 py-6 text-ink">
        <section className="window-shell mx-auto max-w-md p-5">
          <p className="font-hand text-5xl text-lavender-deep">Carrete</p>
          <h1 className="mt-2 text-2xl font-black">Debug Storage</h1>
          <p className="auth-error mt-4">
            Faltan las variables públicas de Supabase.
          </p>
        </section>
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

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id,couple_id,display_name,timezone")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileData as ProfileRow | null;
  const logicalDate = getDateForTimezone(profile?.timezone || "UTC");
  let rows: StorageDebugRow[] = [];
  let entriesError: string | null = null;

  if (!profileError && profile?.couple_id) {
    const { data: entriesToGuess, error } = await supabase.rpc(
      "get_entries_to_guess",
      { p_date: logicalDate }
    );

    if (error) {
      entriesError = getErrorMessage(error);
    } else {
      rows = await Promise.all(
        ((entriesToGuess ?? []) as EntryToGuessRow[]).map(async (entry) => {
          const { data: signed, error: signedError } = await supabase.storage
            .from("photos")
            .createSignedUrl(entry.image_path, 60 * 60);

          return {
            alreadyGuessed: entry.already_guessed,
            entryId: entry.entry_id,
            guessedCategoryId: entry.guessed_category_id,
            imagePath: entry.image_path,
            signedUrl: signed?.signedUrl ?? null,
            signedUrlError: signedError ? getErrorMessage(signedError) : null
          };
        })
      );
    }
  }

  return (
    <main className="min-h-dvh px-4 py-6 text-ink">
      <div className="mx-auto grid w-full max-w-md gap-5">
        <header className="window-shell p-5">
          <Link className="soft-button w-fit px-5" href="/">
            Volver
          </Link>
          <p className="mt-5 font-hand text-5xl leading-none text-lavender-deep">
            Carrete
          </p>
          <h1 className="mt-2 text-2xl font-black">Debug Storage</h1>
          <div className="mt-4 grid gap-2 text-sm font-bold">
            <p>Usuario: {user.email ?? user.id}</p>
            <p>Fecha local: {logicalDate}</p>
            <p>Pareja: {profile?.couple_id ?? "sin pareja"}</p>
            <p>Entradas de pareja: {rows.length}</p>
          </div>
        </header>

        {profileError ? (
          <p className="auth-error">{getErrorMessage(profileError)}</p>
        ) : null}

        {!profile?.couple_id ? (
          <p className="auth-error">
            Este usuario todavía no está emparejado.
          </p>
        ) : null}

        {entriesError ? <p className="auth-error">{entriesError}</p> : null}

        <StorageDebugPanel rows={rows} />
      </div>
    </main>
  );
}

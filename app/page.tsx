import Link from "next/link";
import { redirect } from "next/navigation";
import { CarreteBoard } from "@/components/CarreteBoard";
import { CelebrationBurst } from "@/components/CelebrationBurst";
import { HeaderBadge } from "@/components/HeaderBadge";
import { type OwnBoardCard } from "@/components/MineCarrete";
import { PairingPanel } from "@/components/PairingPanel";
import {
  type PartnerEntry,
  type PartnerResult
} from "@/components/PartnerCarrete";
import { StreakBadge } from "@/components/StreakBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { categories } from "@/lib/categories";
import { getDateForTimezone } from "@/lib/dates";
import { imagePathToPhotoUrl } from "@/lib/photo-url";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/calendario", label: "Calendario" },
  { href: "/ajustes", label: "Ajustes" }
];

type EntryRow = {
  caption: string | null;
  category_id: number;
  id: string;
  image_path: string;
};

type DayStatus = {
  my_guesses: number;
  my_uploads: number;
  partner_guesses: number;
  partner_uploads: number;
};

type ProfileRow = {
  couple_id: string | null;
  display_name: string;
  id: string;
  timezone: string;
};

type PairingStatus = {
  couple_id: string | null;
  invite_code: string | null;
  is_paired: boolean;
  member_count: number;
};

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

const emptyStatus: DayStatus = {
  my_guesses: 0,
  my_uploads: 0,
  partner_guesses: 0,
  partner_uploads: 0
};

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

export default async function HomePage() {
  let celebrationKey = "sin-fecha";
  let dayComplete = false;
  let entriesError = "";
  let logicalDate = "";
  let pairingStatus: PairingStatus | null = null;
  let profile: ProfileRow | null = null;
  let streak = 0;
  let dayStatus = emptyStatus;
  let ownCards: OwnBoardCard[] = categories.map((category) => ({
    category,
    imageSrc: category.imageSrc,
    isUploaded: false
  }));
  let partnerEntries: PartnerEntry[] = [];
  let initialResults: PartnerResult[] = [];
  let isGameReady = false;

  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id,couple_id,display_name,timezone")
      .eq("id", user.id)
      .maybeSingle();

    profile = (profileData as ProfileRow | null) ?? null;

    const { data: pairingData } = await supabase
      .rpc("get_pairing_status")
      .maybeSingle();
    pairingStatus = (pairingData as PairingStatus | null) ?? null;
    isGameReady = Boolean(profile?.couple_id && pairingStatus?.is_paired);

    if (isGameReady && profile?.couple_id) {
      const today = getDateForTimezone(profile.timezone || "UTC");
      logicalDate = today;
      celebrationKey = today;

      const [
        { data: entries },
        { data: status },
        { data: streakData },
        { data: entriesToGuess, error: entriesToGuessError }
      ] = await Promise.all([
        supabase
          .from("entries")
          .select("id,category_id,image_path,caption")
          .eq("author_id", user.id)
          .eq("entry_date", today),
        supabase.rpc("get_day_status", { p_date: today }).maybeSingle(),
        supabase.rpc("get_streak").single(),
        supabase.rpc("get_entries_to_guess", { p_date: today })
      ]);

      const ownEntries = (entries ?? []) as EntryRow[];
      dayStatus = (status as DayStatus | null) ?? emptyStatus;
      streak = Number(streakData ?? 0);
      dayComplete =
        dayStatus.my_uploads === 5 &&
        dayStatus.partner_uploads === 5 &&
        dayStatus.my_guesses === 5 &&
        dayStatus.partner_guesses === 5;

      ownCards = categories.map((category) => {
        const entry = ownEntries.find((item) => item.category_id === category.id);

        return {
          category,
          imageSrc: entry ? imagePathToPhotoUrl(entry.image_path) : category.imageSrc,
          isUploaded: Boolean(entry)
        };
      });

      if (entriesToGuessError) {
        entriesError = getErrorMessage(entriesToGuessError);
      } else {
        const partnerRows = (entriesToGuess ?? []) as EntryToGuessRow[];
        partnerEntries = await Promise.all(
          partnerRows.map(async (entry) => {
            const { data: signed, error: signedError } = await supabase.storage
              .from("photos")
              .createSignedUrl(entry.image_path, 60 * 60);

            return {
              already_guessed: entry.already_guessed,
              entry_id: entry.entry_id,
              guessed_category_id: entry.guessed_category_id,
              image_path: entry.image_path,
              image_url: signed?.signedUrl ?? null,
              signed_url_error: signedError ? getErrorMessage(signedError) : null
            };
          })
        );
      }

      if (
        partnerEntries.length === 5 &&
        partnerEntries.every((entry) => entry.already_guessed)
      ) {
        const { data: results } = await supabase.rpc("get_day_results", {
          p_date: today
        });

        initialResults = ((results ?? []) as DayResultRow[]).map((result) => ({
          entry_id: result.entry_id,
          guessed_category_id: result.guessed_category_id,
          is_correct: result.is_correct,
          real_category_id: result.real_category_id
        }));
      }
    }
  }

  return (
    <main className="min-h-dvh overflow-hidden px-4 py-5 text-ink">
      <div className="kawaii-sky" aria-hidden="true">
        <span className="sparkle sparkle-one">✦</span>
        <span className="sparkle sparkle-two">♡</span>
        <span className="sparkle sparkle-three">✧</span>
      </div>
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col gap-5">
        <header className="window-shell">
          <div className="window-bar">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.28em]">
              day dreams
            </p>
            <span className="w-[2.2rem]" />
          </div>

          <div className="flex items-start justify-between gap-4 p-4">
            <div>
              <p className="font-hand text-5xl leading-none text-lavender-deep">
                Carrete
              </p>
              <h1 className="mt-1 text-2xl font-bold leading-tight">
                El corcho de hoy
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {isGameReady ? (
                <StreakBadge isCelebrating={dayComplete} value={streak} />
              ) : (
                <HeaderBadge />
              )}
            </div>
          </div>
        </header>

        {isGameReady ? (
          <CelebrationBurst
            celebrationKey={`home-${celebrationKey}-${streak}`}
            enabled={dayComplete}
          />
        ) : null}

        {isGameReady && profile?.couple_id ? (
          <>
            {entriesError ? <p className="auth-error">{entriesError}</p> : null}
            <CarreteBoard
              initialOwnCards={ownCards}
              initialPartnerEntries={partnerEntries}
              initialResults={initialResults}
              logicalDate={logicalDate}
              profile={{
                couple_id: profile.couple_id,
                id: profile.id,
                timezone: profile.timezone
              }}
            />
          </>
        ) : (
          <PairingPanel initialStatus={pairingStatus} />
        )}

        {isGameReady ? (
          <section className="grid grid-cols-2 gap-3">
            <StatusCard
              label="Tus fotos"
              value={`${dayStatus.my_uploads}/5`}
              tone="violet"
            />
            <StatusCard
              label="Sus fotos"
              value={`${dayStatus.partner_uploads}/5`}
              tone="cloud"
            />
            <StatusCard
              label="Tus pistas"
              value={`${dayStatus.my_guesses}/5`}
              tone="pink"
            />
            <StatusCard
              label="Sus pistas"
              value={`${dayStatus.partner_guesses}/5`}
              tone="mint"
            />
          </section>
        ) : null}

        <nav className="mt-auto grid grid-cols-2 gap-3 pb-1">
          {navItems.map((item) => (
            <Link className="soft-button" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}

function StatusCard({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "violet" | "cloud" | "pink" | "mint";
}) {
  const toneClass = {
    violet: "status-violet",
    cloud: "status-cloud",
    pink: "status-pink",
    mint: "status-mint"
  }[tone];

  return (
    <div className={`${toneClass} pixel-card px-4 py-3`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DayPhotoCard } from "./DayPhotoCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { categories, type Category } from "@/lib/categories";
import { formatLongDate, isIsoDate } from "@/lib/dates";
import { imagePathToPhotoUrl } from "@/lib/photo-url";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DayStatus = {
  my_guesses: number;
  my_uploads: number;
  partner_guesses: number;
  partner_uploads: number;
};

type OwnEntryRow = {
  caption: string | null;
  category_id: number;
  id: string;
  image_path: string;
};

type DayResultRow = {
  caption: string | null;
  entry_id: string;
  guessed_category_id: number;
  image_path: string;
  is_correct: boolean;
  real_category_id: number;
};

type EntryToGuessRow = {
  already_guessed: boolean;
  entry_id: string;
  guessed_category_id: number | null;
  image_path: string;
};

type ReadCard = {
  caption?: string | null;
  category: Category;
  footer?: string;
  imageSrc: string;
  isEmpty?: boolean;
  resultTone?: "correct" | "miss";
};

/** Pre-processed partner card for unrevealed entries (no category_id exposed). */
type UnrevealedPartnerCard = {
  categoryEmoji: string;
  categoryLabel: string;
  entryId: string;
  imageSrc: string;
};

const emptyStatus: DayStatus = {
  my_guesses: 0,
  my_uploads: 0,
  partner_guesses: 0,
  partner_uploads: 0
};

function getCategory(categoryId: number) {
  return categories.find((category) => category.id === categoryId);
}

function isReadCard(card: ReadCard | null): card is ReadCard {
  return card !== null;
}

export default async function DayPage({
  params
}: {
  params: Promise<{ fecha: string }>;
}) {
  const { fecha } = await params;

  if (!isIsoDate(fecha)) {
    notFound();
  }

  if (!hasSupabaseEnv()) {
    return (
      <main className="min-h-dvh px-4 py-5 text-ink">
        <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-md flex-col gap-5">
          <div className="window-shell w-full p-6 text-center">
            <p className="font-hand text-5xl text-lavender-deep">Carrete</p>
            <h1 className="mt-2 text-3xl font-bold">Día</h1>
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
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/login");
  }

  const [
    { data: ownEntriesData },
    { data: statusData },
    { data: resultData },
    { data: entriesToGuessData }
  ] = await Promise.all([
    supabase
      .from("entries")
      .select("id,category_id,image_path,caption")
      .eq("author_id", user.id)
      .eq("entry_date", fecha),
    supabase.rpc("get_day_status", { p_date: fecha }).maybeSingle(),
    supabase.rpc("get_day_results", { p_date: fecha }),
    supabase.rpc("get_entries_to_guess", { p_date: fecha })
  ]);
  const ownEntries = (ownEntriesData ?? []) as OwnEntryRow[];
  const results = (resultData ?? []) as DayResultRow[];
  const entriesToGuess = (entriesToGuessData ?? []) as EntryToGuessRow[];
  const status = (statusData as DayStatus | null) ?? emptyStatus;
  const ownCards: ReadCard[] = categories.map((category) => {
    const entry = ownEntries.find((item) => item.category_id === category.id);

    return {
      caption: entry?.caption,
      category,
      imageSrc: entry ? imagePathToPhotoUrl(entry.image_path) : category.imageSrc,
      isEmpty: !entry
    };
  });

  // --- Revealed partner cards (only available after all 5 guesses) ---
  const isFullyRevealed = results.length === 5;

  // Generate signed URLs for partner photos (both revealed and unrevealed).
  // Partner photos live in private Storage; /api/photos only serves the author's
  // own uploads, so we must use signed URLs for partner entries.
  const partnerSignedUrls = new Map<string, string>();
  const imagePaths = isFullyRevealed
    ? results.map((r) => ({ id: r.entry_id, path: r.image_path }))
    : entriesToGuess.map((e) => ({ id: e.entry_id, path: e.image_path }));

  await Promise.all(
    imagePaths.map(async ({ id, path }) => {
      const { data: signed } = await supabase.storage
        .from("photos")
        .createSignedUrl(path, 3600);
      if (signed?.signedUrl) {
        partnerSignedUrls.set(id, signed.signedUrl);
      }
    })
  );

  const partnerCards: ReadCard[] = results
    .map((result): ReadCard | null => {
      const realCategory = getCategory(result.real_category_id);
      const guessedCategory = getCategory(result.guessed_category_id);

      if (!realCategory) {
        return null;
      }

      return {
        caption: result.caption,
        category: realCategory,
        footer: guessedCategory
          ? `Tu pista: ${guessedCategory.label}`
          : "Tu pista quedó guardada",
        imageSrc:
          partnerSignedUrls.get(result.entry_id) ??
          imagePathToPhotoUrl(result.image_path),
        resultTone: result.is_correct ? "correct" : "miss"
      };
    })
    .filter(isReadCard)
    .sort((a, b) => a.category.id - b.category.id);

  // --- Unrevealed partner cards (visible before all guesses are in) ---
  const unrevealedPartnerCards: UnrevealedPartnerCard[] = entriesToGuess.map(
    (entry) => {
      const guessedCat = entry.guessed_category_id
        ? getCategory(entry.guessed_category_id)
        : null;

      return {
        categoryEmoji: entry.already_guessed && guessedCat ? guessedCat.emoji : "🔒",
        categoryLabel:
          entry.already_guessed && guessedCat
            ? `Tu pista: ${guessedCat.label}`
            : "Sin revelar",
        entryId: entry.entry_id,
        imageSrc: partnerSignedUrls.get(entry.entry_id) ?? ""
      };
    }
  );

  return (
    <main className="min-h-dvh px-4 py-5 text-ink">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-md flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <Link className="soft-button w-fit px-5" href="/calendario">
            Volver
          </Link>
          <ThemeToggle />
        </div>

        <header className="window-shell p-5 text-center">
          <p className="font-hand text-5xl text-lavender-deep">Carrete</p>
          <h1 className="mt-2 text-3xl font-bold">{formatLongDate(fecha)}</h1>
        </header>

        <section className="grid grid-cols-2 gap-3">
          <StatusCard label="Tus fotos" value={`${status.my_uploads}/5`} />
          <StatusCard
            label="Sus fotos"
            value={`${status.partner_uploads}/5`}
          />
          <StatusCard label="Tus pistas" value={`${status.my_guesses}/5`} />
          <StatusCard
            label="Sus pistas"
            value={`${status.partner_guesses}/5`}
          />
        </section>

        <section className="window-shell day-read-shell">
          <h2 className="section-title">Tus fotos</h2>
          <div className="read-grid">
            {ownCards.map((card, index) => (
              <DayPhotoCard
                caption={card.caption}
                categoryEmoji={card.category.emoji}
                categoryLabel={card.category.label}
                footer={card.footer}
                imageSrc={card.imageSrc}
                isEmpty={card.isEmpty}
                key={card.category.key}
                resultTone={card.resultTone}
                rotation={[-2, 2, -1, 3, -3][index] ?? 0}
              />
            ))}
          </div>
        </section>

        <section className="window-shell day-read-shell">
          <h2 className="section-title">Sus fotos</h2>
          {isFullyRevealed ? (
            /* All 5 guesses submitted — show revealed cards with real categories */
            <div className="read-grid">
              {partnerCards.map((card, index) => (
                <DayPhotoCard
                  caption={card.caption}
                  categoryEmoji={card.category.emoji}
                  categoryLabel={card.category.label}
                  footer={card.footer}
                  imageSrc={card.imageSrc}
                  key={card.category.key}
                  resultTone={card.resultTone}
                  rotation={[-2, 2, -1, 3, -3][index] ?? 0}
                />
              ))}
            </div>
          ) : unrevealedPartnerCards.length > 0 ? (
            /* Partner has uploaded but not all guesses done — show photos without real category */
            <div className="read-grid">
              {unrevealedPartnerCards.map((card, index) => (
                <DayPhotoCard
                  categoryEmoji={card.categoryEmoji}
                  categoryLabel={card.categoryLabel}
                  imageSrc={card.imageSrc}
                  key={card.entryId}
                  rotation={[-2, 2, -1, 3, -3][index] ?? 0}
                />
              ))}
            </div>
          ) : (
            /* Partner hasn't uploaded any photos yet */
            <div className="locked-panel">
              <p className="font-hand text-4xl text-lavender-deep">
                Aún sin fotos
              </p>
              <p className="mt-2 font-bold">
                Tu pareja aún no ha subido fotos.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="pixel-card px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}


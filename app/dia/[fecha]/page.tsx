import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { CSSProperties } from "react";
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

type ReadCard = {
  caption?: string | null;
  category: Category;
  footer?: string;
  imageSrc: string;
  isEmpty?: boolean;
  resultTone?: "correct" | "miss";
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

  const [{ data: ownEntriesData }, { data: statusData }, { data: resultData }] =
    await Promise.all([
      supabase
        .from("entries")
        .select("id,category_id,image_path,caption")
        .eq("author_id", user.id)
        .eq("entry_date", fecha),
      supabase.rpc("get_day_status", { p_date: fecha }).maybeSingle(),
      supabase.rpc("get_day_results", { p_date: fecha })
    ]);
  const ownEntries = (ownEntriesData ?? []) as OwnEntryRow[];
  const results = (resultData ?? []) as DayResultRow[];
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
        imageSrc: imagePathToPhotoUrl(result.image_path),
        resultTone: result.is_correct ? "correct" : "miss"
      };
    })
    .filter(isReadCard)
    .sort((a, b) => a.category.id - b.category.id);

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
              <ReadOnlyPolaroid card={card} index={index} key={card.category.key} />
            ))}
          </div>
        </section>

        <section className="window-shell day-read-shell">
          <h2 className="section-title">Sus fotos reveladas</h2>
          {partnerCards.length === 5 ? (
            <div className="read-grid">
              {partnerCards.map((card, index) => (
                <ReadOnlyPolaroid
                  card={card}
                  index={index}
                  key={card.category.key}
                />
              ))}
            </div>
          ) : (
            <div className="locked-panel">
              <p className="font-hand text-4xl text-lavender-deep">
                Aún no revelado
              </p>
              <p className="mt-2 font-bold">
                Las etiquetas reales aparecen cuando ya guardaste las 5 pistas.
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

function ReadOnlyPolaroid({
  card,
  index
}: {
  card: ReadCard;
  index: number;
}) {
  const rotation = [-2, 2, -1, 3, -3][index] ?? 0;

  return (
    <article
      className={`read-polaroid ${card.isEmpty ? "read-polaroid-empty" : ""}`}
      style={{ "--rotate": `${rotation}deg` } as CSSProperties}
    >
      <div
        className="read-photo"
        style={{ backgroundImage: `url(${card.imageSrc})` }}
      >
        <span className="washi-tape" aria-hidden="true" />
      </div>
      <div className="read-caption">
        <p className="font-bold">
          {card.category.emoji} {card.category.label}
        </p>
        {card.caption ? <p className="mt-1 text-sm">{card.caption}</p> : null}
        {card.footer ? (
          <p className={`read-result read-result-${card.resultTone}`}>
            {card.resultTone === "correct" ? "Bien" : "Casi"} · {card.footer}
          </p>
        ) : null}
      </div>
    </article>
  );
}

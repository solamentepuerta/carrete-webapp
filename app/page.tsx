import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { CelebrationBurst } from "@/components/CelebrationBurst";
import { StreakBadge } from "@/components/StreakBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { categories, type Category } from "@/lib/categories";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/subir", label: "Subir" },
  { href: "/adivinar", label: "Adivinar" },
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

type BoardCard = {
  category: Category;
  imageSrc: string;
  isUploaded: boolean;
};

const emptyStatus: DayStatus = {
  my_guesses: 0,
  my_uploads: 0,
  partner_guesses: 0,
  partner_uploads: 0
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

export default async function HomePage() {
  let celebrationKey = "sin-fecha";
  let dayComplete = false;
  let streak = 0;
  let dayStatus = emptyStatus;
  let boardCards: BoardCard[] = categories.map((category) => ({
    category,
    imageSrc: category.imageSrc,
    isUploaded: false
  }));

  if (hasSupabaseEnv()) {
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

    const today = getDateForTimezone(profile.timezone || "UTC");
    const [{ data: entries }, { data: status }, { data: streakData }] =
      await Promise.all([
        supabase
          .from("entries")
          .select("id,category_id,image_path,caption")
          .eq("author_id", user.id)
          .eq("entry_date", today),
        supabase.rpc("get_day_status", { p_date: today }).maybeSingle(),
        supabase.rpc("get_streak").single()
      ]);
    const ownEntries = (entries ?? []) as EntryRow[];
    const signedUrls = new Map<string, string>();

    await Promise.all(
      ownEntries.map(async (entry) => {
        const { data } = await supabase.storage
          .from("photos")
          .createSignedUrl(entry.image_path, 60 * 60);

        if (data?.signedUrl) {
          signedUrls.set(entry.image_path, data.signedUrl);
        }
      })
    );

    dayStatus = (status as DayStatus | null) ?? emptyStatus;
    streak = Number(streakData ?? 0);
    celebrationKey = today;
    dayComplete =
      dayStatus.my_uploads === 5 &&
      dayStatus.partner_uploads === 5 &&
      dayStatus.my_guesses === 5 &&
      dayStatus.partner_guesses === 5;
    boardCards = categories.map((category) => {
      const entry = ownEntries.find((item) => item.category_id === category.id);

      return {
        category,
        imageSrc: entry
          ? signedUrls.get(entry.image_path) ?? category.imageSrc
          : category.imageSrc,
        isUploaded: Boolean(entry)
      };
    });
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
            <ThemeToggle />
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
            <StreakBadge isCelebrating={dayComplete} value={streak} />
          </div>
        </header>

        <CelebrationBurst
          celebrationKey={`home-${celebrationKey}-${streak}`}
          enabled={dayComplete}
        />

        <section className="window-shell p-3">
          <div className="corkboard grid grid-cols-2 gap-3 rounded-2xl p-3">
            {boardCards.map((card, index) => (
              <article
                className="polaroid aspect-[3/4] rotate-[var(--rotate)] p-2"
                key={card.category.key}
                style={
                  {
                    "--rotate": `${[-3, 2, -1, 4, -4][index]}deg`
                  } as CSSProperties
                }
              >
                <div
                  className={`polaroid-photo relative h-full overflow-hidden rounded-xl ${
                    card.isUploaded ? "polaroid-photo-real" : ""
                  }`}
                  style={{ backgroundImage: `url(${card.imageSrc})` }}
                >
                  <span className="washi-tape" aria-hidden="true" />
                  <span className="corner-sparkle" aria-hidden="true">
                    ✧
                  </span>
                  <p className="category-card-label px-3 text-center text-base font-bold leading-snug">
                    {card.category.label}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

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

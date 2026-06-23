import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { categories } from "@/lib/categories";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/subir", label: "Subir" },
  { href: "/adivinar", label: "Adivinar" },
  { href: "/calendario", label: "Calendario" },
  { href: "/ajustes", label: "Ajustes" }
];

export default async function HomePage() {
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
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      redirect("/login");
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
            <div className="streak-card pixel-card px-3 py-2">
              <p className="text-center text-xs font-semibold uppercase tracking-wide text-ink/60">
                Racha
              </p>
              <p className="text-center font-hand text-4xl leading-none text-blush-deep">
                0
              </p>
            </div>
          </div>
        </header>

        <section className="window-shell p-3">
          <div className="corkboard grid grid-cols-2 gap-3 rounded-2xl p-3">
            {categories.map((category, index) => (
              <article
                className="polaroid aspect-[3/4] rotate-[var(--rotate)] p-2"
                key={category.key}
                style={
                  {
                    "--rotate": `${[-3, 2, -1, 4, -4][index]}deg`
                  } as CSSProperties
                }
              >
                <div className="polaroid-photo relative h-full overflow-hidden rounded-xl">
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="(max-width: 480px) 45vw, 190px"
                    src={category.imageSrc}
                  />
                  <span className="washi-tape" aria-hidden="true" />
                  <span className="corner-sparkle" aria-hidden="true">
                    ✧
                  </span>
                  <p className="category-card-label px-3 text-center text-base font-bold leading-snug">
                    {category.label}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <StatusCard label="Tus fotos" value="0/5" tone="violet" />
          <StatusCard label="Sus fotos" value="0/5" tone="cloud" />
          <StatusCard label="Tus pistas" value="0/5" tone="pink" />
          <StatusCard label="Sus pistas" value="0/5" tone="mint" />
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

import Link from "next/link";
import type { CSSProperties } from "react";
import { categories } from "@/lib/categories";

const navItems = [
  { href: "/subir", label: "Subir" },
  { href: "/adivinar", label: "Adivinar" },
  { href: "/calendario", label: "Calendario" },
  { href: "/ajustes", label: "Ajustes" }
];

export default function HomePage() {
  return (
    <main className="min-h-dvh overflow-hidden px-4 py-5 text-ink">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col gap-5">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="font-hand text-3xl text-lavender-deep">Carrete</p>
            <h1 className="mt-1 text-2xl font-bold leading-tight">
              El corcho de hoy
            </h1>
          </div>
          <div className="rounded-2xl bg-cream/80 px-3 py-2 text-right shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
              Racha
            </p>
            <p className="font-hand text-3xl leading-none text-blush-deep">0</p>
          </div>
        </header>

        <section className="rounded-2xl border border-white/80 bg-cream/75 p-3 shadow-soft">
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
                <div className="relative h-full rounded-xl bg-lilac-soft/70">
                  <span className="washi-tape" aria-hidden="true" />
                  <div className="flex h-full items-center justify-center px-3 text-center">
                    <div>
                      <p className="text-3xl" aria-hidden="true">
                        {category.emoji}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-snug">
                        {category.label}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <StatusCard label="Tus fotos" value="0/5" tone="lavender" />
          <StatusCard label="Sus fotos" value="0/5" tone="sage" />
          <StatusCard label="Tus pistas" value="0/5" tone="blush" />
          <StatusCard label="Sus pistas" value="0/5" tone="cream" />
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
  tone: "lavender" | "sage" | "blush" | "cream";
}) {
  const toneClass = {
    lavender: "bg-lilac-soft",
    sage: "bg-sage",
    blush: "bg-blush",
    cream: "bg-cream"
  }[tone];

  return (
    <div className={`${toneClass} rounded-2xl px-4 py-3 shadow-soft`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

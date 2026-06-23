import Link from "next/link";

export function PhasePage({ title }: { title: string }) {
  return (
    <main className="min-h-dvh px-4 py-5 text-ink">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-md flex-col gap-5">
        <Link className="soft-button w-fit px-5" href="/">
          Volver
        </Link>
        <section className="flex flex-1 items-center">
          <div className="w-full rounded-2xl bg-cream/80 p-6 text-center shadow-soft">
            <p className="font-hand text-5xl text-lavender-deep">Carrete</p>
            <h1 className="mt-2 text-3xl font-bold">{title}</h1>
          </div>
        </section>
      </div>
    </main>
  );
}

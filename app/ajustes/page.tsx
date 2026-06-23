import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function SettingsPage() {
  return (
    <main className="min-h-dvh px-4 py-5 text-ink">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-md flex-col gap-5">
        <div className="flex items-center justify-between">
          <Link className="soft-button w-fit px-5" href="/">
            Volver
          </Link>
          <ThemeToggle />
        </div>

        <section className="flex flex-1 items-center">
          <div className="window-shell w-full p-6 text-center">
            <p className="font-hand text-5xl text-lavender-deep">Carrete</p>
            <h1 className="mt-2 text-3xl font-bold">Ajustes</h1>
            <div className="mt-6">
              <SignOutButton />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

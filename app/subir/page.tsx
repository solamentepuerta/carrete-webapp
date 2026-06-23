import Link from "next/link";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UploadForm } from "@/components/UploadForm";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  if (!hasSupabaseEnv()) {
    return (
      <main className="min-h-dvh px-4 py-5 text-ink">
        <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-md flex-col gap-5">
          <div className="window-shell w-full p-6 text-center">
            <p className="font-hand text-5xl text-lavender-deep">Carrete</p>
            <h1 className="mt-2 text-3xl font-bold">Subir</h1>
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
    .select("id,couple_id,timezone")
    .eq("id", user.id)
    .single();

  if (!profile?.couple_id) {
    redirect("/login");
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
          <h1 className="mt-2 text-3xl font-bold">Subir fotos</h1>
        </header>

        <UploadForm
          profile={{
            couple_id: profile.couple_id,
            id: profile.id,
            timezone: profile.timezone
          }}
        />
      </div>
    </main>
  );
}

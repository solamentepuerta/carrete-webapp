import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/");
    }
  }

  return (
    <main className="min-h-dvh px-4 py-5 text-ink">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-md flex-col gap-5">
        <div className="flex items-center justify-end">
          <ThemeToggle />
        </div>

        <section className="flex flex-1 items-center">
          <div className="window-shell w-full p-6">
            <p className="text-center font-hand text-5xl text-lavender-deep">
              Carrete
            </p>
            <h1 className="mt-2 text-center text-3xl font-bold">Entrar</h1>
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}

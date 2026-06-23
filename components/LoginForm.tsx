"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function getLocalTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "No se pudo entrar a Carrete.";
}

export function LoginForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        const { error } = await supabase.auth.signInAnonymously();

        if (error) {
          throw new Error(
            "No pude crear la sesión. Activa Anonymous sign-ins en Supabase Auth."
          );
        }
      }

      const { error } = await supabase.rpc("join_couple", {
        p_display_name: displayName,
        p_invite_code: inviteCode,
        p_timezone: getLocalTimezone()
      });

      if (error) {
        throw error;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="auth-field">
        <span>Tu nombre</span>
        <input
          autoComplete="name"
          maxLength={40}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Puerta"
          required
          type="text"
          value={displayName}
        />
      </label>

      <label className="auth-field">
        <span>Código</span>
        <input
          autoCapitalize="characters"
          autoComplete="one-time-code"
          maxLength={32}
          onChange={(event) => setInviteCode(event.target.value)}
          placeholder="CARRETE"
          required
          type="text"
          value={inviteCode}
        />
      </label>

      {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

      <button className="soft-button w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

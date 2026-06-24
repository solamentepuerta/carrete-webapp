"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "No se pudo entrar a Carrete.";
}

function getEmailRedirectTo() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}/auth/callback`;
}

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getEmailRedirectTo(),
            data: {
              display_name: displayName
            }
          }
        });

        if (error) {
          throw error;
        }

        if (!data.session) {
          setSuccessMessage("Cuenta creada. Revisa tu correo para confirmar y luego entra.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          throw error;
        }
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
      <div className="auth-tabs" role="tablist" aria-label="Acceso">
        <button
          aria-selected={mode === "signin"}
          className="auth-tab"
          onClick={() => setMode("signin")}
          role="tab"
          type="button"
        >
          Entrar
        </button>
        <button
          aria-selected={mode === "signup"}
          className="auth-tab"
          onClick={() => setMode("signup")}
          role="tab"
          type="button"
        >
          Crear cuenta
        </button>
      </div>

      {mode === "signup" ? (
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
      ) : null}

      <label className="auth-field">
        <span>Correo</span>
        <input
          autoComplete="email"
          inputMode="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@email.com"
          required
          type="email"
          value={email}
        />
      </label>

      <label className="auth-field">
        <span>Contraseña</span>
        <input
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          required
          type="password"
          value={password}
        />
      </label>

      {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
      {successMessage ? <p className="auth-success">{successMessage}</p> : null}

      <button className="soft-button w-full" disabled={isSubmitting} type="submit">
        {isSubmitting
          ? "Un momentito..."
          : mode === "signup"
            ? "Crear cuenta"
            : "Entrar"}
      </button>
    </form>
  );
}

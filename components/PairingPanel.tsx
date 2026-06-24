"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PairingMode = "create" | "join";

type PairingStatus = {
  invite_code: string | null;
  is_paired: boolean;
  member_count: number;
};

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

  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" && message
      ? message
      : "No se pudo emparejar.";
  }

  return "No se pudo emparejar.";
}

export function PairingPanel({
  initialStatus
}: {
  initialStatus: PairingStatus | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<PairingMode>("create");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const visibleCodeStatus =
    status?.invite_code && (mode === "create" || status.is_paired)
      ? status
      : null;
  const isWaitingInOwnRoom = Boolean(
    mode === "create" && status?.invite_code && !status.is_paired
  );
  const isAlreadyPaired = Boolean(status?.is_paired);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const rpcName =
        mode === "create" ? "create_pairing_code" : "join_pairing_code";
      const payload =
        mode === "create"
          ? {
              p_display_name: displayName,
              p_timezone: getLocalTimezone()
            }
          : {
              p_display_name: displayName,
              p_invite_code: inviteCode,
              p_timezone: getLocalTimezone()
            };
      const { data, error } = await supabase.rpc(rpcName, payload).single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("La sala no devolvió un código. Revisa la migración de Supabase.");
      }

      const nextStatus = data as PairingStatus;
      setStatus(nextStatus);
      router.refresh();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="window-shell pairing-panel">
      <p className="font-hand text-5xl text-lavender-deep">Carrete</p>
      <h1 className="mt-2 text-3xl font-bold">Crea una sala para dos</h1>

      {visibleCodeStatus ? (
        <div className="pairing-code-card">
          <span>Tu código</span>
          <strong>{visibleCodeStatus.invite_code}</strong>
          <p>
            {visibleCodeStatus.is_paired
              ? "Ya están emparejados. El corcho está listo."
              : "Comparte este código para que tu pareja se una a la sala."}
          </p>
          <p className="mt-2 text-sm font-bold text-ink/70">
            {Math.min(visibleCodeStatus.member_count, 2)}/2 en la sala
          </p>
        </div>
      ) : null}

      <div className="auth-tabs" role="tablist" aria-label="Emparejamiento">
        <button
          aria-selected={mode === "create"}
          className="auth-tab"
          onClick={() => setMode("create")}
          role="tab"
          type="button"
        >
          Crear sala
        </button>
        <button
          aria-selected={mode === "join"}
          className="auth-tab"
          onClick={() => setMode("join")}
          role="tab"
          type="button"
        >
          Unirme
        </button>
      </div>

      {isWaitingInOwnRoom ? (
        <div className="auth-form">
          <p className="text-sm font-bold text-ink/70">
            Cuando tu pareja entre con otra cuenta, la sala se abrirá para ambos.
          </p>
          <button className="soft-button w-full" onClick={() => router.refresh()} type="button">
            Revisar sala
          </button>
        </div>
      ) : isAlreadyPaired ? (
        <div className="auth-form">
          <button className="soft-button w-full" onClick={() => router.refresh()} type="button">
            Entrar al corcho
          </button>
        </div>
      ) : (
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

          {mode === "join" ? (
          <label className="auth-field">
            <span>Código</span>
            <input
              autoCapitalize="characters"
              autoComplete="one-time-code"
              maxLength={12}
              onChange={(event) => setInviteCode(event.target.value)}
              placeholder="ABCD23"
              required
              type="text"
              value={inviteCode}
            />
          </label>
          ) : null}

          {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

          <button className="soft-button w-full" disabled={isSubmitting} type="submit">
            {isSubmitting
              ? "Guardando..."
              : mode === "create"
                ? "Crear sala"
                : "Unirme a una sala"}
          </button>
        </form>
      )}
    </section>
  );
}

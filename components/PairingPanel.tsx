"use client";

import { FormEvent, useState } from "react";
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
  return error instanceof Error ? error.message : "No se pudo emparejar.";
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

      setStatus(data as PairingStatus);
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
      <h1 className="mt-2 text-3xl font-bold">Encuentra tu carrete compartido</h1>

      {status?.invite_code ? (
        <div className="pairing-code-card">
          <span>Tu código</span>
          <strong>{status.invite_code}</strong>
          <p>
            {status.is_paired
              ? "Ya están emparejados. El corcho está listo."
              : "Compártelo con tu pareja y vuelve cuando se una."}
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
          Crear código
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
              ? "Crear mi código"
              : "Unirme al carrete"}
        </button>
      </form>
    </section>
  );
}

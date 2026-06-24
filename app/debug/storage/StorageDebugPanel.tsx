/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";

export type StorageDebugRow = {
  alreadyGuessed: boolean;
  entryId: string;
  guessedCategoryId: number | null;
  imagePath: string;
  signedUrl: string | null;
  signedUrlError: string | null;
};

type ImageStatus = "idle" | "loaded" | "error";

export function StorageDebugPanel({
  rows
}: {
  rows: StorageDebugRow[];
}) {
  const [imageStatuses, setImageStatuses] = useState<Record<string, ImageStatus>>(
    {}
  );

  function setStatus(entryId: string, status: ImageStatus) {
    setImageStatuses((current) => ({
      ...current,
      [entryId]: status
    }));
  }

  return (
    <div className="grid gap-4">
      {rows.length ? (
        rows.map((row, index) => {
          const imageStatus = imageStatuses[row.entryId] ?? "idle";

          return (
            <article className="pixel-card grid gap-3 p-4" key={row.entryId}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-ink/60">
                    Entrada {index + 1}
                  </p>
                  <p className="mt-1 break-all text-sm font-bold">
                    {row.imagePath}
                  </p>
                </div>
                <span className="rounded-full border-2 border-[var(--theme-line)] bg-lilac-soft px-3 py-1 text-xs font-black">
                  {imageStatus}
                </span>
              </div>

              <dl className="grid gap-1 text-sm font-bold">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink/60">Signed URL</dt>
                  <dd>{row.signedUrl ? "sí" : "no"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink/60">Ya adivinada</dt>
                  <dd>{row.alreadyGuessed ? "sí" : "no"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink/60">Pista guardada</dt>
                  <dd>{row.guessedCategoryId ?? "ninguna"}</dd>
                </div>
              </dl>

              {row.signedUrlError ? (
                <p className="auth-error">{row.signedUrlError}</p>
              ) : null}

              {row.signedUrl ? (
                <div className="overflow-hidden rounded-xl border-2 border-[var(--theme-line)] bg-cream">
                  <img
                    alt={`Debug storage ${index + 1}`}
                    className="block aspect-[3/4] w-full object-cover"
                    onError={() => setStatus(row.entryId, "error")}
                    onLoad={() => setStatus(row.entryId, "loaded")}
                    src={row.signedUrl}
                  />
                </div>
              ) : (
                <div className="grid aspect-[3/4] place-items-center rounded-xl border-2 border-[var(--theme-line)] bg-cream p-4 text-center font-bold">
                  No se generó signed URL.
                </div>
              )}
            </article>
          );
        })
      ) : (
        <div className="empty-state">
          <p className="font-hand text-4xl text-lavender-deep">Sin entradas</p>
          <p className="mt-2 font-bold">
            No hay fotos de tu pareja para el día diagnosticado.
          </p>
        </div>
      )}
    </div>
  );
}

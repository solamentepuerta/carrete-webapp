"use client";

/* eslint-disable @next/next/no-img-element */
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition
} from "react";
import { categories } from "@/lib/categories";
import { firePastelConfetti, playSoftChime } from "@/lib/celebrations";
import { createClient } from "@/lib/supabase/client";

export type PartnerEntry = {
  already_guessed: boolean;
  entry_id: string;
  guessed_category_id: number | null;
  image_path: string;
  image_url: string | null;
  signed_url_error?: string | null;
};

export type PartnerResult = {
  entry_id: string;
  guessed_category_id: number;
  is_correct: boolean;
  real_category_id: number;
};

type GuessAssignments = Record<string, number | undefined>;

type DayResultRow = {
  entry_id: string;
  guessed_category_id: number;
  is_correct: boolean;
  real_category_id: number;
};

type ImageStatus = "idle" | "loaded" | "error";

function getInitialAssignments(entries: PartnerEntry[]) {
  return Object.fromEntries(
    entries
      .filter((entry) => entry.guessed_category_id)
      .map((entry) => [entry.entry_id, entry.guessed_category_id ?? undefined])
  ) as GuessAssignments;
}

function getCategory(categoryId: number) {
  return categories.find((category) => category.id === categoryId);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" && message
      ? message
      : "No pude completar la acción.";
  }

  return "No pude completar la acción.";
}

export function PartnerCarrete({
  initialPartnerEntries,
  initialResults,
  logicalDate
}: {
  initialPartnerEntries: PartnerEntry[];
  initialResults: PartnerResult[];
  logicalDate: string;
}) {
  const holdTimer = useRef<number | null>(null);
  const holdInterval = useRef<number | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [partnerEntries, setPartnerEntries] = useState(initialPartnerEntries);
  const [assignments, setAssignments] = useState<GuessAssignments>(() =>
    getInitialAssignments(initialPartnerEntries)
  );
  const [results, setResults] = useState(initialResults);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [holdState, setHoldState] = useState<{
    entryId: string;
    progress: number;
  } | null>(null);
  const [imageStatuses, setImageStatuses] = useState<Record<string, ImageStatus>>(
    {}
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isRevealing, setIsRevealing] = useState(false);
  const usedCategories = useMemo(
    () => new Set(Object.values(assignments).filter(Boolean)),
    [assignments]
  );
  const resultByEntry = useMemo(
    () => new Map(results.map((result) => [result.entry_id, result])),
    [results]
  );
  const score = results.filter((result) => result.is_correct).length;
  const canReveal =
    partnerEntries.length === 5 &&
    partnerEntries.every((entry) => assignments[entry.entry_id]) &&
    results.length === 0;
  const activeEntry = partnerEntries.find((entry) => entry.entry_id === activeMenu);
  const activeAssignment = activeEntry
    ? assignments[activeEntry.entry_id]
    : undefined;

  function clearHold() {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }

    if (holdInterval.current) {
      window.clearInterval(holdInterval.current);
      holdInterval.current = null;
    }

    setHoldState(null);
  }

  function setImageStatus(entryId: string, status: ImageStatus) {
    setImageStatuses((current) => ({
      ...current,
      [entryId]: status
    }));
  }

  useEffect(() => {
    setPartnerEntries(initialPartnerEntries);
    setAssignments(getInitialAssignments(initialPartnerEntries));
    setResults(initialResults);
    setActiveMenu(null);
    setImageStatuses({});
  }, [initialPartnerEntries, initialResults]);

  useEffect(() => clearHold, []);

  function refreshFromServer() {
    setErrorMessage("");
    startTransition(() => {
      router.refresh();
    });
  }

  function startUnassignHold(entryId: string) {
    if (!assignments[entryId] || results.length > 0) {
      return;
    }

    clearHold();
    const startedAt = Date.now();
    setHoldState({ entryId, progress: 0 });
    holdInterval.current = window.setInterval(() => {
      const progress = Math.min((Date.now() - startedAt) / 3000, 1);
      setHoldState({ entryId, progress });
    }, 40);
    holdTimer.current = window.setTimeout(() => {
      setAssignments((current) => {
        const next = { ...current };
        delete next[entryId];
        return next;
      });
      setActiveMenu(null);
      clearHold();
    }, 3000);
  }

  function assignCategory(entryId: string, categoryId: number) {
    if (results.length > 0) {
      return;
    }

    setAssignments((current) => {
      const next = { ...current };

      for (const [assignedEntryId, assignedCategoryId] of Object.entries(next)) {
        if (assignedCategoryId === categoryId) {
          delete next[assignedEntryId];
        }
      }

      next[entryId] = categoryId;
      return next;
    });
    setActiveMenu(null);
  }

  async function handleReveal() {
    if (!canReveal) {
      return;
    }

    setErrorMessage("");
    setIsRevealing(true);

    try {
      const supabase = createClient();

      for (const entry of partnerEntries) {
        const categoryId = assignments[entry.entry_id];

        if (!categoryId) {
          throw new Error("Falta una pista.");
        }

        const { error } = await supabase.rpc("submit_guess", {
          p_category_id: categoryId,
          p_entry_id: entry.entry_id
        });

        if (error) {
          throw error;
        }
      }

      const { data, error } = await supabase.rpc("get_day_results", {
        p_date: logicalDate
      });

      if (error) {
        throw error;
      }

      if (!data || data.length < 5) {
        throw new Error("Todavía no hay 5 resultados para revelar.");
      }

      const nextResults = (data as DayResultRow[]).map((result) => ({
        entry_id: result.entry_id,
        guessed_category_id: result.guessed_category_id,
        is_correct: result.is_correct,
        real_category_id: result.real_category_id
      }));
      const correctCount = nextResults.filter((result) => result.is_correct).length;

      setResults(nextResults);
      playSoftChime();
      firePastelConfetti(correctCount === 5 ? "big" : "soft");
      refreshFromServer();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsRevealing(false);
    }
  }

  return (
    <section className="home-carrete">
      <motion.div
        animate={{ opacity: 1, x: 0 }}
        className="window-shell p-3"
        initial={{ opacity: 0, x: -18 }}
        transition={{ duration: 0.22 }}
      >
        {partnerEntries.length ? (
          <div className="corkboard grid grid-cols-2 gap-3 rounded-2xl p-3">
            {partnerEntries.map((entry, index) => {
              const assignment = assignments[entry.entry_id];
              const guessedCategory = assignment ? getCategory(assignment) : null;
              const result = resultByEntry.get(entry.entry_id);
              const realCategory = result
                ? getCategory(result.real_category_id)
                : null;
              const holdProgress =
                holdState?.entryId === entry.entry_id ? holdState.progress : 0;
              const imageStatus = imageStatuses[entry.entry_id] ?? "idle";
              const imageUnavailable =
                !entry.image_url ||
                Boolean(entry.signed_url_error) ||
                imageStatus === "error";

              return (
                <article
                  className="polaroid guess-polaroid-home aspect-[3/4] rotate-[var(--rotate)] p-2"
                  key={entry.entry_id}
                  style={
                    {
                      "--rotate": `${[-3, 2, -1, 4, -4][index]}deg`
                    } as CSSProperties
                  }
                >
                  <div className={`card3d ${result ? "flipped" : ""}`}>
                    <button
                      className="card-face card-front polaroid-button"
                      onClick={() =>
                        results.length === 0
                          ? setActiveMenu((current) =>
                              current === entry.entry_id ? null : entry.entry_id
                            )
                          : undefined
                      }
                      onPointerCancel={clearHold}
                      onPointerDown={() => startUnassignHold(entry.entry_id)}
                      onPointerLeave={clearHold}
                      onPointerUp={clearHold}
                      type="button"
                    >
                      <div
                        className="polaroid-photo relative h-full overflow-hidden rounded-xl"
                        data-empty={imageUnavailable}
                      >
                        {entry.image_url ? (
                          <img
                            alt=""
                            aria-hidden="true"
                            className="polaroid-photo-img"
                            draggable={false}
                            onError={() => setImageStatus(entry.entry_id, "error")}
                            onLoad={() => setImageStatus(entry.entry_id, "loaded")}
                            src={entry.image_url}
                          />
                        ) : null}
                        <span className="washi-tape" aria-hidden="true" />
                        <span className="corner-sparkle" aria-hidden="true">
                          ✧
                        </span>
                        <p className="category-card-label px-3 text-center text-base font-bold leading-snug">
                          {imageUnavailable
                            ? "No pude cargar esta foto"
                            : guessedCategory
                              ? `${guessedCategory.emoji} ${guessedCategory.label}`
                              : "Elegir pista"}
                        </p>
                        {holdProgress > 0 ? (
                          <span
                            aria-hidden="true"
                            className="hold-progress"
                            style={
                              {
                                "--hold-progress": `${holdProgress * 360}deg`
                              } as CSSProperties
                            }
                          />
                        ) : null}
                      </div>
                    </button>

                    <div className="card-face card-back">
                      <p className="home-result-title font-hand text-lavender-deep">
                        {result?.is_correct ? "Bien" : "Casi"}
                      </p>
                      <p className="home-result-kicker mt-1 font-bold uppercase text-ink/60">
                        Era
                      </p>
                      <p className="home-result-category mt-1 font-bold">
                        {realCategory
                          ? `${realCategory.emoji} ${realCategory.label}`
                          : "Sin revelar"}
                      </p>
                      {guessedCategory ? (
                        <p className="home-result-guess mt-2 font-bold">
                          Tu pista: {guessedCategory.label}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-sticker" aria-hidden="true">
              ♡
            </p>
            <p className="font-hand text-4xl text-lavender-deep">
              Su carrete está esperando
            </p>
            <p className="mt-2 font-bold">
              Cuando tu pareja suba fotos, aparecerán aquí para adivinar.
            </p>
          </div>
        )}

        {results.length > 0 ? (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="result-summary mt-3"
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ damping: 13, stiffness: 160, type: "spring" }}
          >
            <span>Resultado</span>
            <strong>{score}/5</strong>
          </motion.div>
        ) : null}

        {partnerEntries.length === 5 && results.length === 0 ? (
          <button
            className="soft-button mt-3 w-full"
            disabled={!canReveal || isRevealing}
            onClick={handleReveal}
            type="button"
          >
            {isRevealing ? "Revelando..." : "Revelar"}
          </button>
        ) : null}

        {results.length === 0 ? (
          <button
            className="soft-button mt-3 w-full"
            disabled={isPending}
            onClick={refreshFromServer}
            type="button"
          >
            {isPending ? "Actualizando..." : "Actualizar carrete"}
          </button>
        ) : null}
      </motion.div>

      <AnimatePresence>
        {activeEntry && results.length === 0 ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="guess-sheet-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => setActiveMenu(null)}
          >
            <motion.div
              animate={{ y: 0 }}
              className="guess-action-sheet"
              exit={{ y: 24 }}
              initial={{ y: 24 }}
              onClick={(event) => event.stopPropagation()}
              transition={{ damping: 18, stiffness: 220, type: "spring" }}
            >
              <p className="guess-sheet-title">Elige una pista</p>
              <div className="guess-sheet-options">
                {categories.map((category) => (
                  <button
                    disabled={
                      usedCategories.has(category.id) &&
                      activeAssignment !== category.id
                    }
                    key={category.key}
                    onClick={() => assignCategory(activeEntry.entry_id, category.id)}
                    type="button"
                  >
                    <span aria-hidden="true">{category.emoji}</span>
                    {category.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
    </section>
  );
}

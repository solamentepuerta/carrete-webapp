"use client";

import imageCompression from "browser-image-compression";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChangeEvent,
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { categories, type Category } from "@/lib/categories";
import { firePastelConfetti, playSoftChime } from "@/lib/celebrations";
import { createClient } from "@/lib/supabase/client";

type BoardMode = "mine" | "partner";

type ProfileForBoard = {
  couple_id: string;
  id: string;
  timezone: string;
};

export type OwnBoardCard = {
  category: Category;
  imageSrc: string;
  isUploaded: boolean;
};

export type PartnerEntry = {
  already_guessed: boolean;
  entry_id: string;
  guessed_category_id: number | null;
  image_path: string;
  image_url: string;
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

function getDateForTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric"
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

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

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return hash >>> 0;
}

function shufflePartnerEntries(entries: PartnerEntry[], seed: string) {
  return [...entries].sort((first, second) => {
    const firstHash = hashString(`${seed}:${first.entry_id}`);
    const secondHash = hashString(`${seed}:${second.entry_id}`);

    if (firstHash === secondHash) {
      return first.entry_id.localeCompare(second.entry_id);
    }

    return firstHash - secondHash;
  });
}

function mergePersistedAssignments(
  current: GuessAssignments,
  entries: PartnerEntry[]
) {
  const validIds = new Set(entries.map((entry) => entry.entry_id));
  const persisted = getInitialAssignments(entries);
  const next = Object.fromEntries(
    Object.entries(current).filter(([entryId]) => validIds.has(entryId))
  ) as GuessAssignments;

  return {
    ...next,
    ...persisted
  };
}

export function HomeCarrete({
  initialOwnCards,
  initialPartnerEntries,
  initialResults,
  logicalDate,
  profile
}: {
  initialOwnCards: OwnBoardCard[];
  initialPartnerEntries: PartnerEntry[];
  initialResults: PartnerResult[];
  logicalDate: string;
  profile: ProfileForBoard;
}) {
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});
  const holdTimer = useRef<number | null>(null);
  const holdInterval = useRef<number | null>(null);
  const shuffleSeed = `${logicalDate}:${profile.id}`;
  const [mode, setMode] = useState<BoardMode>("mine");
  const [ownCards, setOwnCards] = useState(initialOwnCards);
  const [partnerEntries, setPartnerEntries] = useState(() =>
    shufflePartnerEntries(initialPartnerEntries, shuffleSeed)
  );
  const [assignments, setAssignments] = useState<GuessAssignments>(() =>
    getInitialAssignments(initialPartnerEntries)
  );
  const [results, setResults] = useState(initialResults);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [uploadingCategory, setUploadingCategory] = useState<number | null>(null);
  const [holdState, setHoldState] = useState<{
    entryId: string;
    progress: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isRefreshingPartner, setIsRefreshingPartner] = useState(false);
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

  const refreshPartnerEntries = useCallback(async () => {
    if (results.length > 0) {
      return;
    }

    setIsRefreshingPartner(true);
    setErrorMessage("");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_entries_to_guess", {
        p_date: logicalDate
      });

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as Array<{
        already_guessed: boolean;
        entry_id: string;
        guessed_category_id: number | null;
        image_path: string;
      }>;
      const nextEntries = await Promise.all(
        rows.map(async (entry) => {
          const { data: signed, error: signedError } = await supabase.storage
            .from("photos")
            .createSignedUrl(entry.image_path, 60 * 60);

          if (signedError) {
            throw signedError;
          }

          return {
            already_guessed: entry.already_guessed,
            entry_id: entry.entry_id,
            guessed_category_id: entry.guessed_category_id,
            image_path: entry.image_path,
            image_url: signed?.signedUrl ?? ""
          };
        })
      );
      const shuffledEntries = shufflePartnerEntries(nextEntries, shuffleSeed);

      setPartnerEntries(shuffledEntries);
      setAssignments((current) =>
        mergePersistedAssignments(current, shuffledEntries)
      );
      setActiveMenu((current) =>
        current && shuffledEntries.some((entry) => entry.entry_id === current)
          ? current
          : null
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsRefreshingPartner(false);
    }
  }, [logicalDate, results.length, shuffleSeed]);

  useEffect(() => {
    const shuffledEntries = shufflePartnerEntries(
      initialPartnerEntries,
      shuffleSeed
    );

    setOwnCards(initialOwnCards);
    setPartnerEntries(shuffledEntries);
    setAssignments((current) =>
      mergePersistedAssignments(current, shuffledEntries)
    );
    setResults(initialResults);
  }, [initialOwnCards, initialPartnerEntries, initialResults, shuffleSeed]);

  useEffect(() => clearHold, []);

  useEffect(() => {
    if (mode === "partner") {
      void refreshPartnerEntries();
    }
  }, [mode, refreshPartnerEntries]);

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

  async function handleUpload(
    categoryId: Category["id"],
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setErrorMessage("");
    setUploadingCategory(categoryId);

    try {
      const previewUrl = URL.createObjectURL(file);
      const compressedFile = await imageCompression(file, {
        fileType: "image/jpeg",
        initialQuality: 0.8,
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true
      });
      const entryDate = getDateForTimezone(profile.timezone || "UTC");
      const imagePath = [
        profile.couple_id,
        entryDate,
        profile.id,
        `${categoryId}-${Date.now()}.jpg`
      ].join("/");
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(imagePath, compressedFile, {
          cacheControl: "31536000",
          contentType: "image/jpeg",
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { error: entryError } = await supabase.rpc("create_entry", {
        p_caption: null,
        p_category_id: categoryId,
        p_image_path: imagePath
      });

      if (entryError) {
        throw entryError;
      }

      setOwnCards((current) =>
        current.map((card) =>
          card.category.id === categoryId
            ? { ...card, imageSrc: previewUrl, isUploaded: true }
            : card
        )
      );
      playSoftChime();
      firePastelConfetti("soft");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setUploadingCategory(null);
      event.target.value = "";
    }
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
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsRevealing(false);
    }
  }

  return (
    <section className="home-carrete">
      <div className="carrete-switch" aria-label="Cambiar carrete">
        <button
          className="carrete-switch-button"
          data-active={mode === "mine"}
          onClick={() => setMode("mine")}
          type="button"
        >
          Mi carrete
        </button>
        <button
          className="carrete-switch-button"
          data-active={mode === "partner"}
          onClick={() => setMode("partner")}
          type="button"
        >
          Su carrete
        </button>
        <motion.span
          animate={{ x: mode === "mine" ? "0%" : "100%" }}
          className="carrete-switch-thumb"
          transition={{ damping: 18, stiffness: 220, type: "spring" }}
        />
      </div>

      <AnimatePresence mode="wait">
        {mode === "mine" ? (
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="window-shell p-3"
            exit={{ opacity: 0, x: -18 }}
            initial={{ opacity: 0, x: 18 }}
            key="mine"
            transition={{ duration: 0.22 }}
          >
            <div className="corkboard grid grid-cols-2 gap-3 rounded-2xl p-3">
              {ownCards.map((card, index) => (
                <article
                  className="polaroid aspect-[3/4] rotate-[var(--rotate)] p-2"
                  key={card.category.key}
                  style={
                    {
                      "--rotate": `${[-3, 2, -1, 4, -4][index]}deg`
                    } as CSSProperties
                  }
                >
                  <button
                    className="polaroid-button"
                    disabled={uploadingCategory === card.category.id}
                    onClick={() => fileInputs.current[card.category.id]?.click()}
                    type="button"
                  >
                    <div
                      className="polaroid-photo polaroid-photo-image relative h-full overflow-hidden rounded-xl"
                      style={{ backgroundImage: `url(${card.imageSrc})` }}
                    >
                      <span className="washi-tape" aria-hidden="true" />
                      <span className="corner-sparkle" aria-hidden="true">
                        ✧
                      </span>
                      <p className="category-card-label px-3 text-center text-base font-bold leading-snug">
                        {uploadingCategory === card.category.id
                          ? "Subiendo..."
                          : card.category.label}
                      </p>
                    </div>
                  </button>
                  <input
                    accept="image/*"
                    capture="environment"
                    className="hidden-file-input"
                    onChange={(event) => handleUpload(card.category.id, event)}
                    ref={(node) => {
                      fileInputs.current[card.category.id] = node;
                    }}
                    type="file"
                  />
                </article>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="window-shell p-3"
            exit={{ opacity: 0, x: 18 }}
            initial={{ opacity: 0, x: -18 }}
            key="partner"
            transition={{ duration: 0.22 }}
          >
            {partnerEntries.length ? (
              <div className="corkboard grid grid-cols-2 gap-3 rounded-2xl p-3">
                {partnerEntries.map((entry, index) => {
                  const assignment = assignments[entry.entry_id];
                  const guessedCategory = assignment
                    ? getCategory(assignment)
                    : null;
                  const result = resultByEntry.get(entry.entry_id);
                  const realCategory = result
                    ? getCategory(result.real_category_id)
                    : null;
                  const holdProgress =
                    holdState?.entryId === entry.entry_id
                      ? holdState.progress
                      : 0;

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
                                  current === entry.entry_id
                                    ? null
                                    : entry.entry_id
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
                            className="polaroid-photo polaroid-photo-image relative h-full overflow-hidden rounded-xl"
                            data-empty={!entry.image_url}
                            style={
                              entry.image_url
                                ? { backgroundImage: `url(${entry.image_url})` }
                                : undefined
                            }
                          >
                            <span className="washi-tape" aria-hidden="true" />
                            <span className="corner-sparkle" aria-hidden="true">
                              ✧
                            </span>
                            <p className="category-card-label px-3 text-center text-base font-bold leading-snug">
                              {!entry.image_url
                                ? "Cargando foto..."
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

            {mode === "partner" && results.length === 0 ? (
              <button
                className="soft-button mt-3 w-full"
                disabled={isRefreshingPartner}
                onClick={refreshPartnerEntries}
                type="button"
              >
                {isRefreshingPartner ? "Actualizando..." : "Actualizar carrete"}
              </button>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

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

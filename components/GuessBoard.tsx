"use client";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { type CSSProperties, useMemo, useState } from "react";
import { categories, type Category } from "@/lib/categories";
import { firePastelConfetti, playSoftChime } from "@/lib/celebrations";
import { createClient } from "@/lib/supabase/client";

export type GuessEntry = {
  already_guessed: boolean;
  entry_id: string;
  guessed_category_id: number | null;
  image_url: string;
};

export type DayResult = {
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

function getCategory(categoryId: number) {
  return categories.find((category) => category.id === categoryId);
}

function getInitialAssignments(entries: GuessEntry[]) {
  return Object.fromEntries(
    entries
      .filter((entry) => entry.guessed_category_id)
      .map((entry) => [entry.entry_id, entry.guessed_category_id ?? undefined])
  ) as GuessAssignments;
}

export function GuessBoard({
  entries,
  initialResults,
  logicalDate
}: {
  entries: GuessEntry[];
  initialResults: DayResult[];
  logicalDate: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 8 }
    })
  );
  const [assignments, setAssignments] = useState<GuessAssignments>(() =>
    getInitialAssignments(entries)
  );
  const [results, setResults] = useState(initialResults);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resultByEntry = useMemo(
    () => new Map(results.map((result) => [result.entry_id, result])),
    [results]
  );
  const usedCategories = useMemo(
    () => new Set(Object.values(assignments).filter(Boolean)),
    [assignments]
  );
  const score = results.filter((result) => result.is_correct).length;
  const canReveal =
    entries.length === 5 &&
    entries.every((entry) => assignments[entry.entry_id]) &&
    results.length === 0;

  function handleDragEnd(event: DragEndEvent) {
    const overId = event.over?.id;

    if (!overId) {
      return;
    }

    const entryId = String(overId).replace("entry-", "");
    const entry = entries.find((item) => item.entry_id === entryId);

    if (!entry || entry.already_guessed || results.length > 0) {
      return;
    }

    const categoryId = Number(String(event.active.id).replace("category-", ""));

    if (!categoryId) {
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
  }

  async function handleReveal() {
    if (!canReveal) {
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      for (const entry of entries) {
        const categoryId = assignments[entry.entry_id];

        if (!categoryId) {
          throw new Error("Falta una etiqueta.");
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

      const resultRows = data as DayResultRow[];
      const nextResults = resultRows.map((result) => ({
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
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo revelar."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (entries.length === 0) {
    return (
      <div className="window-shell empty-state">
        <p className="empty-sticker" aria-hidden="true">
          ♡
        </p>
        <p className="font-hand text-4xl text-lavender-deep">Nada por aquí</p>
        <p className="mt-2 font-bold">
          Cuando tu pareja suba sus 5 fotos, este corcho se llena.
        </p>
      </div>
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
      <section className="guess-layout">
        <div className="guess-grid">
          {entries.map((entry, index) => (
            <GuessPolaroid
              assignment={assignments[entry.entry_id]}
              entry={entry}
              index={index}
              key={entry.entry_id}
              result={resultByEntry.get(entry.entry_id)}
            />
          ))}
        </div>

        <div className="guess-tray">
          {categories.map((category) => (
            <DraggableCategory
              category={category}
              disabled={usedCategories.has(category.id) || results.length > 0}
              key={category.key}
            />
          ))}
        </div>

        {results.length > 0 ? (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="result-summary"
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ damping: 13, stiffness: 160, type: "spring" }}
          >
            <span>Resultado</span>
            <strong>{score}/5</strong>
          </motion.div>
        ) : null}

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

        <button
          className="soft-button w-full"
          disabled={!canReveal || isSubmitting}
          onClick={handleReveal}
          type="button"
        >
          {isSubmitting ? "Revelando..." : "Revelar"}
        </button>
      </section>
    </DndContext>
  );
}

function DraggableCategory({
  category,
  disabled
}: {
  category: Category;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    disabled,
    id: `category-${category.id}`
  });

  return (
    <button
      className="category-chip"
      disabled={disabled}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      type="button"
      {...listeners}
      {...attributes}
    >
      <span aria-hidden="true">{category.emoji}</span>
      {category.label}
    </button>
  );
}

function GuessPolaroid({
  assignment,
  entry,
  index,
  result
}: {
  assignment: number | undefined;
  entry: GuessEntry;
  index: number;
  result?: DayResult;
}) {
  const { isOver, setNodeRef } = useDroppable({
    disabled: entry.already_guessed || Boolean(result),
    id: `entry-${entry.entry_id}`
  });
  const guessedCategory = assignment ? getCategory(assignment) : null;
  const realCategory = result ? getCategory(result.real_category_id) : null;
  const rotation = [-3, 2, -1, 3, -2][index] ?? 0;

  return (
    <article
      className={`guess-card ${isOver ? "guess-card-over" : ""}`}
      ref={setNodeRef}
      style={{ "--rotate": `${rotation}deg` } as CSSProperties}
    >
      <div className={`card3d ${result ? "flipped" : ""}`}>
        <div className="card-face card-front">
          <div
            className="guess-photo"
            style={{ backgroundImage: `url(${entry.image_url})` }}
          />
          <p className="guess-assignment">
            {guessedCategory
              ? `${guessedCategory.emoji} ${guessedCategory.label}`
              : "♡"}
          </p>
        </div>

        <div className="card-face card-back">
          <p className="font-hand text-4xl text-lavender-deep">
            {result?.is_correct ? "Bien" : "Casi"}
          </p>
          <p className="mt-2 text-sm font-bold uppercase tracking-wide text-ink/60">
            Era
          </p>
          <p className="mt-1 font-bold">
            {realCategory
              ? `${realCategory.emoji} ${realCategory.label}`
              : "Sin revelar"}
          </p>
          {guessedCategory ? (
            <p className="mt-3 text-sm font-bold">
              Tu pista: {guessedCategory.label}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

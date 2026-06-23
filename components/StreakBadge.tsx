"use client";

import { motion } from "framer-motion";

export function StreakBadge({
  isCelebrating,
  value
}: {
  isCelebrating: boolean;
  value: number;
}) {
  return (
    <motion.div
      animate={
        isCelebrating
          ? { rotate: [0, -2, 2, 0], scale: [1, 1.06, 1] }
          : { rotate: 0, scale: 1 }
      }
      aria-label={`Racha ${value}`}
      className="streak-card pixel-card px-3 py-2"
      transition={
        isCelebrating
          ? { duration: 1.15, repeat: Infinity, repeatDelay: 2.4 }
          : { duration: 0.2 }
      }
    >
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-ink/60">
        Racha
      </p>
      <div className="streak-number-row">
        <p className="text-center font-hand text-4xl leading-none text-blush-deep">
          {value}
        </p>
        {value > 0 ? (
          <motion.span
            animate={{ rotate: [-5, 6, -5], y: [0, -2, 0] }}
            aria-hidden="true"
            className="streak-flame"
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            🔥
          </motion.span>
        ) : null}
      </div>
    </motion.div>
  );
}

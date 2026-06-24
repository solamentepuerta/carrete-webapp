"use client";

import { motion } from "framer-motion";

type ActiveCarrete = "mine" | "partner";

export function CarreteTabs({
  active,
  onChange
}: {
  active: ActiveCarrete;
  onChange: (tab: ActiveCarrete) => void;
}) {
  return (
    <nav className="carrete-switch" aria-label="Cambiar carrete">
      <button
        aria-current={active === "mine" ? "page" : undefined}
        className="carrete-switch-button"
        onClick={() => onChange("mine")}
        type="button"
      >
        Mi carrete
      </button>
      <button
        aria-current={active === "partner" ? "page" : undefined}
        className="carrete-switch-button"
        onClick={() => onChange("partner")}
        type="button"
      >
        Su carrete
      </button>
      <motion.span
        animate={{ x: active === "mine" ? "0%" : "100%" }}
        className="carrete-switch-thumb"
        initial={false}
        transition={{ damping: 18, stiffness: 220, type: "spring" }}
      />
    </nav>
  );
}

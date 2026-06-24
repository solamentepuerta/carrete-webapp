"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type ActiveCarrete = "mine" | "partner";

export function CarreteTabs({ active }: { active: ActiveCarrete }) {
  return (
    <nav className="carrete-switch" aria-label="Cambiar carrete">
      <Link
        aria-current={active === "mine" ? "page" : undefined}
        className="carrete-switch-button"
        href="/"
      >
        Mi carrete
      </Link>
      <Link
        aria-current={active === "partner" ? "page" : undefined}
        className="carrete-switch-button"
        href="/su-carrete"
      >
        Su carrete
      </Link>
      <motion.span
        animate={{ x: active === "mine" ? "0%" : "100%" }}
        className="carrete-switch-thumb"
        initial={false}
        transition={{ damping: 18, stiffness: 220, type: "spring" }}
      />
    </nav>
  );
}

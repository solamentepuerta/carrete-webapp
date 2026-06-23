"use client";

import { useEffect } from "react";
import { firePastelConfetti } from "@/lib/celebrations";

export function CelebrationBurst({
  celebrationKey,
  enabled
}: {
  celebrationKey: string;
  enabled: boolean;
}) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const storageKey = `carrete-celebrated-${celebrationKey}`;

    try {
      if (localStorage.getItem(storageKey)) {
        return;
      }

      localStorage.setItem(storageKey, "1");
    } catch {
      // Private browsing can block storage; confetti can still run once.
    }

    firePastelConfetti("big");
  }, [celebrationKey, enabled]);

  return null;
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { CarreteTabs } from "@/components/CarreteTabs";
import { MineCarrete, type OwnBoardCard } from "@/components/MineCarrete";
import {
  PartnerCarrete,
  type PartnerEntry,
  type PartnerResult
} from "@/components/PartnerCarrete";

type ActiveCarrete = "mine" | "partner";

export function CarreteBoard({
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
  profile: {
    couple_id: string;
    id: string;
    timezone: string;
  };
}) {
  const [active, setActive] = useState<ActiveCarrete>("mine");

  return (
    <>
      <CarreteTabs active={active} onChange={setActive} />
      <AnimatePresence mode="wait" initial={false}>
        {active === "mine" ? (
          <motion.div
            key="mine"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <MineCarrete
              initialOwnCards={initialOwnCards}
              profile={profile}
            />
          </motion.div>
        ) : (
          <motion.div
            key="partner"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <PartnerCarrete
              initialPartnerEntries={initialPartnerEntries}
              initialResults={initialResults}
              logicalDate={logicalDate}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

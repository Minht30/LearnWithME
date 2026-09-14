"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";

/**
 * Streak counter chip. Pulses when it increments.
 * Hidden below 2 so it appears only when there's something to celebrate.
 */
export function StreakBadge({ count }: { count: number }) {
  const active = count >= 2;
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={count}
          initial={{ opacity: 0, scale: 0.6, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -6 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-400 to-pink-500 px-2.5 py-1 text-xs font-bold text-white shadow-md dark:from-cyan-400 dark:to-fuchsia-500 dark:shadow-[0_0_14px_rgba(0,240,255,0.5)]"
        >
          <Flame className="h-3.5 w-3.5 lwm-flicker" />
          <span>{count}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

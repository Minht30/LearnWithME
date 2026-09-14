"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative inline-flex h-9 w-16 items-center rounded-full border transition-colors ${
        isDark
          ? "bg-[#0d1230] border-[rgba(0,240,255,0.5)] shadow-[0_0_14px_rgba(0,240,255,0.35)]"
          : "bg-white border-[#f2c9d5]"
      } ${className}`}
    >
      {/* stars in dark mode */}
      {isDark && (
        <>
          <span className="absolute left-3 top-1.5 h-0.5 w-0.5 rounded-full bg-cyan-200" />
          <span className="absolute left-5 top-4 h-0.5 w-0.5 rounded-full bg-pink-300" />
          <span className="absolute left-2 top-5 h-0.5 w-0.5 rounded-full bg-white/70" />
        </>
      )}
      {/* clouds in light mode */}
      {!isDark && (
        <>
          <span className="absolute right-3 top-2 h-1 w-2 rounded-full bg-pink-200" />
          <span className="absolute right-2 top-4 h-1 w-3 rounded-full bg-pink-100" />
        </>
      )}
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`absolute top-0.5 flex h-8 w-8 items-center justify-center rounded-full ${
          isDark
            ? "left-[calc(100%-2.1rem)] bg-gradient-to-br from-slate-100 to-slate-300 shadow-[0_0_10px_rgba(255,255,255,0.6)]"
            : "left-0.5 bg-gradient-to-br from-yellow-300 to-orange-400 shadow-md"
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={{ rotate: -30, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 30, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {isDark ? (
              <Moon className="h-4 w-4 text-slate-700" strokeWidth={2.5} />
            ) : (
              <Sun className="h-4 w-4 text-orange-800" strokeWidth={2.5} />
            )}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </button>
  );
}

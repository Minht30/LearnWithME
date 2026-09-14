"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings2, Type, Eye, Sparkles } from "lucide-react";
import {
  useFont,
  useFontSize,
  useZen,
  useEncouragementPref,
  type FontSize,
} from "@/lib/theme";

const SIZES: { key: FontSize; label: string }[] = [
  { key: "sm", label: "A" },
  { key: "md", label: "A" },
  { key: "lg", label: "A" },
  { key: "xl", label: "A" },
];

/**
 * A little gear-icon dropdown with kid-accessibility toggles.
 *  - Font size
 *  - Dyslexia-friendly font toggle
 *  - Zen mode
 *  - Encouragement phrases on/off
 */
export function PrefsMenu() {
  const [open, setOpen] = useState(false);
  const [font, setFont] = useFont();
  const [fs, setFs] = useFontSize();
  const [zen, setZen] = useZen();
  const [enc, setEnc] = useEncouragementPref();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Preferences"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
      >
        <Settings2 className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 z-30 w-72 rounded-2xl border bg-popover p-3 shadow-lg"
          >
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Comfort
            </div>

            <Row icon={<Type className="h-3.5 w-3.5" />} label="Text size">
              <div className="flex items-center gap-1">
                {SIZES.map((s, i) => (
                  <button
                    key={s.key}
                    onClick={() => setFs(s.key)}
                    className={`flex h-7 w-7 items-center justify-center rounded-md border text-xs font-semibold transition-colors ${
                      fs === s.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-transparent hover:bg-muted"
                    }`}
                    style={{ fontSize: `${10 + i * 2}px` }}
                    aria-label={`Font size ${s.key}`}
                  >
                    A
                  </button>
                ))}
              </div>
            </Row>

            <Row icon={<Type className="h-3.5 w-3.5" />} label="Dyslexia-friendly font">
              <ToggleChip
                on={font === "dyslexic"}
                onClick={() => setFont(font === "dyslexic" ? "default" : "dyslexic")}
              />
            </Row>

            <Row icon={<Eye className="h-3.5 w-3.5" />} label="Zen mode">
              <ToggleChip on={zen} onClick={() => setZen(!zen)} />
            </Row>

            <Row icon={<Sparkles className="h-3.5 w-3.5" />} label="Encouragement">
              <ToggleChip on={enc} onClick={() => setEnc(!enc)} />
            </Row>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/40">
      <span className="flex items-center gap-2 text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </span>
      {children}
    </div>
  );
}

function ToggleChip({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-6 w-11 rounded-full transition-colors ${
        on ? "bg-primary" : "bg-muted"
      } relative`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          on ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

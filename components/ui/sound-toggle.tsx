"use client";

import { useState } from "react";
import { Volume2, VolumeX, Music, Music2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSoundPref } from "@/lib/theme";
import { setMasterVolume, setMusicPlaying } from "@/lib/sounds";
import { useEffect } from "react";

export function SoundToggle({ compact = false }: { compact?: boolean }) {
  const { sound, setSound, volume, setVolume, music, setMusic } = useSoundPref();
  const [open, setOpen] = useState(false);

  useEffect(() => { setMasterVolume(sound ? volume : 0); }, [sound, volume]);
  useEffect(() => { setMusicPlaying(sound && music); }, [sound, music]);

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setSound(!sound)}
          aria-label={sound ? "Mute" : "Unmute"}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        {!compact && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-muted-foreground hover:text-foreground"
            aria-label="Sound settings"
          >
            ⚙
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 z-30 w-64 rounded-2xl border bg-popover p-3 shadow-lg"
          >
            <div className="mb-2 text-xs font-semibold text-muted-foreground">
              Sound
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="flex-1">Volume</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-32 accent-[var(--brand)]"
              />
            </label>
            <div className="mt-2 flex items-center justify-between rounded-lg border bg-muted/40 px-2.5 py-1.5 text-sm">
              <span className="flex items-center gap-1.5">
                {music ? <Music className="h-3.5 w-3.5" /> : <Music2 className="h-3.5 w-3.5 opacity-50" />}
                Focus music
              </span>
              <button
                onClick={() => setMusic(!music)}
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  music ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {music ? "On" : "Off"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

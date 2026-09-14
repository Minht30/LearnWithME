"use client";

/**
 * Client-side theme + preferences store.
 *
 * We keep this tiny and framework-free — no context provider needed.
 * All keys live in localStorage and mirror to data-* attributes on <html>
 * so styling is fully CSS-driven and swaps instantly.
 */

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
export type FontFamily = "default" | "dyslexic";
export type FontSize = "sm" | "md" | "lg" | "xl";

const STORAGE_KEYS = {
  theme: "lwm.theme",
  font: "lwm.font",
  fontSize: "lwm.fs",
  sound: "lwm.sound",
  volume: "lwm.volume",
  music: "lwm.music",
  zen: "lwm.zen",
  encourage: "lwm.encourage",
} as const;

function readLS(k: string): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(k); } catch { return null; }
}
function writeLS(k: string, v: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch { /* ignore */ }
}

/** Runs on the client and stamps <html> with the persisted preferences. */
export function applyStoredPrefs() {
  if (typeof document === "undefined") return;
  const html = document.documentElement;

  const savedTheme = readLS(STORAGE_KEYS.theme) as Theme | null;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const theme: Theme = savedTheme ?? (prefersDark ? "dark" : "light");
  html.classList.toggle("dark", theme === "dark");
  html.dataset.theme = theme;

  const font = (readLS(STORAGE_KEYS.font) as FontFamily | null) ?? "default";
  html.dataset.font = font;

  const fs = (readLS(STORAGE_KEYS.fontSize) as FontSize | null) ?? "md";
  html.dataset.fs = fs;

  const zen = readLS(STORAGE_KEYS.zen) === "1";
  html.dataset.zen = zen ? "1" : "0";
}

/** Update theme with instant persistence. */
export function setTheme(t: Theme) {
  writeLS(STORAGE_KEYS.theme, t);
  const html = document.documentElement;
  html.classList.toggle("dark", t === "dark");
  html.dataset.theme = t;
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>("light");
  useEffect(() => {
    const html = document.documentElement;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState((html.dataset.theme as Theme | undefined) ?? "light");
  }, []);
  const update = (t: Theme) => {
    setTheme(t);
    setThemeState(t);
  };
  return [theme, update];
}

export function useFont(): [FontFamily, (f: FontFamily) => void] {
  const [font, setFontState] = useState<FontFamily>("default");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFontState((document.documentElement.dataset.font as FontFamily) ?? "default");
  }, []);
  return [font, (f) => {
    writeLS(STORAGE_KEYS.font, f);
    document.documentElement.dataset.font = f;
    setFontState(f);
  }];
}

export function useFontSize(): [FontSize, (f: FontSize) => void] {
  const [fs, setFsState] = useState<FontSize>("md");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFsState((document.documentElement.dataset.fs as FontSize) ?? "md");
  }, []);
  return [fs, (f) => {
    writeLS(STORAGE_KEYS.fontSize, f);
    document.documentElement.dataset.fs = f;
    setFsState(f);
  }];
}

export function useZen(): [boolean, (v: boolean) => void] {
  const [zen, setZenState] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setZenState(document.documentElement.dataset.zen === "1");
  }, []);
  return [zen, (v) => {
    writeLS(STORAGE_KEYS.zen, v ? "1" : "0");
    document.documentElement.dataset.zen = v ? "1" : "0";
    setZenState(v);
  }];
}

export function useSoundPref(): {
  sound: boolean;
  setSound: (v: boolean) => void;
  volume: number;
  setVolume: (v: number) => void;
  music: boolean;
  setMusic: (v: boolean) => void;
} {
  const [sound, setSoundState] = useState(true);
  const [volume, setVolumeState] = useState(0.7);
  const [music, setMusicState] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoundState(readLS(STORAGE_KEYS.sound) !== "0");
    const v = parseFloat(readLS(STORAGE_KEYS.volume) ?? "0.7");
    if (!Number.isNaN(v)) setVolumeState(Math.min(1, Math.max(0, v)));
    setMusicState(readLS(STORAGE_KEYS.music) === "1");
  }, []);

  return {
    sound,
    setSound: (v) => { writeLS(STORAGE_KEYS.sound, v ? "1" : "0"); setSoundState(v); },
    volume,
    setVolume: (v) => { writeLS(STORAGE_KEYS.volume, String(v)); setVolumeState(v); },
    music,
    setMusic: (v) => { writeLS(STORAGE_KEYS.music, v ? "1" : "0"); setMusicState(v); },
  };
}

export function useEncouragementPref(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOn(readLS(STORAGE_KEYS.encourage) !== "0");
  }, []);
  return [on, (v) => { writeLS(STORAGE_KEYS.encourage, v ? "1" : "0"); setOn(v); }];
}

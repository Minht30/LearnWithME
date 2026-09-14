"use client";

/**
 * Pure-SVG avatar system. 12 preset critter faces built with primitives.
 * Each avatar id is stable so we can round-trip through DB / localStorage.
 */

import { useEffect, useState } from "react";

export type AvatarId =
  | "star" | "bunny" | "fox" | "owl" | "cat" | "panda"
  | "dino" | "robot" | "unicorn" | "ghost" | "penguin" | "frog";

export const AVATAR_IDS: AvatarId[] = [
  "star", "bunny", "fox", "owl", "cat", "panda",
  "dino", "robot", "unicorn", "ghost", "penguin", "frog",
];

const LS_KEY = "lwm.avatar";

export function loadAvatar(): AvatarId {
  if (typeof window === "undefined") return "star";
  try {
    const v = localStorage.getItem(LS_KEY) as AvatarId | null;
    return v && AVATAR_IDS.includes(v) ? v : "star";
  } catch { return "star"; }
}
export function saveAvatar(id: AvatarId) {
  try { localStorage.setItem(LS_KEY, id); } catch {}
}

export function Avatar({ id, size = 44 }: { id: AvatarId; size?: number }) {
  const s = size;
  const base = (
    <circle cx="50" cy="50" r="46" fill={COLORS[id].bg} stroke={COLORS[id].stroke} strokeWidth="2" />
  );
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label={id}>
      {base}
      {SHAPES[id]}
    </svg>
  );
}

export function AvatarPicker({
  value,
  onChange,
}: {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {AVATAR_IDS.map((id) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`rounded-2xl border-2 p-1 transition-all ${
            value === id
              ? "border-primary bg-primary/10 scale-105"
              : "border-transparent hover:border-border hover:bg-muted/50"
          }`}
          aria-label={`Choose ${id}`}
        >
          <Avatar id={id} size={44} />
        </button>
      ))}
    </div>
  );
}

/** Optional stateful picker with localStorage persistence. */
export function useAvatar(): [AvatarId, (id: AvatarId) => void] {
  const [id, setId] = useState<AvatarId>("star");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setId(loadAvatar());
  }, []);
  const update = (v: AvatarId) => { setId(v); saveAvatar(v); };
  return [id, update];
}

// ------- palette + shapes -----------------------------------------------------

const COLORS: Record<AvatarId, { bg: string; stroke: string }> = {
  star:     { bg: "#ffd88a", stroke: "#f0a34a" },
  bunny:    { bg: "#fff0f6", stroke: "#ffb3c8" },
  fox:      { bg: "#ffb872", stroke: "#e58032" },
  owl:      { bg: "#d6c7f0", stroke: "#9a86c4" },
  cat:      { bg: "#c1e7ff", stroke: "#6ba6d1" },
  panda:    { bg: "#f8f8f8", stroke: "#a0a0a0" },
  dino:     { bg: "#b8e0bb", stroke: "#4fa858" },
  robot:    { bg: "#c1d4ff", stroke: "#6a80c9" },
  unicorn:  { bg: "#ffd6f0", stroke: "#c66aaf" },
  ghost:    { bg: "#e5e5f8", stroke: "#9a9ac4" },
  penguin:  { bg: "#2a2a3f", stroke: "#0f0f28" },
  frog:     { bg: "#a8e6a1", stroke: "#4f9b48" },
};

// Reusable eye elements
const eyes = (cx1 = 38, cx2 = 62, cy = 50, r = 5) => (
  <>
    <circle cx={cx1} cy={cy} r={r} fill="#1a1a1a" />
    <circle cx={cx2} cy={cy} r={r} fill="#1a1a1a" />
    <circle cx={cx1 + 1.5} cy={cy - 1.5} r={r * 0.4} fill="white" />
    <circle cx={cx2 + 1.5} cy={cy - 1.5} r={r * 0.4} fill="white" />
  </>
);
const smile = (
  <path d="M40 65 Q50 74 60 65" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
);

const SHAPES: Record<AvatarId, React.ReactNode> = {
  star: (
    <>
      <polygon points="50,20 58,42 82,42 62,57 70,80 50,66 30,80 38,57 18,42 42,42" fill="#f5b841" stroke="#c88a20" strokeWidth="2" />
      {eyes(42, 58, 52, 3)}
    </>
  ),
  bunny: (
    <>
      <ellipse cx="36" cy="22" rx="6" ry="16" fill="#fff0f6" stroke="#ffb3c8" strokeWidth="2" />
      <ellipse cx="64" cy="22" rx="6" ry="16" fill="#fff0f6" stroke="#ffb3c8" strokeWidth="2" />
      <ellipse cx="36" cy="22" rx="3" ry="10" fill="#ffb3c8" />
      <ellipse cx="64" cy="22" rx="3" ry="10" fill="#ffb3c8" />
      {eyes()}
      <ellipse cx="50" cy="62" rx="4" ry="3" fill="#ff8fbf" />
      {smile}
    </>
  ),
  fox: (
    <>
      <path d="M20 22 L36 32 L28 44 Z" fill="#ffb872" stroke="#e58032" strokeWidth="2" />
      <path d="M80 22 L64 32 L72 44 Z" fill="#ffb872" stroke="#e58032" strokeWidth="2" />
      <path d="M40 60 Q50 68 60 60 L50 78 Z" fill="white" />
      {eyes()}
      <ellipse cx="50" cy="60" rx="3" ry="2.5" fill="#1a1a1a" />
      {smile}
    </>
  ),
  owl: (
    <>
      <circle cx="38" cy="48" r="10" fill="white" />
      <circle cx="62" cy="48" r="10" fill="white" />
      <circle cx="38" cy="48" r="5" fill="#1a1a1a" />
      <circle cx="62" cy="48" r="5" fill="#1a1a1a" />
      <path d="M45 62 L50 68 L55 62 Z" fill="#f5b841" />
      <path d="M18 20 L28 34 M82 20 L72 34" stroke="#9a86c4" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  cat: (
    <>
      <path d="M24 18 L38 34 L26 34 Z" fill="#c1e7ff" stroke="#6ba6d1" strokeWidth="2" />
      <path d="M76 18 L62 34 L74 34 Z" fill="#c1e7ff" stroke="#6ba6d1" strokeWidth="2" />
      {eyes()}
      <path d="M46 60 L54 60 L50 66 Z" fill="#ffb3c8" />
      <path d="M42 66 L50 66 L58 66" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  panda: (
    <>
      <circle cx="28" cy="30" r="10" fill="#1a1a1a" />
      <circle cx="72" cy="30" r="10" fill="#1a1a1a" />
      <ellipse cx="38" cy="52" rx="9" ry="10" fill="#1a1a1a" />
      <ellipse cx="62" cy="52" rx="9" ry="10" fill="#1a1a1a" />
      <circle cx="38" cy="52" r="4" fill="white" />
      <circle cx="62" cy="52" r="4" fill="white" />
      <circle cx="50" cy="66" r="3" fill="#1a1a1a" />
      {smile}
    </>
  ),
  dino: (
    <>
      <path d="M30 22 L36 30 L26 28 Z M42 18 L46 28 L38 26 Z M54 18 L58 28 L50 26 Z M66 22 L70 30 L60 28 Z" fill="#4fa858" />
      {eyes()}
      {smile}
    </>
  ),
  robot: (
    <>
      <rect x="30" y="36" width="40" height="30" rx="4" fill="#e5edff" stroke="#6a80c9" strokeWidth="2" />
      <rect x="38" y="45" width="10" height="10" fill="var(--brand)" />
      <rect x="52" y="45" width="10" height="10" fill="var(--brand-2)" />
      <line x1="50" y1="18" x2="50" y2="30" stroke="#6a80c9" strokeWidth="2" />
      <circle cx="50" cy="16" r="4" fill="var(--brand)" />
      <rect x="42" y="62" width="16" height="3" fill="#1a1a1a" />
    </>
  ),
  unicorn: (
    <>
      <path d="M50 8 L47 26 L53 26 Z" fill="#ffd88a" stroke="#c88a20" strokeWidth="2" />
      <path d="M28 24 Q34 22 40 26" stroke="#c66aaf" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M72 24 Q66 22 60 26" stroke="#c66aaf" strokeWidth="4" fill="none" strokeLinecap="round" />
      {eyes()}
      <circle cx="34" cy="60" r="3" fill="#ff9db1" opacity="0.7" />
      <circle cx="66" cy="60" r="3" fill="#ff9db1" opacity="0.7" />
      {smile}
    </>
  ),
  ghost: (
    <>
      <path d="M22 40 Q22 20 50 20 Q78 20 78 40 L78 80 L70 74 L60 80 L50 74 L40 80 L30 74 L22 80 Z" fill="white" stroke="#9a9ac4" strokeWidth="2" />
      {eyes(42, 58, 48, 4)}
      <ellipse cx="50" cy="60" rx="5" ry="3" fill="#1a1a1a" />
    </>
  ),
  penguin: (
    <>
      <ellipse cx="50" cy="60" rx="26" ry="30" fill="white" />
      <path d="M50 30 Q30 30 30 50 L30 66 Q50 76 70 66 L70 50 Q70 30 50 30 Z" fill="white" />
      <circle cx="42" cy="46" r="4" fill="#1a1a1a" />
      <circle cx="58" cy="46" r="4" fill="#1a1a1a" />
      <path d="M46 54 L50 60 L54 54 Z" fill="#f5b841" />
    </>
  ),
  frog: (
    <>
      <circle cx="34" cy="34" r="10" fill="#e5f9df" stroke="#4f9b48" strokeWidth="2" />
      <circle cx="66" cy="34" r="10" fill="#e5f9df" stroke="#4f9b48" strokeWidth="2" />
      <circle cx="34" cy="36" r="4" fill="#1a1a1a" />
      <circle cx="66" cy="36" r="4" fill="#1a1a1a" />
      <path d="M32 62 Q50 76 68 62" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
};

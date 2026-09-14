"use client";

import { motion } from "framer-motion";

export type MascotMood = "idle" | "thinking" | "cheer" | "sad" | "wave";

/**
 * A tiny star/owl-ish SVG buddy. Pure inline SVG — no assets.
 * Sizes: sm (48), md (72), lg (112). Uses theme accent colors.
 */
export function Mascot({
  mood = "idle",
  size = 72,
}: {
  mood?: MascotMood;
  size?: number;
}) {
  const bounce =
    mood === "cheer"
      ? { y: [-2, -14, -2, -10, -2], rotate: [0, -8, 0, 8, 0] }
      : mood === "wave"
      ? { rotate: [0, 8, -6, 6, 0] }
      : mood === "thinking"
      ? { y: [0, -3, 0] }
      : mood === "sad"
      ? { y: [0, 2, 0] }
      : { y: [0, -4, 0] };

  const eyeShape =
    mood === "cheer" ? "arc" : mood === "sad" ? "sad" : mood === "thinking" ? "wink" : "open";

  return (
    <motion.svg
      animate={bounce}
      transition={{
        duration: mood === "cheer" ? 0.7 : 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-sm"
    >
      <defs>
        <linearGradient id="mascot-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--brand-2)" />
        </linearGradient>
        <radialGradient id="mascot-belly" cx="0.5" cy="0.6" r="0.5">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.3)" />
        </radialGradient>
      </defs>

      {/* body */}
      <ellipse cx="50" cy="55" rx="34" ry="36" fill="url(#mascot-body)" />
      <ellipse cx="50" cy="63" rx="22" ry="22" fill="url(#mascot-belly)" opacity="0.55" />

      {/* rounded bunny ears */}
      <ellipse cx="30" cy="20" rx="6" ry="14" fill="var(--brand)" transform="rotate(-14 30 20)" />
      <ellipse cx="70" cy="20" rx="6" ry="14" fill="var(--brand)" transform="rotate(14 70 20)" />
      <ellipse cx="30" cy="22" rx="2.5" ry="8" fill="#ffd0dc" transform="rotate(-14 30 22)" />
      <ellipse cx="70" cy="22" rx="2.5" ry="8" fill="#ffd0dc" transform="rotate(14 70 22)" />

      {/* eyes */}
      {eyeShape === "open" && (
        <>
          <circle cx="38" cy="48" r="6" fill="#1a1a1a" />
          <circle cx="62" cy="48" r="6" fill="#1a1a1a" />
          <circle cx="40" cy="46" r="2" fill="white" />
          <circle cx="64" cy="46" r="2" fill="white" />
        </>
      )}
      {eyeShape === "arc" && (
        <>
          <path d="M32 48 Q38 42 44 48" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M56 48 Q62 42 68 48" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}
      {eyeShape === "wink" && (
        <>
          <circle cx="38" cy="48" r="5" fill="#1a1a1a" />
          <path d="M56 48 L68 48" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {eyeShape === "sad" && (
        <>
          <path d="M32 52 Q38 46 44 52" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M56 52 Q62 46 68 52" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* mouth */}
      {mood === "cheer" ? (
        <path d="M42 64 Q50 74 58 64" stroke="#1a1a1a" strokeWidth="3" fill="#ff6b8a" strokeLinecap="round" />
      ) : mood === "sad" ? (
        <path d="M42 68 Q50 62 58 68" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M43 66 Q50 71 57 66" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
      )}

      {/* cheeks */}
      <circle cx="30" cy="60" r="4" fill="#ff9db1" opacity="0.7" />
      <circle cx="70" cy="60" r="4" fill="#ff9db1" opacity="0.7" />

      {/* thinking bubble */}
      {mood === "thinking" && (
        <g>
          <circle cx="82" cy="26" r="4" fill="white" stroke="#1a1a1a" strokeWidth="1.5" />
          <circle cx="90" cy="18" r="6" fill="white" stroke="#1a1a1a" strokeWidth="1.5" />
        </g>
      )}
      {mood === "cheer" && (
        <>
          <text x="12" y="30" fontSize="12" fill="var(--warning)">✦</text>
          <text x="80" y="90" fontSize="12" fill="var(--brand)">✦</text>
        </>
      )}
    </motion.svg>
  );
}

"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  shape: "sq" | "ci" | "tri";
  life: number;
};

/**
 * DOM-canvas confetti burst. Renders when `fire` prop transitions truthy,
 * then fades out on its own. Neon-tinted in dark mode, pastel in light.
 */
export function Confetti({ fire, palette }: { fire: unknown; palette?: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (!fire || typeof window === "undefined") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.scale(dpr, dpr);
    };
    resize();

    const colors = palette && palette.length
      ? palette
      : document.documentElement.classList.contains("dark")
      ? ["#00f0ff", "#ff2e97", "#b4ff39", "#9d4edd", "#ffb84d"]
      : ["#ff7fa3", "#ffcfa0", "#b8e0bb", "#d6c7f0", "#f5b841"];

    const W = window.innerWidth;
    const H = window.innerHeight;

    const particles: Particle[] = [];
    for (let i = 0; i < 160; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 10 + Math.random() * 12;
      particles.push({
        x: W / 2 + (Math.random() - 0.5) * 100,
        y: H / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        shape: (["sq", "ci", "tri"] as const)[Math.floor(Math.random() * 3)],
        life: 1,
      });
    }
    particlesRef.current = particles;

    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(0.06, (t - last) / 1000);
      last = t;
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      for (const p of particlesRef.current) {
        p.vy += 22 * dt;                   // gravity
        p.vx *= 0.995;
        p.x += p.vx * 60 * dt;
        p.y += p.vy * 60 * dt;
        p.rot += p.vr;
        p.life -= dt * 0.35;
        if (p.life <= 0 || p.y > H + 40) continue;
        alive++;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === "sq") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else if (p.shape === "ci") {
          ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      if (alive > 0) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [fire, palette]);

  return <canvas ref={canvasRef} className="lwm-confetti-canvas" />;
}

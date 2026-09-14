"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ambient background particles.
 *   - Light "Blossom" — floating flower petals drifting up-and-side.
 *   - Dark "Neon Grid" — neon squares slowly rising with faint glow.
 *
 * Extremely low CPU: 22 particles, canvas 2d, throttled updates.
 * Hidden behind everything (z-index 0) with pointer-events none.
 */
export function IdleParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let W = window.innerWidth;
    let H = window.innerHeight;
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    type P = {
      x: number; y: number; vx: number; vy: number;
      size: number; rot: number; vr: number; hue: number;
    };
    const particles: P[] = Array.from({ length: 22 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.25 - Math.random() * 0.35,
      size: 6 + Math.random() * 10,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.02,
      hue: Math.random(),
    }));

    let running = true;
    const paletteLight = ["#ffcfd8", "#ffe3c7", "#dcc7f0", "#c9ecc9"];
    const paletteDark = ["#00f0ff", "#ff2e97", "#b4ff39", "#9d4edd"];

    const draw = () => {
      if (!running) return;
      const dark = document.documentElement.classList.contains("dark");
      const colors = dark ? paletteDark : paletteLight;
      ctx.clearRect(0, 0, W, H);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; }
        if (p.x < -20) p.x = W + 20;
        if (p.x > W + 20) p.x = -20;

        const color = colors[Math.floor(p.hue * colors.length) % colors.length];
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (dark) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.55;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.55;
          // petal — teardrop shape
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.55, p.size, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);

    return () => {
      running = false;
      window.removeEventListener("resize", resize);
    };
  }, [ready]);

  return <canvas ref={canvasRef} className="lwm-idle-particles zen-hide" aria-hidden />;
}

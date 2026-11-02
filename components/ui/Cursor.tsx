"use client";

import { useEffect, useRef } from "react";

export default function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    let x = window.innerWidth / 2, y = window.innerHeight / 2, rx = x, ry = y, scale = 1, hot = false, raf = 0;
    let last = performance.now();

    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      hot = !!(e.target as HTMLElement).closest?.("button,a,[role=tab]");
      if (dot.current) {
        dot.current.style.opacity = "1";
        dot.current.style.transform = `translate3d(${x}px,${y}px,0)`;
      }
      if (ring.current) ring.current.style.opacity = "1";
    };
    // Suavizado por tiempo (no por frame): el anillo se mueve igual a 60 que a 144 Hz, y la escala también se interpola.
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = 1 - Math.exp(-dt * 14);
      rx += (x - rx) * k;
      ry += (y - ry) * k;
      scale += ((hot ? 1.8 : 1) - scale) * (1 - Math.exp(-dt * 12));
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px,${ry}px,0) scale(${scale.toFixed(3)})`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", move);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={ring} className="cursor-ring" />
      <div ref={dot} className="cursor-dot" />
    </>
  );
}

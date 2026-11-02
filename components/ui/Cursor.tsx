"use client";

import { useEffect, useRef } from "react";

export default function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    let x = window.innerWidth / 2, y = window.innerHeight / 2, rx = x, ry = y, hot = false, raf = 0;

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
    const loop = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px,${ry}px,0) scale(${hot ? 1.8 : 1})`;
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
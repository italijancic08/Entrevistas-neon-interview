"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Anima la entrada de una escena: letras (.char) y bloques ([data-anim]).
 * Solo se animan opacity y transform (los dos únicos que la GPU resuelve sin recalcular layout ni
 * repintar); el blur por letra/bloque se eliminó porque con decenas de elementos provocaba tirones.
 */
export function useSceneIntro() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const chars = Array.from(el.querySelectorAll(".char"));
      if (chars.length) {
        const heavy = chars.length > 140; // textos largos: efecto liviano
        gsap.from(
          chars,
          heavy
            ? { opacity: 0, y: 10, duration: 0.55, ease: "power2.out", stagger: Math.min(0.012, 0.9 / chars.length), clearProps: "opacity,transform" }
            : {
                opacity: 0, y: 46, rotateX: -65, transformPerspective: 800, transformOrigin: "50% 100%",
                duration: 1.05, ease: "expo.out", stagger: Math.min(0.028, 0.75 / chars.length), clearProps: "opacity,transform",
              }
        );
      }
      gsap.from(el.querySelectorAll("[data-anim]"), {
        opacity: 0, y: 26, duration: 0.9, ease: "power3.out",
        stagger: 0.08, delay: 0.12, clearProps: "opacity,transform",
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return ref;
}

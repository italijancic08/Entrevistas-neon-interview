"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

/** Anima la entrada de una escena: letras (.char) y bloques ([data-anim]). */
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
            ? { opacity: 0, y: 12, duration: 0.5, ease: "power2.out", stagger: Math.min(0.02, 1.4 / chars.length), clearProps: "opacity,transform" }
            : {
                opacity: 0, y: 70, rotateX: -90, z: -200, filter: "blur(10px)", transformPerspective: 700,
                duration: 1, ease: "power4.out", stagger: 0.035, clearProps: "opacity,transform,filter",
              }
        );
      }
      gsap.from(el.querySelectorAll("[data-anim]"), {
        opacity: 0, y: 36, filter: "blur(12px)", duration: 0.9, ease: "power3.out",
        stagger: 0.12, delay: 0.15, clearProps: "opacity,transform,filter",
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return ref;
}
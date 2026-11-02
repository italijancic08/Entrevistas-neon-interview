"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { FIRST_QUESTION, LAST, STEPS, type Mode, type View } from "@/lib/steps";
import type { InterviewerId } from "@/data/interviews";
import { useDevice } from "@/hooks/useDevice";
import Hud from "./Hud";
import Loader from "@/components/ui/Loader";
import IntroScene from "@/components/scenes/IntroScene";
import InterviewersScene from "@/components/scenes/InterviewersScene";
import ComparisonScene from "@/components/scenes/ComparisonScene";
import IndividualScene from "@/components/scenes/IndividualScene";
import ConclusionScene from "@/components/scenes/ConclusionScene";
import FinalScene from "@/components/scenes/FinalScene";

const Stage = dynamic(() => import("@/components/three/Stage"), { ssr: false, loading: () => <Loader /> });

const INITIAL: View = { step: 0, mode: "compare", selected: 1 };

export default function Presentation() {
  const device = useDevice();
  const [view, setView] = useState<View>(INITIAL); // estado inmediato (escena 3D, HUD)
  const [shown, setShown] = useState<View>(INITIAL); // estado del texto (cambia tras la salida animada)
  const [hover, setHover] = useState<number | null>(null);

  const viewRef = useRef<View>(INITIAL);
  const lock = useRef(false);
  const pending = useRef<{ patch: Partial<View>; dir: number } | null>(null); // último pedido recibido durante una transición
  const commitRef = useRef<(patch: Partial<View>, dir: number) => void>(() => {});
  const dirRef = useRef(1);
  const overlayRef = useRef<HTMLDivElement>(null);
  const reducedRef = useRef(device.reduced);

  useEffect(() => {
    reducedRef.current = device.reduced;
  }, [device.reduced]);

  const handleHover = useCallback((i: number | null) => {
    setHover(i);
    document.body.style.cursor = i === null ? "" : "pointer";
  }, []);

  const commit = useCallback(
    (patch: Partial<View>, dir: number) => {
      // Si llega un pedido en plena transición no se descarta: queda en cola y se aplica apenas termina.
      if (lock.current) {
        pending.current = { patch, dir };
        return;
      }
      const cur = viewRef.current;
      const next: View = { ...cur, ...patch };
      if (next.step === cur.step && next.mode === cur.mode && next.selected === cur.selected) return;

      lock.current = true;
      viewRef.current = next;
      dirRef.current = dir;
      handleHover(null);
      setView(next);

      const release = () => {
        lock.current = false;
        const p = pending.current;
        if (p) {
          pending.current = null;
          commitRef.current(p.patch, p.dir);
        }
      };
      const finish = () => {
        setShown(next);
        window.setTimeout(release, 160);
      };
      const el = overlayRef.current;
      if (!el || reducedRef.current) {
        finish();
        return;
      }
      // Salida: solo opacidad + desplazamiento (sin filter: un blur sobre toda la pantalla es carísimo para la GPU).
      gsap.killTweensOf(el);
      gsap.to(el, { opacity: 0, x: -40 * dir, duration: 0.36, ease: "power2.inOut", force3D: true, onComplete: finish });
    },
    [handleHover]
  );
  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  const goTo = useCallback(
    (step: number, extra: Partial<View> = {}) => {
      const s = Math.max(0, Math.min(LAST, step));
      commit({ ...extra, step: s }, s >= viewRef.current.step ? 1 : -1);
    },
    [commit]
  );
  const next = useCallback(() => goTo(viewRef.current.step + 1), [goTo]);
  const prev = useCallback(() => goTo(viewRef.current.step - 1), [goTo]);
  const setMode = useCallback((m: Mode) => commit({ mode: m }, 1), [commit]);
  const setWho = useCallback((n: InterviewerId) => commit({ selected: n }, n >= viewRef.current.selected ? 1 : -1), [commit]);
  const selectInterviewer = useCallback((n: InterviewerId) => goTo(FIRST_QUESTION, { mode: "single", selected: n }), [goTo]);

  // Teclado, rueda y gestos táctiles
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const onControl = !!t && ["BUTTON", "INPUT", "TEXTAREA"].includes(t.tagName);
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !onControl)) {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      } else if (e.key === "Home") goTo(0);
      else if (e.key === "End") goTo(LAST);
    };

    let acc = 0, last = 0, timer = 0;
    const onWheel = (e: WheelEvent) => {
      const sc = (e.target as HTMLElement).closest?.("[data-scroll]") as HTMLElement | null;
      if (sc && sc.scrollHeight > sc.clientHeight + 2) {
        const atTop = sc.scrollTop <= 0;
        const atBottom = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2;
        if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) return;
      }
      acc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => (acc = 0), 150);
      if (Math.abs(acc) > 60 && Date.now() - last > 700) {
        if (acc > 0) next();
        else prev();
        acc = 0;
        last = Date.now();
      }
    };

    let sx = 0, sy = 0;
    const onTouchStart = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        if (dx < 0) next();
        else prev();
      }
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.clearTimeout(timer);
    };
  }, [next, prev, goTo]);

  // Al cambiar el contenido visible, se restablece el contenedor (la entrada la anima cada escena)
  useLayoutEffect(() => {
    const el = overlayRef.current;
    if (el) gsap.set(el, { clearProps: "opacity,transform" });
  }, [shown]);

  const s = STEPS[shown.step];
  const portrait = device.portrait;
  let scene: ReactNode = null;
  switch (s.kind) {
    case "intro":
      scene = <IntroScene portrait={portrait} onStart={() => goTo(1)} />;
      break;
    case "presentation":
      scene = <InterviewersScene portrait={portrait} onSelect={selectInterviewer} onCompare={() => goTo(FIRST_QUESTION, { mode: "compare" })} onHover={handleHover} />;
      break;
    case "question":
      scene =
        shown.mode === "compare" ? (
          <ComparisonScene q={s.q} portrait={portrait} />
        ) : (
          <IndividualScene q={s.q} who={shown.selected} portrait={portrait} onWho={setWho} onQuestion={(q) => goTo(FIRST_QUESTION + q)} />
        );
      break;
    case "conclusion":
      scene = <ConclusionScene f={s.f} portrait={portrait} />;
      break;
    default:
      scene = <FinalScene portrait={portrait} onHome={() => goTo(0, { mode: "compare", selected: 1 })} onRepeat={() => goTo(1, { mode: "compare", selected: 1 })} />;
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-bg">
      <Stage view={view} dirRef={dirRef} device={device} hovered={hover} onHover={handleHover} onSelect={selectInterviewer} />

      <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-10">
        <div key={`${shown.step}-${shown.mode}-${shown.selected}`} className="absolute inset-0">
          {scene}
        </div>
      </div>

      <Hud step={view.step} mode={view.mode} onMode={setMode} onGo={(i) => goTo(i)} onPrev={prev} onNext={next} />
    </div>
  );
}
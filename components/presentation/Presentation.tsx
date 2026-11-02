"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { FIRST_QUESTION, LAST, STEPS, type Mode, type View } from "@/lib/steps";
import type { InterviewerId } from "@/data/interviews";
import { useDevice } from "@/hooks/useDevice";
import Hud from "./Hud";
import Cursor from "@/components/ui/Cursor";
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
  const dirRef = useRef(1);
  const overlayRef = useRef<HTMLDivElement>(null);
  const coordRef = useRef<HTMLSpanElement>(null);
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
      if (lock.current) return;
      const cur = viewRef.current;
      const next: View = { ...cur, ...patch };
      if (next.step === cur.step && next.mode === cur.mode && next.selected === cur.selected) return;

      lock.current = true;
      viewRef.current = next;
      dirRef.current = dir;
      handleHover(null);
      setView(next);

      const finish = () => {
        setShown(next);
        window.setTimeout(() => {
          lock.current = false;
        }, 350);
      };
      const el = overlayRef.current;
      if (!el || reducedRef.current) {
        finish();
        return;
      }
      gsap.to(el, { opacity: 0, x: -48 * dir, filter: "blur(8px)", duration: 0.28, ease: "power2.in", onComplete: finish });
    },
    [handleHover]
  );

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

  // Parallax del título y coordenadas decorativas
  useEffect(() => {
    const h = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      const root = document.documentElement.style;
      root.setProperty("--mx", x.toFixed(3));
      root.setProperty("--my", y.toFixed(3));
      if (coordRef.current) coordRef.current.textContent = `X ${x.toFixed(2)} · Y ${(-y).toFixed(2)}`;
    };
    window.addEventListener("pointermove", h);
    return () => window.removeEventListener("pointermove", h);
  }, []);

  // Al cambiar el contenido visible, se restablece el contenedor (la entrada la anima cada escena)
  useLayoutEffect(() => {
    const el = overlayRef.current;
    if (el) gsap.set(el, { clearProps: "opacity,transform,filter" });
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

      <div className="fx-nebula" />
      <div className="fx-vig" />
      <div className="fx-scan" />
      <div className="fx-line" style={{ top: "22%" }} />
      <div className="fx-line m" style={{ top: "61%", animationDelay: "-3s" }} />
      <div className="fx-line" style={{ top: "83%", animationDelay: "-5s" }} />

      <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-10">
        <div key={`${shown.step}-${shown.mode}-${shown.selected}`} className="absolute inset-0">
          {scene}
        </div>
      </div>

      <Hud step={view.step} mode={view.mode} onMode={setMode} onGo={(i) => goTo(i)} onPrev={prev} onNext={next} coordRef={coordRef} />
      <Cursor />
    </div>
  );
}
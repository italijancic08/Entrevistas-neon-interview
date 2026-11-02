"use client";

import type { RefObject } from "react";
import { LAST, STEPS, type Mode, type Step } from "@/lib/steps";
import ModeSelector from "@/components/ui/ModeSelector";

const pad = (n: number) => String(n).padStart(2, "0");

function label(s: Step) {
  switch (s.kind) {
    case "intro": return "ESCENA 01 · INTRODUCCIÓN";
    case "presentation": return "ESCENA 02 · PRESENTACIÓN";
    case "question": return `ESCENA 03 · PREGUNTA 0${s.q + 1}`;
    case "conclusion": return "ESCENA 04 · CONCLUSIONES";
    default: return "ESCENA 05 · CIERRE";
  }
}

interface Props {
  step: number;
  mode: Mode;
  onMode: (m: Mode) => void;
  onGo: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
  coordRef: RefObject<HTMLSpanElement | null>;
}

function Arrow({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <button className="nav-arrow" aria-label={dir === "next" ? "Siguiente" : "Anterior"} disabled={disabled} onClick={onClick}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ transform: dir === "prev" ? "rotate(180deg)" : undefined }}>
        <path d="M3 12h17M14 6l6 6-6 6" />
      </svg>
    </button>
  );
}

export default function Hud({ step, mode, onMode, onGo, onPrev, onNext, coordRef }: Props) {
  const s = STEPS[step];
  return (
    <>
      <div className="pointer-events-none fixed left-0 top-0 z-20 h-[2px] w-full">
        <div className="h-full bg-gradient-to-r from-neon-cyan to-neon-magenta transition-[width] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `${(step / LAST) * 100}%` }} />
      </div>

      <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between px-5 pt-4 md:px-12 md:pt-6">
        <div>
          <p className="font-display text-xs font-black tracking-[0.35em] text-ice md:text-sm">
            NEON<span className="text-neon-magenta">_</span>INTERVIEW
          </p>
          <p className="mt-1 hidden font-mono text-[10px] tracking-[0.25em] text-ice/45 md:block">
            <span ref={coordRef}>X 0.00 · Y 0.00</span>
          </p>
        </div>
        <div className="text-right font-mono text-[10px] tracking-[0.25em] text-ice/60 md:text-[11px]">
          <p className="text-neon-cyan">{label(s)}</p>
          <p>
            {pad(step + 1)} / {pad(STEPS.length)}
          </p>
        </div>
      </header>

      {s.kind === "question" && (
        <div className="fixed left-1/2 top-14 z-20 -translate-x-1/2 md:top-4">
          <ModeSelector mode={mode} onChange={onMode} />
        </div>
      )}

      <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 px-4 pb-5 md:px-12 md:pb-7">
        <Arrow dir="prev" disabled={step === 0} onClick={onPrev} />
        <div className="pointer-events-auto flex items-center gap-[5px] md:gap-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              aria-label={`Ir al paso ${i + 1}`}
              onClick={() => onGo(i)}
              className={`h-[6px] cursor-pointer rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                i === step ? "w-7 bg-neon-magenta shadow-[0_0_12px_#FF315F]" : i < step ? "w-[6px] bg-neon-cyan/80" : "w-[6px] bg-ice/25"
              }`}
            />
          ))}
        </div>
        <Arrow dir="next" disabled={step === LAST} onClick={onNext} />
      </footer>
    </>
  );
}
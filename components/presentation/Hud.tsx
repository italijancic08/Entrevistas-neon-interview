"use client";

import { FIRST_CONCLUSION, FIRST_QUESTION, LAST, STEPS, type Mode, type Step } from "@/lib/steps";
import ModeSelector from "@/components/ui/ModeSelector";

const pad = (n: number) => String(n).padStart(2, "0");

const NAV: { label: string; step: number; kind: Step["kind"] }[] = [
  { label: "Inicio", step: 0, kind: "intro" },
  { label: "Entrevistados", step: 1, kind: "presentation" },
  { label: "Preguntas", step: FIRST_QUESTION, kind: "question" },
  { label: "Conclusiones", step: FIRST_CONCLUSION, kind: "conclusion" },
  { label: "Cierre", step: LAST, kind: "final" },
];

interface Props {
  step: number;
  mode: Mode;
  onMode: (m: Mode) => void;
  onGo: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

/** Flecha fina con círculo, como la de la referencia. La anterior es la misma, espejada por CSS. */
function Arrow({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <button className="arrow-btn" data-dir={dir} aria-label={dir === "next" ? "Siguiente" : "Anterior"} disabled={disabled} onClick={onClick}>
      <svg width="108" height="44" viewBox="0 0 108 44" fill="none" stroke="currentColor">
        <circle cx="86" cy="22" r="20" strokeWidth="1" opacity="0.35" />
        <g className="arrow-line" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 22H88" />
          <path d="M82 16.5 88 22 82 27.5" />
        </g>
      </svg>
    </button>
  );
}

export default function Hud({ step, mode, onMode, onGo, onPrev, onNext }: Props) {
  const s = STEPS[step];
  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between px-6 pt-6 md:px-14 md:pt-8">
        <p className="font-display text-[0.72rem] font-bold tracking-[0.34em] text-ice">NEON INTERVIEW</p>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex" aria-label="Escenas">
          {NAV.map((n) => (
            <button key={n.label} className="nav-link" aria-current={s.kind === n.kind} onClick={() => onGo(n.step)}>
              {n.label}
            </button>
          ))}
        </nav>

        <p className="font-display text-[0.68rem] font-medium tracking-[0.25em] text-ice/60">
          <span className="text-ice">{pad(step + 1)}</span> / {pad(STEPS.length)}
        </p>
      </header>

      {s.kind === "question" && (
        <div className="fixed left-1/2 top-14 z-20 -translate-x-1/2 md:top-[4.4rem]">
          <ModeSelector mode={mode} onChange={onMode} />
        </div>
      )}

      <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 px-4 pb-6 md:px-14 md:pb-8">
        <Arrow dir="prev" disabled={step === 0} onClick={onPrev} />
        <div className="pointer-events-auto flex items-center gap-[6px] md:gap-[9px]">
          {STEPS.map((_, i) => (
            <button
              key={i}
              aria-label={`Ir al paso ${i + 1}`}
              onClick={() => onGo(i)}
              className={`step-dot ${i === step ? "on" : i < step ? "done" : ""}`}
            />
          ))}
        </div>
        <Arrow dir="next" disabled={step === LAST} onClick={onNext} />
      </footer>
    </>
  );
}

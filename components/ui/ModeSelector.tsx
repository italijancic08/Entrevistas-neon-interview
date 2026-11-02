"use client";

import type { Mode } from "@/lib/steps";

export default function ModeSelector({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="mode-selector" role="tablist" aria-label="Modalidad de presentación">
      <span className="mode-thumb" style={{ transform: mode === "compare" ? "translateX(0)" : "translateX(100%)" }} />
      <button role="tab" aria-selected={mode === "compare"} onClick={() => onChange("compare")}>
        COMPARATIVO
      </button>
      <button role="tab" aria-selected={mode === "single"} onClick={() => onChange("single")}>
        INDIVIDUAL
      </button>
    </div>
  );
}
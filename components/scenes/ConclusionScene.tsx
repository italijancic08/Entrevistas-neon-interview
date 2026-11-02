"use client";

import { Fragment } from "react";
import { CONCLUSION, CONCLUSION_TITLE, INTERVIEWERS } from "@/data/interviews";
import { THEMES } from "@/lib/theme";
import { useSceneIntro } from "@/hooks/useSceneIntro";
import SplitText from "@/components/ui/SplitText";

const pad = (n: number) => String(n).padStart(2, "0");

export default function ConclusionScene({ f, portrait }: { f: number; portrait: boolean }) {
  const ref = useSceneIntro();
  const text = CONCLUSION[f];
  const long = text.length > 250;

  return (
    <div ref={ref} className={`absolute inset-0 flex flex-col justify-between px-5 pb-24 md:px-14 ${portrait ? "pt-24" : "pt-20"}`}>
      <div>
        <p data-anim className="font-mono text-[11px] tracking-[0.4em] text-neon-magenta">
          // ESCENA_04 · CONCLUSIONES
        </p>
        <h2 className="mt-3 font-display font-black leading-tight text-[length:clamp(1.1rem,3.2vw,3rem)]">
          {f === 0 ? (
            <>
              <SplitText text={CONCLUSION_TITLE[0]} />
              <br />
              <span className="text-neon-cyan">
                <SplitText text={CONCLUSION_TITLE[1]} />
              </span>
            </>
          ) : (
            <span data-anim>
              {CONCLUSION_TITLE[0]}
              <br />
              <span className="text-neon-cyan">{CONCLUSION_TITLE[1]}</span>
            </span>
          )}
        </h2>
      </div>

      <div className="holo-frame w-full self-center md:max-w-[920px]">
        <div data-anim className="mb-3 flex items-center gap-3 font-mono text-[10px] tracking-[0.25em] text-ice/60">
          {INTERVIEWERS.map((n, i) => (
            <Fragment key={n}>
              {i > 0 && <span className="h-px w-8 bg-neon-cyan/40" />}
              <span className="node" style={{ color: THEMES[n - 1].a }} />
              <span>0{n}</span>
            </Fragment>
          ))}
          <span className="ml-auto">
            FRAGMENTO {pad(f + 1)}/{pad(CONCLUSION.length)}
          </span>
        </div>
        <div data-scroll className={`pointer-events-auto overflow-y-auto ${portrait ? "max-h-[46vh]" : "max-h-[36vh]"}`}>
          <p className={`leading-relaxed text-ice ${long ? "text-[length:clamp(1rem,1.5vw,1.5rem)]" : "text-[length:clamp(1.15rem,2vw,2rem)]"}`}>
            <SplitText text={text} />
          </p>
        </div>
      </div>
    </div>
  );
}
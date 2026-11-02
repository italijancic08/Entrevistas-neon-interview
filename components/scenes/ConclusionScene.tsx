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
    <div ref={ref} className={`absolute inset-0 flex flex-col justify-between px-6 pb-28 md:px-14 ${portrait ? "pt-24" : "pt-28"}`}>
      <div>
        <p data-anim className="eyebrow">
          Escena 04 · Conclusiones
        </p>
        <h2 className="h-display mt-3 text-[length:clamp(1.1rem,3vw,2.8rem)]">
          {f === 0 ? (
            <>
              <SplitText text={CONCLUSION_TITLE[0]} />
              <br />
              <span className="soft">
                <SplitText text={CONCLUSION_TITLE[1]} />
              </span>
            </>
          ) : (
            <span data-anim>
              {CONCLUSION_TITLE[0]}
              <br />
              <span className="soft">{CONCLUSION_TITLE[1]}</span>
            </span>
          )}
        </h2>
      </div>

      <div className="card w-full self-center md:max-w-[920px]">
        <div data-anim className="eyebrow muted mb-4 flex items-center gap-3">
          {INTERVIEWERS.map((n, i) => (
            <Fragment key={n}>
              {i > 0 && <span className="h-px w-8 bg-ice/20" />}
              <span className="node" style={{ color: THEMES[n - 1].a }} />
              <span>0{n}</span>
            </Fragment>
          ))}
          <span className="ml-auto">
            Fragmento {pad(f + 1)}/{pad(CONCLUSION.length)}
          </span>
        </div>
        <div data-scroll className={`pointer-events-auto overflow-y-auto ${portrait ? "max-h-[46vh]" : "max-h-[36vh]"}`}>
          <p className={`lead !text-ice ${long ? "text-[length:clamp(1rem,1.4vw,1.4rem)]" : "text-[length:clamp(1.15rem,1.9vw,1.9rem)]"}`}>
            <SplitText text={text} />
          </p>
        </div>
      </div>
    </div>
  );
}

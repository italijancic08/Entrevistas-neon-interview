"use client";

import { INSTITUTION } from "@/data/interviews";
import { useSceneIntro } from "@/hooks/useSceneIntro";
import SplitText from "@/components/ui/SplitText";
import Button from "@/components/ui/Button";

interface Props {
  portrait: boolean;
  onHome: () => void;
  onRepeat: () => void;
}

export default function FinalScene({ portrait, onHome, onRepeat }: Props) {
  const ref = useSceneIntro();
  return (
    <div ref={ref} className="absolute inset-0 flex flex-col justify-end px-6 pb-28 pt-24 md:px-14">
      <div className={`grid gap-8 ${portrait ? "" : "grid-cols-[1.3fr_1fr] items-end"}`}>
        <div>
          <h2 className="h-display text-[length:clamp(1.3rem,3vw,3rem)]">
            <SplitText text="LA TECNOLOGÍA EVOLUCIONA." />
            <br />
            <span className="soft">
              <SplitText text="EL APRENDIZAJE CONTINÚA." />
            </span>
          </h2>
          <div data-anim className="mt-7 flex flex-wrap gap-3">
            <Button onClick={onHome}>Volver al inicio</Button>
            <Button variant="primary" onClick={onRepeat}>
              Repetir experiencia
            </Button>
          </div>
        </div>

        <div data-anim className="fine grid grid-cols-2 gap-x-6">
          <div>
            <p>
              <strong>{INSTITUTION.university}</strong>
            </p>
            <p>{INSTITUTION.faculty}</p>
            <p className="mt-2">{INSTITUTION.subject}</p>
            <p>{INSTITUTION.place}</p>
          </div>
          <div>
            <p className="eyebrow muted mb-1">Integrantes</p>
            {INSTITUTION.members.map((m) => (
              <p key={m}>{m}</p>
            ))}
          </div>
          <p className="col-span-2 mt-4 text-[0.7rem] opacity-70">
            Escaneo 3D de cabeza: «Infinite» de Lee Perry-Smith (CC BY 3.0) · triplegangers.com
          </p>
        </div>
      </div>
    </div>
  );
}

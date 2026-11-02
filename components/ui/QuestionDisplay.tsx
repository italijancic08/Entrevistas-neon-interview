import { QUESTIONS } from "@/data/interviews";
import SplitText from "./SplitText";

interface Props {
  q: number;
  compact?: boolean;
  center?: boolean;
}

export default function QuestionDisplay({ q, compact = false, center = false }: Props) {
  const Q = QUESTIONS[q];
  return (
    <header className={center ? "text-center" : ""}>
      <p data-anim className="font-mono text-[11px] tracking-[0.4em] text-neon-magenta md:text-xs">
        PREGUNTA 0{Q.id} <span className="text-ice/40">/ 0{QUESTIONS.length}</span>
      </p>
      <h2
        className={`mt-2 font-display font-bold leading-tight ${
          compact ? "text-[length:clamp(1.05rem,1.9vw,1.9rem)]" : "text-[length:clamp(1.1rem,2.6vw,2.5rem)]"
        }`}
      >
        <SplitText text={Q.text} />
      </h2>
    </header>
  );
}
import { Fragment } from "react";

export default function SplitText({ text, className = "" }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text}>
      {words.map((w, wi) => (
        <Fragment key={wi}>
          <span aria-hidden className="inline-block whitespace-nowrap">
            {Array.from(w).map((ch, i) => (
              <span key={i} className="char inline-block">
                {ch}
              </span>
            ))}
          </span>
          {wi < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </span>
  );
}
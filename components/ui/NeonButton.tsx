"use client";

import { useRef, type ButtonHTMLAttributes, type PointerEvent } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "cyan" | "magenta";
  size?: "md" | "sm";
  active?: boolean;
}

export default function NeonButton({ variant = "cyan", size = "md", active, className = "", children, onPointerMove, ...rest }: Props) {
  const ref = useRef<HTMLButtonElement>(null);

  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (el) {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    }
    onPointerMove?.(e);
  };

  return (
    <button
      ref={ref}
      type="button"
      className={`neon-btn ${variant === "magenta" ? "magenta" : ""} ${size === "sm" ? "sm" : ""} ${active ? "is-active" : ""} ${className}`}
      onPointerMove={move}
      {...rest}
    >
      <span>{children}</span>
    </button>
  );
}
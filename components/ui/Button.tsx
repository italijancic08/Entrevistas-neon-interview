import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  size?: "md" | "sm";
  active?: boolean;
}

export default function Button({ variant = "ghost", size = "md", active, className = "", children, ...rest }: Props) {
  return (
    <button
      type="button"
      className={`btn ${variant === "primary" ? "primary" : ""} ${size === "sm" ? "sm" : ""} ${active ? "is-active" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

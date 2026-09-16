import type { ButtonHTMLAttributes } from "react";

type ButtonStyleProps = {
  active?: boolean;
  size?: "sm" | "lg";
  variant?: "default" | "primary";
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyleProps;

const SIZES = {
  sm: "px-4 py-2",
  lg: "px-6 py-3",
};

export function buttonClass({ active = false, size = "sm", variant = "default" }: ButtonStyleProps = {}): string {
  if (variant === "primary") {
    return `border border-[var(--accent-text)] rounded-sm transition-colors duration-150 bg-[var(--accent-fill)] text-[var(--accent-on-fill)] hover:bg-[var(--accent-fill-hover)] ${SIZES[size]} disabled:opacity-40 disabled:pointer-events-none`;
  }
  return `border border-[var(--foreground)] rounded-sm transition-colors duration-150 ${SIZES[size]} disabled:opacity-40 disabled:pointer-events-none ${
    active
      ? "bg-[var(--foreground)] text-[var(--background)]"
      : "hover:bg-[var(--foreground)] hover:text-[var(--background)]"
  }`;
}

export default function Button({ active, size, variant, className = "", ...props }: ButtonProps) {
  return <button className={`${buttonClass({ active, size, variant })} ${className}`} {...props} />;
}

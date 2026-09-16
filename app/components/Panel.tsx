import type { HTMLAttributes } from "react";

type PanelProps = HTMLAttributes<HTMLDivElement> & { padding?: string };

export default function Panel({ padding = "p-4", className = "", ...props }: PanelProps) {
  return (
    <div
      className={`border border-[var(--foreground)] rounded-sm ${padding} ${className}`}
      {...props}
    />
  );
}

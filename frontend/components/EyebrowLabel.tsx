import type { ReactNode } from "react";

interface EyebrowLabelProps {
  children: ReactNode;
  className?: string;
}

export function EyebrowLabel({ children, className = "" }: EyebrowLabelProps) {
  return (
    <span
      className={`font-mono text-xs uppercase tracking-[0.15em] text-ink-secondary ${className}`}
    >
      {children}
    </span>
  );
}

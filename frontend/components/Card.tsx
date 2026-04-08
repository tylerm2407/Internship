import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-surface border border-surface-border rounded-lg p-6 ${className}`}
    >
      {children}
    </div>
  );
}

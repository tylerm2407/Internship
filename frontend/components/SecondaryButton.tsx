import type { ReactNode, ButtonHTMLAttributes } from "react";

interface SecondaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: SecondaryButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 bg-transparent text-ink-primary border border-surface-border rounded-md px-6 py-3 font-sans font-medium text-sm hover:bg-surface-hover transition-colors duration-200 ease-institutional cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

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
      className={`inline-flex items-center gap-2 bg-transparent text-ink-primary border border-surface-border hover:border-accent hover:text-accent rounded-md px-6 py-3 font-sans font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-colors duration-200 ease-institutional cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

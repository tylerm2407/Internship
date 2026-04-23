import type { ReactNode, ButtonHTMLAttributes } from "react";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
}

export function PrimaryButton({
  children,
  icon,
  className = "",
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 bg-brand text-white rounded-md px-6 py-3 font-sans font-medium text-sm hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-colors duration-200 ease-institutional cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
      {icon}
    </button>
  );
}

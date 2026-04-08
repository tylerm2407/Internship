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
      className={`inline-flex items-center gap-2 bg-accent text-white rounded-md px-6 py-3 font-sans font-medium text-sm hover:bg-accent-hover transition-colors duration-200 ease-institutional cursor-pointer ${className}`}
      {...props}
    >
      {children}
      {icon}
    </button>
  );
}

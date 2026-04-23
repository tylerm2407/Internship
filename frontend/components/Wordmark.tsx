import { BryantLogo } from "./BryantLogo";

/**
 * InternshipMatch wordmark locked up with the Bryant University seal.
 *
 * Lockup order (left to right): Bryant seal · thin divider · InternshipMatch
 * serif wordmark in gold. This follows co-branding conventions — the host
 * institution's mark sits to the left of the product wordmark so the
 * university is always the primary brand.
 *
 * Kept as span-based so callsites can wrap in <Link> / <a> without breaking
 * anchor semantics.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <BryantLogo variant="seal" height={28} alt="" />
      <span aria-hidden="true" className="h-6 w-px bg-surface-border" />
      <span className="font-serif text-xl font-medium text-accent">
        InternshipMatch
      </span>
    </span>
  );
}

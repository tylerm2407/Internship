import Link from "next/link";
import type { OpportunityResponse, FitTier } from "../lib/types";

interface OpportunityCardProps {
  opportunity: OpportunityResponse;
}

const TIER_STYLES: Record<FitTier, string> = {
  strong_match: "bg-green-50 text-green-800 border-green-200",
  reach: "bg-blue-50 text-blue-800 border-blue-200",
  long_shot: "bg-gray-100 text-gray-600 border-gray-200",
  not_recommended: "bg-red-50 text-red-700 border-red-200",
};

const TIER_LABELS: Record<FitTier, string> = {
  strong_match: "Strong match",
  reach: "Reach",
  long_shot: "Long shot",
  not_recommended: "Not recommended",
};

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "Rolling";
  const d = new Date(deadline);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "Closed";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff <= 30) return `${diff}d left`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const { posting, firm, fit_score } = opportunity;
  const tierStyle = TIER_STYLES[fit_score.tier] || TIER_STYLES.long_shot;
  const tierLabel = TIER_LABELS[fit_score.tier] || fit_score.tier;

  return (
    <Link href={`/opportunity/${posting.id}`} className="block">
      <div className="bg-surface border border-surface-border rounded-lg py-6 px-8 hover:bg-surface-hover transition-colors duration-200 ease-institutional cursor-pointer flex items-start gap-6">
        {/* Left — firm initial + tier badge */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="w-12 h-12 border border-surface-border rounded-md flex items-center justify-center">
            <span className="font-serif text-xl text-accent">
              {firm.name.charAt(0)}
            </span>
          </div>
          <span className="font-mono text-[10px] text-ink-secondary uppercase tracking-wider">
            {firm.tier.replace("_", " ")}
          </span>
        </div>

        {/* Center — details */}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-2xl leading-tight">{firm.name}</h3>
          <p className="text-lg text-ink-primary mt-0.5">{posting.title}</p>
          <p className="font-mono text-sm text-ink-secondary mt-1">
            {posting.location}
            <span className="mx-2">·</span>
            {formatDeadline(posting.deadline)}
            <span className="mx-2">·</span>
            {posting.class_year_target}
          </p>
          {fit_score.rationale && (
            <p className="text-base italic text-ink-secondary mt-2 line-clamp-2">
              {fit_score.rationale}
            </p>
          )}
        </div>

        {/* Right — score + tier pill */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="font-mono text-5xl tabular-nums font-medium text-accent leading-none">
            {fit_score.score}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded border ${tierStyle}`}
          >
            {tierLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import type { OpportunityResponse, FitTier, ScoreBreakdown } from "../lib/types";

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

const FACTOR_LABELS: Record<string, { label: string; max: number }> = {
  gpa: { label: "GPA", max: 25 },
  class_year: { label: "Class Year", max: 20 },
  role_match: { label: "Role Match", max: 20 },
  coursework: { label: "Coursework", max: 15 },
  geography: { label: "Geography", max: 10 },
  experience: { label: "Experience", max: 10 },
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

function BreakdownBar({ factor, value }: { factor: string; value: number }) {
  const config = FACTOR_LABELS[factor];
  if (!config) return null;
  const pct = Math.min((value / config.max) * 100, 100);

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs text-ink-secondary w-20 shrink-0 text-right">
        {config.label}
      </span>
      <div className="flex-1 h-2 bg-surface-hover rounded-sm overflow-hidden">
        <div
          className="h-full bg-accent rounded-sm transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-ink-secondary w-10 shrink-0">
        {value}/{config.max}
      </span>
    </div>
  );
}

function ScoreBreakdownPanel({ breakdown }: { breakdown: ScoreBreakdown }) {
  const factors: (keyof ScoreBreakdown)[] = [
    "gpa",
    "class_year",
    "role_match",
    "coursework",
    "geography",
    "experience",
  ];

  return (
    <div className="border-t border-surface-border pt-4 mt-4 space-y-2">
      {factors.map((factor) => (
        <BreakdownBar
          key={factor}
          factor={factor}
          value={breakdown[factor]}
        />
      ))}
    </div>
  );
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const { posting, firm, fit_score } = opportunity;
  const tierStyle = TIER_STYLES[fit_score.tier] || TIER_STYLES.long_shot;
  const tierLabel = TIER_LABELS[fit_score.tier] || fit_score.tier;
  const [expanded, setExpanded] = useState(false);
  const hasBreakdown = fit_score.breakdown !== null && fit_score.breakdown !== undefined;

  const handleScoreClick = (e: React.MouseEvent) => {
    if (!hasBreakdown) return;
    e.preventDefault();
    e.stopPropagation();
    setExpanded((prev) => !prev);
  };

  return (
    <Link href={`/opportunity/${posting.id}`} className="block">
      <div className="bg-surface border border-surface-border rounded-lg py-6 px-8 hover:bg-surface-hover transition-colors duration-200 ease-institutional cursor-pointer">
        <div className="flex items-start gap-6">
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
            <button
              type="button"
              onClick={handleScoreClick}
              className={`flex items-center gap-1 ${hasBreakdown ? "cursor-pointer" : "cursor-default"}`}
            >
              <span className="font-mono text-5xl tabular-nums font-medium text-accent leading-none">
                {fit_score.score}
              </span>
              {hasBreakdown && (
                expanded ? (
                  <CaretUp size={16} weight="regular" className="text-ink-tertiary mt-1" />
                ) : (
                  <CaretDown size={16} weight="regular" className="text-ink-tertiary mt-1" />
                )
              )}
            </button>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded border ${tierStyle}`}
            >
              {tierLabel}
            </span>
          </div>
        </div>

        {/* Expandable breakdown */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            expanded && fit_score.breakdown ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          {fit_score.breakdown && (
            <ScoreBreakdownPanel breakdown={fit_score.breakdown} />
          )}
        </div>
      </div>
    </Link>
  );
}

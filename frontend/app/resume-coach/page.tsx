"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkle,
  Warning,
  CheckCircle,
  ArrowClockwise,
  Copy,
  Check,
} from "@phosphor-icons/react";
import { getResumeCritique, createResumeCritique } from "../../lib/api";
import { AuthGuard } from "../../components/AuthGuard";
import { Card } from "../../components/Card";
import { EyebrowLabel } from "../../components/EyebrowLabel";
import { PrimaryButton } from "../../components/PrimaryButton";
import { NotificationBell } from "../../components/NotificationBell";
import { Wordmark } from "../../components/Wordmark";
import type {
  ResumeCritique,
  ResumeCritiqueTier,
  BulletFeedback,
  ResumeCategoryScores,
} from "../../lib/types";

const TIER_COPY: Record<ResumeCritiqueTier, { label: string; className: string }> = {
  strong: {
    label: "Strong",
    className: "bg-green-50 text-green-800 border-green-200",
  },
  competitive: {
    label: "Competitive",
    className: "bg-blue-50 text-blue-800 border-blue-200",
  },
  needs_work: {
    label: "Needs work",
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  major_gaps: {
    label: "Major gaps",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

const CATEGORY_CONFIG: Array<{ key: keyof ResumeCategoryScores; label: string; max: number }> = [
  { key: "bullet_impact", label: "Bullet impact", max: 30 },
  { key: "finance_specificity", label: "Finance specificity", max: 20 },
  { key: "metrics", label: "Metrics & outcomes", max: 15 },
  { key: "technical_signals", label: "Technical signals", max: 15 },
  { key: "clubs_and_leadership", label: "Clubs & leadership", max: 10 },
  { key: "formatting_and_polish", label: "Formatting & polish", max: 10 },
];

const VERDICT_CONFIG: Record<
  BulletFeedback["verdict"],
  { label: string; icon: typeof CheckCircle; className: string }
> = {
  strong: {
    label: "Strong",
    icon: CheckCircle,
    className: "text-green-700 bg-green-50 border-green-200",
  },
  acceptable: {
    label: "Acceptable",
    icon: Sparkle,
    className: "text-blue-700 bg-blue-50 border-blue-200",
  },
  weak: {
    label: "Weak",
    icon: Warning,
    className: "text-amber-700 bg-amber-50 border-amber-200",
  },
};

function CategoryBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs text-ink-secondary w-36 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-surface-hover rounded-sm overflow-hidden">
        <div
          className="h-full bg-accent rounded-sm transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums text-ink-secondary w-12 shrink-0 text-right">
        {value}/{max}
      </span>
    </div>
  );
}

function BulletRow({ bullet }: { bullet: BulletFeedback }) {
  const cfg = VERDICT_CONFIG[bullet.verdict];
  const Icon = cfg.icon;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!bullet.rewrite) return;
    try {
      await navigator.clipboard.writeText(bullet.rewrite);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — no-op
    }
  };

  return (
    <div className="border border-surface-border rounded-md p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink-primary flex-1">{bullet.original}</p>
        <span
          className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border ${cfg.className}`}
        >
          <Icon size={12} weight="fill" aria-hidden="true" />
          {cfg.label}
        </span>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-tertiary">
        {bullet.experience_org}
      </p>
      {bullet.issue && (
        <p className="text-xs text-ink-secondary border-l-2 border-amber-300 pl-3">
          <span className="font-medium text-ink-primary">Issue:</span> {bullet.issue}
        </p>
      )}
      {bullet.rewrite && (
        <div className="bg-accent-soft/60 border border-surface-border rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-secondary">
              Suggested rewrite
            </p>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy rewrite"
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={12} aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={12} aria-hidden="true" />
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="text-sm text-ink-primary">{bullet.rewrite}</p>
        </div>
      )}
    </div>
  );
}

export default function ResumeCoachPage() {
  const [critique, setCritique] = useState<ResumeCritique | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getResumeCritique();
      setCritique(data);
    } catch {
      setError("Couldn't load your last critique. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const fresh = await createResumeCritique();
      setCritique(fresh);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to generate a new critique. Check that your profile is saved, then retry.",
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur border-b border-surface-border bryant-stripe">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" aria-label="InternshipMatch home">
              <Wordmark />
            </Link>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <Link
                href="/dashboard"
                className="text-sm text-ink-secondary hover:text-ink-primary transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
            <div className="space-y-3">
              <EyebrowLabel>Resume Coach</EyebrowLabel>
              <h1 className="font-serif text-4xl tracking-tight">
                How competitive is your resume?
              </h1>
              <p className="text-ink-secondary max-w-2xl">
                We score your resume the way a finance recruiter would — bullet
                strength, metrics, finance specificity, technicals, and
                polish. Every rewrite preserves what you actually did; no
                fabricated numbers.
              </p>
            </div>

            {loading ? (
              <Card>
                <div className="py-8 flex items-center justify-center gap-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-accent rounded-full animate-pulse"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </Card>
            ) : !critique ? (
              <Card>
                <div className="py-10 text-center space-y-4">
                  <h2 className="font-serif text-2xl">Get your first critique</h2>
                  <p className="text-ink-secondary max-w-lg mx-auto">
                    This runs against the resume profile you uploaded. If you
                    haven&apos;t uploaded one yet,{" "}
                    <Link href="/upload" className="text-accent hover:underline">
                      start here
                    </Link>
                    .
                  </p>
                  <PrimaryButton onClick={handleGenerate} disabled={generating}>
                    {generating ? "Analyzing…" : "Generate critique"}
                  </PrimaryButton>
                  {error && (
                    <p role="alert" className="text-sm text-red-600 pt-2">
                      {error}
                    </p>
                  )}
                </div>
              </Card>
            ) : (
              <>
                {/* Overall score + tier */}
                <Card>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 py-2">
                    <div className="flex items-center gap-6">
                      <div className="text-left">
                        <p className="font-mono text-xs uppercase tracking-wider text-ink-secondary">
                          Overall
                        </p>
                        <p className="font-mono text-6xl tabular-nums font-medium text-accent leading-none mt-1">
                          {critique.overall_score}
                        </p>
                        <p className="font-mono text-xs text-ink-tertiary mt-1">/ 100</p>
                      </div>
                      <div className="space-y-2 max-w-md">
                        <span
                          className={`inline-flex text-xs font-medium px-2 py-0.5 rounded border ${TIER_COPY[critique.tier].className}`}
                        >
                          {TIER_COPY[critique.tier].label}
                        </span>
                        <p className="text-ink-primary">{critique.headline}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={generating}
                      aria-label="Regenerate critique"
                      className="shrink-0 inline-flex items-center gap-2 text-sm font-medium text-accent border border-surface-border hover:border-accent rounded-md px-4 py-2 cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <ArrowClockwise size={14} aria-hidden="true" />
                      {generating ? "Rerunning…" : "Rerun critique"}
                    </button>
                  </div>
                </Card>

                {error && (
                  <Card>
                    <p role="alert" className="text-sm text-red-600">
                      {error}
                    </p>
                  </Card>
                )}

                {/* Category breakdown */}
                <Card>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-serif text-xl">Breakdown</h2>
                      <span className="font-mono text-xs text-ink-tertiary">
                        weighted to 100
                      </span>
                    </div>
                    <div className="space-y-3">
                      {CATEGORY_CONFIG.map((c) => (
                        <CategoryBar
                          key={c.key}
                          label={c.label}
                          value={critique.category_scores[c.key]}
                          max={c.max}
                        />
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Top priorities + strengths */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <div className="space-y-3">
                      <EyebrowLabel>Priorities</EyebrowLabel>
                      <h2 className="font-serif text-xl">What to fix first</h2>
                      <ul className="space-y-3">
                        {critique.priorities.map((p, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm">
                            <span className="font-mono text-xs font-medium text-accent pt-0.5">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="text-ink-primary">{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                  <Card>
                    <div className="space-y-3">
                      <EyebrowLabel>Strengths</EyebrowLabel>
                      <h2 className="font-serif text-xl">What&apos;s working</h2>
                      <ul className="space-y-3">
                        {critique.strengths.length === 0 ? (
                          <li className="text-sm text-ink-tertiary">
                            No standout strengths yet — work through the priorities first.
                          </li>
                        ) : (
                          critique.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm">
                              <CheckCircle
                                size={16}
                                weight="fill"
                                aria-hidden="true"
                                className="text-accent shrink-0 mt-0.5"
                              />
                              <span className="text-ink-primary">{s}</span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </Card>
                </div>

                {/* Bullet-by-bullet feedback */}
                {critique.bullet_feedback.length > 0 && (
                  <Card>
                    <div className="space-y-4">
                      <div>
                        <h2 className="font-serif text-xl">Bullet-by-bullet</h2>
                        <p className="text-sm text-ink-secondary mt-1">
                          Every experience bullet with a verdict and, where it
                          helps, a truthful rewrite you can paste into your
                          resume.
                        </p>
                      </div>
                      <div className="space-y-3">
                        {critique.bullet_feedback.map((b, i) => (
                          <BulletRow key={i} bullet={b} />
                        ))}
                      </div>
                    </div>
                  </Card>
                )}

                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-tertiary text-center">
                  Last run {new Date(critique.created_at).toLocaleString()}
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Clock,
  CalendarBlank,
  GraduationCap,
  ArrowSquareOut,
  CheckCircle,
  WarningCircle,
  Buildings,
  Globe,
} from "@phosphor-icons/react";
import { getPosting, getFirm } from "../../../lib/api";
import { Card } from "../../../components/Card";
import { EyebrowLabel } from "../../../components/EyebrowLabel";
import { PrimaryButton } from "../../../components/PrimaryButton";
import type { Posting, Firm, FitTier } from "../../../lib/types";

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

const FIRM_TIER_LABELS: Record<string, string> = {
  bulge_bracket: "Bulge Bracket",
  elite_boutique: "Elite Boutique",
  middle_market: "Middle Market",
  boutique: "Boutique",
  regional: "Regional",
  buy_side: "Buy Side",
  quant: "Quant",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Rolling deadline";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function daysUntil(dateStr: string | null): string {
  if (!dateStr) return "No deadline";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "Deadline passed";
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `${diff} days remaining`;
}

interface FitData {
  score: number;
  tier: FitTier;
  rationale: string;
  strengths: string[];
  gaps: string[];
}

export default function OpportunityDetailPage() {
  const params = useParams();
  const postingId = params.id as string;

  const [posting, setPosting] = useState<Posting | null>(null);
  const [firm, setFirm] = useState<Firm | null>(null);
  const [otherPostings, setOtherPostings] = useState<Posting[]>([]);
  const [fitData, setFitData] = useState<FitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const postingResult = await getPosting(postingId);
      setPosting(postingResult.posting);
      setFirm(postingResult.firm);

      // Load other postings from same firm
      if (postingResult.firm) {
        const firmResult = await getFirm(postingResult.firm.id);
        setOtherPostings(
          firmResult.postings.filter((p) => p.id !== postingId && !p.closed_at)
        );
      }

      // Try to load fit score from sessionStorage (cached from dashboard)
      try {
        const stored = sessionStorage.getItem("internshipmatch-upload");
        if (stored) {
          const parsed = JSON.parse(stored);
          // Fit scores are cached in the opportunities response, not in the store
          // We'll get them from the opportunities API if needed
        }
      } catch {
        // No cached fit data
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load opportunity"
      );
    } finally {
      setLoading(false);
    }
  }, [postingId]);

  // Load fit score from opportunities API
  useEffect(() => {
    async function loadFitScore() {
      try {
        const { getOpportunities } = await import("../../../lib/api");
        const opps = await getOpportunities({ limit: 50 });
        const match = opps.find((o) => o.posting.id === postingId);
        if (match) {
          setFitData({
            score: match.fit_score.score,
            tier: match.fit_score.tier,
            rationale: match.fit_score.rationale,
            strengths: match.fit_score.strengths,
            gaps: match.fit_score.gaps,
          });
        }
      } catch {
        // Fit score not available
      }
    }
    loadFitScore();
  }, [postingId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-surface-border">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
            <Link href="/" className="font-serif text-xl font-medium text-accent">
              InternshipMatch
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-accent rounded-full animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !posting || !firm) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-surface-border">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
            <Link href="/" className="font-serif text-xl font-medium text-accent">
              InternshipMatch
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-lg text-ink-secondary">
              {error || "Opportunity not found."}
            </p>
            <Link
              href="/dashboard"
              className="text-sm text-accent hover:underline"
            >
              Back to dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const tierStyle = fitData
    ? TIER_STYLES[fitData.tier] || TIER_STYLES.long_shot
    : "";
  const tierLabel = fitData
    ? TIER_LABELS[fitData.tier] || fitData.tier
    : "";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur border-b border-surface-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl font-medium text-accent">
            InternshipMatch
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink-primary transition-colors"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-10">
          {/* ── Page Header ── */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-10">
            <div className="flex items-start gap-5">
              {/* Firm initial */}
              <div className="w-16 h-16 border border-surface-border rounded-lg flex items-center justify-center shrink-0">
                <span className="font-serif text-3xl text-accent">
                  {firm.name.charAt(0)}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="font-serif text-3xl md:text-4xl tracking-tight">
                    {firm.name}
                  </h1>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-secondary border border-surface-border rounded px-2 py-0.5">
                    {FIRM_TIER_LABELS[firm.tier] || firm.tier}
                  </span>
                </div>
                <p className="text-xl text-ink-primary">{posting.title}</p>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-ink-secondary">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} /> {posting.location}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarBlank size={14} /> {daysUntil(posting.deadline)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={14} /> ~{posting.estimated_effort_minutes} min to apply
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap size={14} /> {posting.class_year_target}
                  </span>
                </div>
              </div>
            </div>

            {/* Score block */}
            {fitData && (
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="font-mono text-5xl font-medium text-accent tabular-nums leading-none">
                    {fitData.score}
                  </p>
                  <p className="font-mono text-xs text-ink-secondary mt-1">
                    / 100
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded border ${tierStyle}`}
                >
                  {tierLabel}
                </span>
              </div>
            )}
          </div>

          {/* ── Two Column Body ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-8 space-y-6">
              {/* Role Description */}
              <Card>
                <EyebrowLabel className="mb-4 block">
                  Role description
                </EyebrowLabel>
                <p className="text-sm leading-relaxed text-ink-primary whitespace-pre-line">
                  {posting.description}
                </p>
              </Card>

              {/* Requirements */}
              {posting.requirements.length > 0 && (
                <Card>
                  <EyebrowLabel className="mb-4 block">
                    Requirements
                  </EyebrowLabel>
                  <ul className="space-y-2">
                    {posting.requirements.map((req, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-ink-primary"
                      >
                        <span className="text-ink-tertiary mt-0.5 shrink-0">
                          &bull;
                        </span>
                        {req}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* How to Apply */}
              <Card>
                <EyebrowLabel className="mb-4 block">
                  How to apply
                </EyebrowLabel>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-sm text-accent font-medium shrink-0 mt-0.5">
                      01
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        Prepare your resume
                      </p>
                      <p className="text-sm text-ink-secondary mt-0.5">
                        Tailor your resume to highlight relevant finance
                        coursework, technical skills, and experience.
                        {firm.gpa_floor_estimated > 0 && (
                          <span>
                            {" "}
                            {firm.name} typically looks for a minimum GPA of{" "}
                            <span className="font-mono">
                              {firm.gpa_floor_estimated.toFixed(1)}
                            </span>
                            .
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="font-mono text-sm text-accent font-medium shrink-0 mt-0.5">
                      02
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        Review the requirements
                      </p>
                      <p className="text-sm text-ink-secondary mt-0.5">
                        Make sure you meet the eligibility criteria above.
                        {posting.class_year_target && (
                          <span>
                            {" "}
                            This role targets{" "}
                            <span className="font-medium">
                              {posting.class_year_target}
                            </span>{" "}
                            students.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {fitData && fitData.gaps.length > 0 && (
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-sm text-accent font-medium shrink-0 mt-0.5">
                        03
                      </span>
                      <div>
                        <p className="text-sm font-medium">
                          Address your gaps
                        </p>
                        <p className="text-sm text-ink-secondary mt-0.5">
                          Based on your profile, consider addressing these areas
                          in your cover letter or application:
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {fitData.gaps.map((gap, i) => (
                            <li
                              key={i}
                              className="text-sm text-ink-secondary flex items-start gap-1.5"
                            >
                              <WarningCircle
                                size={14}
                                className="text-amber-500 mt-0.5 shrink-0"
                              />
                              {gap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <span className="font-mono text-sm text-accent font-medium shrink-0 mt-0.5">
                      {fitData && fitData.gaps.length > 0 ? "04" : "03"}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        Submit your application
                      </p>
                      <p className="text-sm text-ink-secondary mt-0.5">
                        Apply through the firm&apos;s portal. Budget about{" "}
                        <span className="font-mono">
                          {posting.estimated_effort_minutes}
                        </span>{" "}
                        minutes to complete the application.
                        {posting.deadline && (
                          <span>
                            {" "}
                            Deadline:{" "}
                            <span className="font-medium">
                              {formatDate(posting.deadline)}
                            </span>
                            .
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <a
                    href={posting.application_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block"
                  >
                    <PrimaryButton className="w-full justify-center">
                      Apply on {firm.name}
                      <ArrowSquareOut size={16} className="ml-1" />
                    </PrimaryButton>
                  </a>
                </div>
              </Card>

              {/* Fit Analysis */}
              {fitData && (
                <Card>
                  <EyebrowLabel className="mb-4 block">
                    Your fit analysis
                  </EyebrowLabel>
                  <p className="text-sm text-ink-primary leading-relaxed mb-4">
                    {fitData.rationale}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {fitData.strengths.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-2 uppercase tracking-wider">
                          Strengths
                        </p>
                        <ul className="space-y-1.5">
                          {fitData.strengths.map((s, i) => (
                            <li
                              key={i}
                              className="text-sm text-ink-primary flex items-start gap-1.5"
                            >
                              <CheckCircle
                                size={14}
                                weight="fill"
                                className="text-green-600 mt-0.5 shrink-0"
                              />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {fitData.gaps.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-amber-700 mb-2 uppercase tracking-wider">
                          Gaps to address
                        </p>
                        <ul className="space-y-1.5">
                          {fitData.gaps.map((g, i) => (
                            <li
                              key={i}
                              className="text-sm text-ink-primary flex items-start gap-1.5"
                            >
                              <WarningCircle
                                size={14}
                                weight="fill"
                                className="text-amber-500 mt-0.5 shrink-0"
                              />
                              {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column */}
            <div className="lg:col-span-4 space-y-6">
              {/* Apply CTA (sticky on desktop) */}
              <div className="lg:sticky lg:top-24">
                <a
                  href={posting.application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mb-6"
                >
                  <PrimaryButton className="w-full justify-center py-4 text-base">
                    Apply now
                    <ArrowSquareOut size={18} className="ml-1.5" />
                  </PrimaryButton>
                </a>

                {/* About the Firm */}
                <Card className="mb-6">
                  <EyebrowLabel className="mb-4 block">
                    About {firm.name}
                  </EyebrowLabel>
                  <p className="text-sm text-ink-primary leading-relaxed mb-4">
                    {firm.recruiting_profile}
                  </p>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Buildings
                        size={16}
                        className="text-ink-tertiary mt-0.5 shrink-0"
                      />
                      <div>
                        <p className="text-ink-secondary">Headquarters</p>
                        <p className="font-medium">{firm.headquarters}</p>
                      </div>
                    </div>

                    {firm.offices.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Globe
                          size={16}
                          className="text-ink-tertiary mt-0.5 shrink-0"
                        />
                        <div>
                          <p className="text-ink-secondary">Offices</p>
                          <p className="font-medium">
                            {firm.offices.join(", ")}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-2">
                      <GraduationCap
                        size={16}
                        className="text-ink-tertiary mt-0.5 shrink-0"
                      />
                      <div>
                        <p className="text-ink-secondary">Estimated GPA floor</p>
                        <p className="font-mono font-medium">
                          {firm.gpa_floor_estimated.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <a
                    href={firm.careers_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-accent hover:underline mt-4"
                  >
                    Visit careers page
                    <ArrowSquareOut size={14} />
                  </a>
                </Card>

                {/* Other Roles at this Firm */}
                {otherPostings.length > 0 && (
                  <Card>
                    <EyebrowLabel className="mb-4 block">
                      Other roles at {firm.name}
                    </EyebrowLabel>
                    <div className="space-y-3">
                      {otherPostings.slice(0, 5).map((p) => (
                        <Link
                          key={p.id}
                          href={`/opportunity/${p.id}`}
                          className="block group"
                        >
                          <p className="text-sm font-medium group-hover:text-accent transition-colors">
                            {p.title}
                          </p>
                          <p className="font-mono text-xs text-ink-secondary mt-0.5">
                            {p.location} · {p.class_year_target}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

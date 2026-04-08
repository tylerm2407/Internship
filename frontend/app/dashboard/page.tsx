"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChartBar,
  CalendarBlank,
  Users,
  Target,
  FileText,
  ArrowRight,
} from "@phosphor-icons/react";
import { getOpportunities, getProfile } from "../../lib/api";
import { OpportunityCard } from "../../components/OpportunityCard";
import { Card } from "../../components/Card";
import { EyebrowLabel } from "../../components/EyebrowLabel";
import { PrimaryButton } from "../../components/PrimaryButton";
import type { OpportunityResponse, StudentProfile, FitTier } from "../../lib/types";

function SkeletonCard() {
  return (
    <div className="bg-surface border border-surface-border rounded-lg py-6 px-8 flex items-start gap-6 animate-pulse">
      <div className="flex flex-col items-center gap-2 shrink-0">
        <div className="w-12 h-12 bg-surface-hover rounded-md" />
        <div className="w-16 h-3 bg-surface-hover rounded" />
      </div>
      <div className="flex-1 space-y-3">
        <div className="h-6 bg-surface-hover rounded w-48" />
        <div className="h-5 bg-surface-hover rounded w-72" />
        <div className="h-4 bg-surface-hover rounded w-56" />
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="h-12 w-16 bg-surface-hover rounded" />
        <div className="h-5 w-20 bg-surface-hover rounded" />
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: ChartBar,
    title: "Fit Scoring",
    description: "6-factor scoring engine ranks every open posting against your profile.",
    available: true,
    href: "/dashboard",
  },
  {
    icon: CalendarBlank,
    title: "Recruiting Timeline",
    description: "Personalized calendar with deadlines, prep milestones, and application windows.",
    available: true,
    href: "/timeline",
  },
  {
    icon: Target,
    title: "Application Tracker",
    description: "Track every application from submitted through final round in one place.",
    available: true,
    href: "/applications",
  },
  {
    icon: Users,
    title: "Networking Radar",
    description: "Find alumni at your target firms with AI-drafted outreach messages.",
    available: true,
    href: "/alumni",
  },
  {
    icon: FileText,
    title: "Interview Prep",
    description: "Firm-specific practice questions with AI-evaluated answers.",
    available: true,
    href: "/prep",
  },
];

export default function DashboardPage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [opportunities, setOpportunities] = useState<OpportunityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [tierFilter, setTierFilter] = useState<FitTier | "all">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, oppData] = await Promise.all([
        getProfile(),
        getOpportunities({ limit: 50 }),
      ]);
      setProfile(profileData);
      setOpportunities(oppData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load data"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tierCounts = opportunities.reduce(
    (acc, o) => {
      acc[o.fit_score.tier] = (acc[o.fit_score.tier] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const uniqueRoles = [
    ...new Set(opportunities.map((o) => o.posting.role_type)),
  ].sort();
  const uniqueLocations = [
    ...new Set(opportunities.map((o) => o.posting.location)),
  ].sort();

  const filtered = opportunities.filter((o) => {
    if (tierFilter !== "all" && o.fit_score.tier !== tierFilter) return false;
    if (roleFilter !== "all" && o.posting.role_type !== roleFilter) return false;
    if (locationFilter !== "all" && o.posting.location !== locationFilter) return false;
    return true;
  });

  const topScore = opportunities.length > 0 ? opportunities[0].fit_score.score : 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl font-medium text-accent">
            InternshipMatch
          </Link>
          <Link
            href="/upload"
            className="text-sm text-ink-secondary hover:text-ink-primary transition-colors"
          >
            Upload new resume
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-10">
          {/* ── Welcome + Profile Summary ── */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl tracking-tight">
                {profile ? `Welcome back, ${profile.name.split(" ")[0]}` : "Your dashboard"}
              </h1>
              {profile && (
                <p className="text-base text-ink-secondary mt-1">
                  {profile.school}
                  {profile.major && ` · ${profile.major}`}
                  {profile.gpa && (
                    <span className="font-mono"> · {profile.gpa} GPA</span>
                  )}
                </p>
              )}
            </div>

            {!loading && opportunities.length > 0 && (
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="font-mono text-3xl font-medium text-accent tabular-nums">
                    {opportunities.length}
                  </p>
                  <p className="text-xs text-ink-secondary">Matches found</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-3xl font-medium text-accent tabular-nums">
                    {topScore}
                  </p>
                  <p className="text-xs text-ink-secondary">Top fit score</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-3xl font-medium text-accent tabular-nums">
                    {tierCounts.strong_match || 0}
                  </p>
                  <p className="text-xs text-ink-secondary">Strong matches</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Profile Snapshot ── */}
          {profile && (
            <Card>
              <div className="flex items-start justify-between mb-4">
                <EyebrowLabel>Your profile</EyebrowLabel>
                <Link
                  href="/upload"
                  className="text-xs text-accent hover:underline"
                >
                  Update resume
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-ink-secondary">Target roles</p>
                  <p className="font-medium mt-0.5">
                    {profile.target_roles.length > 0
                      ? profile.target_roles.slice(0, 3).join(", ")
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-ink-secondary">Locations</p>
                  <p className="font-medium mt-0.5">
                    {profile.target_geographies.length > 0
                      ? profile.target_geographies.slice(0, 3).join(", ")
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-ink-secondary">Skills</p>
                  <p className="font-medium mt-0.5">
                    {profile.technical_skills.length > 0
                      ? profile.technical_skills.slice(0, 3).join(", ")
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-ink-secondary">Experience</p>
                  <p className="font-medium mt-0.5">
                    {profile.prior_experience.length > 0
                      ? `${profile.prior_experience.length} role${profile.prior_experience.length > 1 ? "s" : ""}`
                      : "None listed"}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* ── Features Grid ── */}
          <div>
            <EyebrowLabel>Features</EyebrowLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {FEATURES.map((feature) => (
                <Link
                  key={feature.title}
                  href={feature.href}
                  className="bg-surface border border-surface-border rounded-lg p-5 flex flex-col gap-3 hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <feature.icon
                      size={24}
                      weight="regular"
                      className="text-accent"
                    />
                    <ArrowRight size={16} className="text-ink-tertiary" />
                  </div>
                  <h3 className="font-sans text-sm font-semibold">{feature.title}</h3>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    {feature.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Opportunities Section ── */}
          <div>
            <div className="flex items-end justify-between mb-4">
              <div>
                <EyebrowLabel>Ranked opportunities</EyebrowLabel>
                {!loading && opportunities.length > 0 && (
                  <p className="font-mono text-sm text-ink-secondary mt-1">
                    {tierCounts.strong_match || 0} strong
                    <span className="mx-1.5">·</span>
                    {tierCounts.reach || 0} reach
                    <span className="mx-1.5">·</span>
                    {tierCounts.long_shot || 0} long shot
                  </p>
                )}
              </div>

              {!loading && opportunities.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value as FitTier | "all")}
                    className="bg-surface border border-surface-border rounded-md px-2 py-1 text-xs focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="all">All tiers</option>
                    <option value="strong_match">Strong match</option>
                    <option value="reach">Reach</option>
                    <option value="long_shot">Long shot</option>
                  </select>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-surface border border-surface-border rounded-md px-2 py-1 text-xs focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="all">All roles</option>
                    {uniqueRoles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="bg-surface border border-surface-border rounded-md px-2 py-1 text-xs focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="all">All locations</option>
                    {uniqueLocations.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Loading */}
            {loading && (
              <div className="space-y-3">
                <p className="font-mono text-sm text-ink-secondary">
                  Scoring postings against your profile...
                </p>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 space-y-3">
                <p className="text-sm text-red-800">{error}</p>
                <PrimaryButton onClick={load} className="text-xs px-4 py-2">
                  Retry
                </PrimaryButton>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && opportunities.length === 0 && (
              <div className="bg-surface border border-surface-border rounded-lg p-12 text-center space-y-4">
                <p className="text-lg text-ink-secondary">
                  No opportunities found yet.
                </p>
                <p className="text-sm text-ink-tertiary">
                  Your profile is saved. Opportunities will appear once scoring
                  completes.
                </p>
                <PrimaryButton onClick={load} className="text-sm">
                  Refresh
                </PrimaryButton>
              </div>
            )}

            {/* Opportunity list */}
            {!loading && !error && filtered.length > 0 && (
              <div className="space-y-3">
                {filtered.map((opp) => (
                  <OpportunityCard key={opp.posting.id} opportunity={opp} />
                ))}
              </div>
            )}

            {!loading && !error && opportunities.length > 0 && filtered.length === 0 && (
              <p className="text-sm text-ink-secondary py-8 text-center">
                No opportunities match the current filters.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

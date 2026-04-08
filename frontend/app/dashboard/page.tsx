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

// ── Preset sample data ────────────────────────────────────────

const SAMPLE_OPPORTUNITIES: OpportunityResponse[] = [
  {
    posting: { id: "p1", firm_id: "f1", title: "Investment Banking Summer Analyst", role_type: "Investment Banking", class_year_target: "junior", location: "New York, NY", description: "Join Goldman Sachs as a Summer Analyst in the Investment Banking Division. You will work on live M&A, IPO, and debt transactions across industry groups.", requirements: ["Expected graduation 2028", "Minimum 3.5 GPA", "Strong analytical and quantitative skills", "Proficiency in Excel and PowerPoint", "Demonstrated interest in finance"], application_url: "https://www.goldmansachs.com/careers/students/programs/americas/summer-analyst-program.html", posted_at: "2026-01-15", deadline: "2026-07-15", closed_at: null, estimated_effort_minutes: 45 },
    firm: { id: "f1", name: "Goldman Sachs", tier: "bulge_bracket", roles_offered: ["Investment Banking", "Sales & Trading", "Asset Management"], headquarters: "New York, NY", offices: ["New York", "San Francisco", "London", "Hong Kong"], gpa_floor_estimated: 3.7, recruiting_profile: "Seeks top-tier talent from target schools with strong technical skills, leadership, and intellectual curiosity. Highly competitive — fewer than 2% of applicants receive offers.", careers_url: "https://www.goldmansachs.com/careers", scraper_adapter: null, last_scraped_at: null },
    fit_score: { user_id: "demo", posting_id: "p1", score: 72, tier: "reach", rationale: "Strong academic background aligns with GS requirements. GPA meets the floor, but limited prior banking experience at a sophomore level is expected. Finance Society and relevant coursework are positives.", strengths: ["GPA above 3.5 floor", "Finance major with relevant coursework", "Active in Finance Society"], gaps: ["No prior IB internship experience", "Sophomore — most GS SA roles target juniors", "Limited deal or transaction exposure"], computed_at: "2026-04-01" },
  },
  {
    posting: { id: "p2", firm_id: "f2", title: "Investment Banking Summer Analyst", role_type: "Investment Banking", class_year_target: "junior", location: "New York, NY", description: "Morgan Stanley's IBD Summer Analyst Program offers a 10-week immersive experience working on live transactions including M&A advisory, equity and debt underwriting.", requirements: ["Expected graduation 2028", "Strong academic record", "Excellent communication skills", "Team-oriented mindset"], application_url: "https://www.morganstanley.com/careers/students-graduates/programs/investment-banking-summer-analyst", posted_at: "2026-01-20", deadline: "2026-07-20", closed_at: null, estimated_effort_minutes: 40 },
    firm: { id: "f2", name: "Morgan Stanley", tier: "bulge_bracket", roles_offered: ["Investment Banking", "Wealth Management", "Equity Research"], headquarters: "New York, NY", offices: ["New York", "Houston", "London", "Tokyo"], gpa_floor_estimated: 3.6, recruiting_profile: "Values well-rounded candidates with leadership, analytical abilities, and a collaborative mindset. Strong emphasis on culture fit.", careers_url: "https://www.morganstanley.com/careers", scraper_adapter: null, last_scraped_at: null },
    fit_score: { user_id: "demo", posting_id: "p2", score: 68, tier: "reach", rationale: "Good academic fit and extracurricular involvement. Morgan Stanley values teamwork — club leadership is a strong signal. Recommend networking with Bryant alumni at MS.", strengths: ["GPA meets MS threshold", "Leadership in Finance Society", "Strong teamwork examples from clubs"], gaps: ["Limited IB-specific experience", "Non-target school may require stronger networking", "No diversity program participation"], computed_at: "2026-04-01" },
  },
  {
    posting: { id: "p3", firm_id: "f4", title: "Investment Banking Analyst — Industrials", role_type: "Investment Banking", class_year_target: "junior", location: "New York, NY", description: "Jefferies is looking for driven analysts to join its Industrials group. Analysts work on M&A and capital markets transactions for industrial and manufacturing companies.", requirements: ["Expected graduation 2028", "3.3+ GPA preferred", "Interest in industrials sector", "Excel and financial modeling skills"], application_url: "https://www.jefferies.com/careers", posted_at: "2026-02-01", deadline: "2026-08-01", closed_at: null, estimated_effort_minutes: 30 },
    firm: { id: "f4", name: "Jefferies", tier: "middle_market", roles_offered: ["Investment Banking", "Equity Research", "Sales & Trading"], headquarters: "New York, NY", offices: ["New York", "Los Angeles", "Chicago", "London"], gpa_floor_estimated: 3.4, recruiting_profile: "Entrepreneurial mindset with strong work ethic. More accessible than bulge bracket firms — values hustle and genuine interest over pedigree.", careers_url: "https://www.jefferies.com/careers", scraper_adapter: null, last_scraped_at: null },
    fit_score: { user_id: "demo", posting_id: "p3", score: 81, tier: "strong_match", rationale: "Strong fit for Jefferies Industrials. GPA well above floor, relevant finance coursework, and Jefferies' culture favors motivated candidates from non-target schools who demonstrate genuine interest.", strengths: ["GPA significantly above 3.4 floor", "Finance major with accounting coursework", "Jefferies values non-target candidates who network actively", "Industrials interest can be developed"], gaps: ["No industrials-specific experience yet", "Will need to articulate sector interest clearly"], computed_at: "2026-04-01" },
  },
  {
    posting: { id: "p4", firm_id: "f3", title: "Investment Banking Summer Analyst — Advisory", role_type: "Investment Banking", class_year_target: "junior", location: "New York, NY", description: "Evercore's advisory-focused summer program places analysts on live M&A engagements. Known for lean deal teams and high responsibility from day one.", requirements: ["Expected graduation 2028", "3.7+ GPA strongly preferred", "Exceptional attention to detail", "Strong interest in M&A advisory"], application_url: "https://www.evercore.com/careers", posted_at: "2026-01-10", deadline: "2026-06-30", closed_at: null, estimated_effort_minutes: 50 },
    firm: { id: "f3", name: "Evercore", tier: "elite_boutique", roles_offered: ["Investment Banking Advisory", "Restructuring"], headquarters: "New York, NY", offices: ["New York", "Houston", "London", "Hong Kong"], gpa_floor_estimated: 3.7, recruiting_profile: "Seeks candidates with strong attention to detail, passion for M&A, and intellectual curiosity. Lean teams mean more responsibility and higher expectations.", careers_url: "https://www.evercore.com/careers", scraper_adapter: null, last_scraped_at: null },
    fit_score: { user_id: "demo", posting_id: "p4", score: 58, tier: "long_shot", rationale: "Evercore is highly competitive with a strong preference for target school candidates. Academic profile is solid but the 3.7 GPA floor is a hard barrier for many. Networking is essential.", strengths: ["Finance major with relevant coursework", "Finance Society involvement signals genuine interest"], gaps: ["GPA may be below Evercore's 3.7 preferred floor", "Non-target school is a significant headwind", "No prior M&A exposure", "Limited connections at Evercore"], computed_at: "2026-04-01" },
  },
  {
    posting: { id: "p5", firm_id: "f5", title: "Financial Advisory Summer Analyst", role_type: "Investment Banking", class_year_target: "junior", location: "New York, NY", description: "Lazard's Financial Advisory summer program offers direct exposure to M&A and restructuring mandates. Analysts work closely with senior bankers on cross-border transactions.", requirements: ["Expected graduation 2028", "Strong academic record", "Intellectual curiosity and global perspective", "Language skills a plus"], application_url: "https://www.lazard.com/careers", posted_at: "2026-02-15", deadline: "2026-07-31", closed_at: null, estimated_effort_minutes: 45 },
    firm: { id: "f5", name: "Lazard", tier: "elite_boutique", roles_offered: ["Financial Advisory", "Asset Management"], headquarters: "New York, NY", offices: ["New York", "Chicago", "Paris", "London"], gpa_floor_estimated: 3.7, recruiting_profile: "Intellectually curious candidates with global perspective and strong analytical skills. Values language skills and international experience.", careers_url: "https://www.lazard.com/careers", scraper_adapter: null, last_scraped_at: null },
    fit_score: { user_id: "demo", posting_id: "p5", score: 55, tier: "long_shot", rationale: "Lazard values intellectual curiosity and global perspective. Language skills or study abroad would strengthen this application significantly. Currently a reach given limited international exposure.", strengths: ["Finance major with solid coursework", "Strong academic work ethic"], gaps: ["No international experience or language skills listed", "Non-target school", "GPA may be below preferred threshold", "No restructuring or cross-border deal exposure"], computed_at: "2026-04-01" },
  },
  {
    posting: { id: "p6", firm_id: "f6", title: "Investment Banking Summer Analyst — Healthcare", role_type: "Investment Banking", class_year_target: "sophomore", location: "Chicago, IL", description: "William Blair's sophomore program provides early exposure to healthcare investment banking. Analysts assist with M&A and capital raising transactions for healthcare and life sciences companies.", requirements: ["Expected graduation 2029", "Interest in healthcare sector", "Strong academic performance", "Sophomore standing"], application_url: "https://www.williamblair.com/careers", posted_at: "2026-03-01", deadline: "2026-09-15", closed_at: null, estimated_effort_minutes: 25 },
    firm: { id: "f6", name: "William Blair", tier: "middle_market", roles_offered: ["Investment Banking", "Equity Research", "Wealth Management"], headquarters: "Chicago, IL", offices: ["Chicago", "New York", "San Francisco", "London"], gpa_floor_estimated: 3.3, recruiting_profile: "Collaborative culture that values intellectual curiosity and genuine interest in middle-market companies. Accessible for non-target school candidates who demonstrate hustle.", careers_url: "https://www.williamblair.com/careers", scraper_adapter: null, last_scraped_at: null },
    fit_score: { user_id: "demo", posting_id: "p6", score: 88, tier: "strong_match", rationale: "Excellent fit. William Blair's sophomore program is designed for your class year, the GPA floor is well below yours, and their culture specifically welcomes non-target candidates who network. Healthcare interest can be developed — focus on articulating why.", strengths: ["Sophomore standing matches class year target", "GPA well above 3.3 floor", "Finance major with strong coursework", "William Blair values motivated non-target candidates", "Middle-market firms offer more accessible recruiting"], gaps: ["No healthcare-specific coursework or experience yet", "Would benefit from articulating sector interest"], computed_at: "2026-04-01" },
  },
  {
    posting: { id: "p7", firm_id: "f7", title: "Investment Banking Early Insights Program", role_type: "Investment Banking", class_year_target: "sophomore", location: "New York, NY", description: "Houlihan Lokey's Early Insights Program introduces sophomores to restructuring and financial advisory through workshops, case studies, and networking with senior professionals.", requirements: ["Expected graduation 2029", "Sophomore standing", "Interest in restructuring or financial advisory", "3.4+ GPA preferred"], application_url: "https://www.hl.com/careers", posted_at: "2026-02-20", deadline: "2026-08-30", closed_at: null, estimated_effort_minutes: 30 },
    firm: { id: "f7", name: "Houlihan Lokey", tier: "middle_market", roles_offered: ["Investment Banking", "Restructuring", "Financial Advisory"], headquarters: "Los Angeles, CA", offices: ["Los Angeles", "New York", "Chicago", "Dallas"], gpa_floor_estimated: 3.4, recruiting_profile: "The leading middle-market IB firm. Known for restructuring expertise. Values analytical rigor and genuine interest in the middle market — less prestige-driven culture than BBs.", careers_url: "https://www.hl.com/careers", scraper_adapter: null, last_scraped_at: null },
    fit_score: { user_id: "demo", posting_id: "p7", score: 85, tier: "strong_match", rationale: "Strong match for HL's sophomore program. Class year alignment, GPA above floor, and Houlihan Lokey's accessible culture make this a high-probability opportunity. Their early insights format is ideal for building relationships.", strengths: ["Sophomore — perfect class year match", "GPA above HL's 3.4 threshold", "Finance major signals genuine interest", "HL's culture is accessible for non-target candidates"], gaps: ["No restructuring knowledge yet — study basics before applying", "Limited awareness of HL's deal types may show in interviews"], computed_at: "2026-04-01" },
  },
];

const SAMPLE_PROFILE: StudentProfile = {
  user_id: "demo",
  name: "Owen Ash",
  school: "Bryant University",
  major: "Finance",
  minor: null,
  gpa: 3.6,
  target_roles: ["Investment Banking", "Financial Advisory"],
  target_geographies: ["New York", "Boston", "Chicago"],
  technical_skills: ["Excel", "PowerPoint", "Financial Modeling", "Bloomberg"],
  coursework_completed: ["Financial Accounting", "Corporate Finance", "Statistics", "Microeconomics"],
  coursework_in_progress: ["Investments", "Intermediate Accounting"],
  clubs: ["Finance Society", "Investment Club"],
  certifications: [],
  prior_experience: [{ role: "Finance Intern", organization: "Local Wealth Management Firm", summary: "Assisted with client portfolio reviews and financial planning", dates: "Summer 2025", bullets: ["Conducted market research on equity positions", "Built client presentation decks"] }],
  diversity_status: null,
  languages: ["English"],
  last_updated: "2026-04-01",
};

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
      const [profileResult, oppResult] = await Promise.allSettled([
        getProfile(),
        getOpportunities({ limit: 50 }),
      ]);
      setProfile(
        profileResult.status === "fulfilled" && profileResult.value
          ? profileResult.value
          : SAMPLE_PROFILE
      );
      setOpportunities(
        oppResult.status === "fulfilled" ? oppResult.value : SAMPLE_OPPORTUNITIES
      );
    } catch {
      setProfile(SAMPLE_PROFILE);
      setOpportunities(SAMPLE_OPPORTUNITIES);
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

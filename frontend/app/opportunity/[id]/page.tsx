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

// ── Sample opportunity data for offline demo ──────────────────
const SAMPLE_OPPS: { posting: Posting; firm: Firm; fit: FitData }[] = [
  {
    posting: { id: "p1", firm_id: "f1", title: "Investment Banking Summer Analyst", role_type: "Investment Banking", class_year_target: "junior", location: "New York, NY", description: "Join Goldman Sachs as a Summer Analyst in the Investment Banking Division. You will work on live M&A, IPO, and debt transactions across industry groups.\n\nThe program runs for 10 weeks and offers direct exposure to deal execution, financial modeling, and client presentations. Top-performing analysts receive full-time return offers.", requirements: ["Expected graduation 2028", "Minimum 3.5 GPA", "Strong analytical and quantitative skills", "Proficiency in Excel and PowerPoint", "Demonstrated interest in finance"], application_url: "https://www.goldmansachs.com/careers/students", posted_at: "2026-01-15", deadline: "2026-07-15", closed_at: null, estimated_effort_minutes: 45 },
    firm: { id: "f1", name: "Goldman Sachs", tier: "bulge_bracket", roles_offered: ["Investment Banking", "Sales & Trading", "Asset Management"], headquarters: "New York, NY", offices: ["New York", "San Francisco", "London", "Hong Kong"], gpa_floor_estimated: 3.7, recruiting_profile: "Seeks top-tier talent from target schools with strong technical skills, leadership, and intellectual curiosity. Highly competitive — fewer than 2% of applicants receive offers.", careers_url: "https://www.goldmansachs.com/careers/students", scraper_adapter: null, last_scraped_at: null },
    fit: { score: 72, tier: "reach", rationale: "Strong academic background aligns with GS requirements. GPA meets the floor, but limited prior banking experience at a sophomore level is expected. Finance Society and relevant coursework are positives.", strengths: ["GPA above 3.5 floor", "Finance major with relevant coursework", "Active in Finance Society"], gaps: ["No prior IB internship experience", "Sophomore — most GS SA roles target juniors", "Limited deal or transaction exposure"] },
  },
  {
    posting: { id: "p2", firm_id: "f2", title: "Investment Banking Summer Analyst", role_type: "Investment Banking", class_year_target: "junior", location: "New York, NY", description: "Morgan Stanley's IBD Summer Analyst Program offers a 10-week immersive experience working on live transactions including M&A advisory, equity and debt underwriting.\n\nAnalysts rotate through coverage and product groups, gaining broad exposure to the platform.", requirements: ["Expected graduation 2028", "Strong academic record", "Excellent communication skills", "Team-oriented mindset"], application_url: "https://www.morganstanley.com/people-opportunities/students-graduates", posted_at: "2026-01-20", deadline: "2026-07-20", closed_at: null, estimated_effort_minutes: 40 },
    firm: { id: "f2", name: "Morgan Stanley", tier: "bulge_bracket", roles_offered: ["Investment Banking", "Wealth Management", "Equity Research"], headquarters: "New York, NY", offices: ["New York", "Houston", "London", "Tokyo"], gpa_floor_estimated: 3.6, recruiting_profile: "Values well-rounded candidates with leadership, analytical abilities, and a collaborative mindset. Strong emphasis on culture fit.", careers_url: "https://www.morganstanley.com/people-opportunities/students-graduates", scraper_adapter: null, last_scraped_at: null },
    fit: { score: 68, tier: "reach", rationale: "Good academic fit and extracurricular involvement. Morgan Stanley values teamwork — club leadership is a strong signal. Recommend networking with Bryant alumni at MS.", strengths: ["GPA meets MS threshold", "Leadership in Finance Society", "Strong teamwork examples from clubs"], gaps: ["Limited IB-specific experience", "Non-target school may require stronger networking", "No diversity program participation"] },
  },
  {
    posting: { id: "p3", firm_id: "f4", title: "Investment Banking Analyst — Industrials", role_type: "Investment Banking", class_year_target: "junior", location: "New York, NY", description: "Jefferies is looking for driven analysts to join its Industrials group. Analysts work on M&A and capital markets transactions for industrial and manufacturing companies.\n\nThe group provides significant deal responsibility from day one — junior team members are actively involved in modeling, due diligence, and client communication.", requirements: ["Expected graduation 2028", "3.3+ GPA preferred", "Interest in industrials sector", "Excel and financial modeling skills"], application_url: "https://www.jefferies.com/careers", posted_at: "2026-02-01", deadline: "2026-08-01", closed_at: null, estimated_effort_minutes: 30 },
    firm: { id: "f4", name: "Jefferies", tier: "middle_market", roles_offered: ["Investment Banking", "Equity Research", "Sales & Trading"], headquarters: "New York, NY", offices: ["New York", "Los Angeles", "Chicago", "London"], gpa_floor_estimated: 3.4, recruiting_profile: "Entrepreneurial mindset with strong work ethic. More accessible than bulge bracket firms — values hustle and genuine interest over pedigree.", careers_url: "https://www.jefferies.com/careers", scraper_adapter: null, last_scraped_at: null },
    fit: { score: 81, tier: "strong_match", rationale: "Strong fit for Jefferies Industrials. GPA well above floor, relevant finance coursework, and Jefferies' culture favors motivated candidates from non-target schools who demonstrate genuine interest.", strengths: ["GPA significantly above 3.4 floor", "Finance major with accounting coursework", "Jefferies values non-target candidates who network actively", "Industrials interest can be developed"], gaps: ["No industrials-specific experience yet", "Will need to articulate sector interest clearly"] },
  },
  {
    posting: { id: "p4", firm_id: "f3", title: "Investment Banking Summer Analyst — Advisory", role_type: "Investment Banking", class_year_target: "junior", location: "New York, NY", description: "Evercore's advisory-focused summer program places analysts on live M&A engagements. Known for lean deal teams and high responsibility from day one.\n\nAnalysts are expected to contribute meaningfully to financial analysis, presentation materials, and deal strategy.", requirements: ["Expected graduation 2028", "3.7+ GPA strongly preferred", "Exceptional attention to detail", "Strong interest in M&A advisory"], application_url: "https://www.evercore.com/careers", posted_at: "2026-01-10", deadline: "2026-06-30", closed_at: null, estimated_effort_minutes: 50 },
    firm: { id: "f3", name: "Evercore", tier: "elite_boutique", roles_offered: ["Investment Banking Advisory", "Restructuring"], headquarters: "New York, NY", offices: ["New York", "Houston", "London", "Hong Kong"], gpa_floor_estimated: 3.7, recruiting_profile: "Seeks candidates with strong attention to detail, passion for M&A, and intellectual curiosity. Lean teams mean more responsibility and higher expectations.", careers_url: "https://www.evercore.com/careers", scraper_adapter: null, last_scraped_at: null },
    fit: { score: 58, tier: "long_shot", rationale: "Evercore is highly competitive with a strong preference for target school candidates. Academic profile is solid but the 3.7 GPA floor is a hard barrier for many. Networking is essential.", strengths: ["Finance major with relevant coursework", "Finance Society involvement signals genuine interest"], gaps: ["GPA may be below Evercore's 3.7 preferred floor", "Non-target school is a significant headwind", "No prior M&A exposure", "Limited connections at Evercore"] },
  },
  {
    posting: { id: "p5", firm_id: "f5", title: "Financial Advisory Summer Analyst", role_type: "Investment Banking", class_year_target: "junior", location: "New York, NY", description: "Lazard's Financial Advisory summer program offers direct exposure to M&A and restructuring mandates. Analysts work closely with senior bankers on cross-border transactions.", requirements: ["Expected graduation 2028", "Strong academic record", "Intellectual curiosity and global perspective", "Language skills a plus"], application_url: "https://www.lazard.com/careers", posted_at: "2026-02-15", deadline: "2026-07-31", closed_at: null, estimated_effort_minutes: 45 },
    firm: { id: "f5", name: "Lazard", tier: "elite_boutique", roles_offered: ["Financial Advisory", "Asset Management"], headquarters: "New York, NY", offices: ["New York", "Chicago", "Paris", "London"], gpa_floor_estimated: 3.7, recruiting_profile: "Intellectually curious candidates with global perspective and strong analytical skills. Values language skills and international experience.", careers_url: "https://www.lazard.com/careers", scraper_adapter: null, last_scraped_at: null },
    fit: { score: 55, tier: "long_shot", rationale: "Lazard values intellectual curiosity and global perspective. Language skills or study abroad would strengthen this application significantly.", strengths: ["Finance major with solid coursework", "Strong academic work ethic"], gaps: ["No international experience or language skills listed", "Non-target school", "GPA may be below preferred threshold"] },
  },
  {
    posting: { id: "p6", firm_id: "f6", title: "Investment Banking Summer Analyst — Healthcare", role_type: "Investment Banking", class_year_target: "sophomore", location: "Chicago, IL", description: "William Blair's sophomore program provides early exposure to healthcare investment banking. Analysts assist with M&A and capital raising transactions for healthcare and life sciences companies.", requirements: ["Expected graduation 2029", "Interest in healthcare sector", "Strong academic performance", "Sophomore standing"], application_url: "https://www.williamblair.com/careers", posted_at: "2026-03-01", deadline: "2026-09-15", closed_at: null, estimated_effort_minutes: 25 },
    firm: { id: "f6", name: "William Blair", tier: "middle_market", roles_offered: ["Investment Banking", "Equity Research", "Wealth Management"], headquarters: "Chicago, IL", offices: ["Chicago", "New York", "San Francisco", "London"], gpa_floor_estimated: 3.3, recruiting_profile: "Collaborative culture that values intellectual curiosity and genuine interest in middle-market companies.", careers_url: "https://www.williamblair.com/careers", scraper_adapter: null, last_scraped_at: null },
    fit: { score: 88, tier: "strong_match", rationale: "Excellent fit. William Blair's sophomore program is designed for your class year, the GPA floor is well below yours, and their culture specifically welcomes non-target candidates who network.", strengths: ["Sophomore standing matches class year target", "GPA well above 3.3 floor", "Finance major with strong coursework", "William Blair values motivated non-target candidates"], gaps: ["No healthcare-specific coursework or experience yet"] },
  },
  {
    posting: { id: "p7", firm_id: "f7", title: "Investment Banking Early Insights Program", role_type: "Investment Banking", class_year_target: "sophomore", location: "New York, NY", description: "Houlihan Lokey's Early Insights Program introduces sophomores to restructuring and financial advisory through workshops, case studies, and networking with senior professionals.", requirements: ["Expected graduation 2029", "Sophomore standing", "Interest in restructuring or financial advisory", "3.4+ GPA preferred"], application_url: "https://www.hl.com/careers", posted_at: "2026-02-20", deadline: "2026-08-30", closed_at: null, estimated_effort_minutes: 30 },
    firm: { id: "f7", name: "Houlihan Lokey", tier: "middle_market", roles_offered: ["Investment Banking", "Restructuring", "Financial Advisory"], headquarters: "Los Angeles, CA", offices: ["Los Angeles", "New York", "Chicago", "Dallas"], gpa_floor_estimated: 3.4, recruiting_profile: "The leading middle-market IB firm. Known for restructuring expertise. Values analytical rigor and genuine interest in the middle market.", careers_url: "https://www.hl.com/careers", scraper_adapter: null, last_scraped_at: null },
    fit: { score: 85, tier: "strong_match", rationale: "Strong match for HL's sophomore program. Class year alignment, GPA above floor, and Houlihan Lokey's accessible culture make this a high-probability opportunity.", strengths: ["Sophomore — perfect class year match", "GPA above HL's 3.4 threshold", "Finance major signals genuine interest", "HL's culture is accessible for non-target candidates"], gaps: ["No restructuring knowledge yet — study basics before applying"] },
  },
];

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

      if (postingResult.firm) {
        const firmResult = await getFirm(postingResult.firm.id);
        setOtherPostings(
          firmResult.postings.filter((p) => p.id !== postingId && !p.closed_at)
        );
      }
    } catch {
      // Fallback to sample data
      const sample = SAMPLE_OPPS.find((o) => o.posting.id === postingId);
      if (sample) {
        setPosting(sample.posting);
        setFirm(sample.firm);
        setFitData(sample.fit);
        // Find other postings at the same firm
        const otherSample = SAMPLE_OPPS.filter(
          (o) => o.firm.id === sample.firm.id && o.posting.id !== postingId
        ).map((o) => o.posting);
        setOtherPostings(otherSample);
      } else {
        setError("Opportunity not found.");
      }
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
        // Fallback: use sample fit data if not already set
        const sample = SAMPLE_OPPS.find((o) => o.posting.id === postingId);
        if (sample) {
          setFitData(sample.fit);
        }
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

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Brain,
  ClockCountdown,
  ArrowRight,
  CheckCircle,
  Warning,
  ListNumbers,
  Play,
  CaretRight,
  ArrowLeft,
  Lightbulb,
} from "@phosphor-icons/react";
import {
  getAllFirms,
  startPrepSession,
  submitPrepAnswer,
  getPrepReadiness,
  getPrepHistory,
  getWhyFirm,
} from "../../lib/api";
import { Card } from "../../components/Card";
import { EyebrowLabel } from "../../components/EyebrowLabel";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SecondaryButton } from "../../components/SecondaryButton";
import type {
  Firm,
  PrepSession,
  PrepQuestion,
  PrepAnswer,
  ReadinessScore,
  SessionType,
} from "../../lib/types";

type View = "dashboard" | "session" | "complete";

const CATEGORY_LABELS: Record<string, string> = {
  accounting: "Accounting",
  valuation: "Valuation",
  ma: "M&A",
  lbo: "LBO",
  behavioral: "Behavioral",
  firm_specific: "Firm-Specific",
  market_awareness: "Market Awareness",
  brain_teaser: "Brain Teaser",
};

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  technical_accounting: "Technical: Accounting",
  technical_valuation: "Technical: Valuation",
  technical_ma: "Technical: M&A",
  technical_lbo: "Technical: LBO",
  behavioral: "Behavioral",
  firm_specific: "Firm-Specific",
  market_awareness: "Market Awareness",
};

const SESSION_TYPES: SessionType[] = [
  "technical_accounting",
  "technical_valuation",
  "technical_ma",
  "technical_lbo",
  "behavioral",
  "firm_specific",
  "market_awareness",
];

function getMasteryColor(score: number): string {
  if (score >= 4) return "bg-green-100";
  if (score >= 2.5) return "bg-blue-100";
  if (score >= 1) return "bg-amber-100";
  return "bg-red-100";
}

function getMasteryLabel(score: number): string {
  if (score >= 4) return "Mastered";
  if (score >= 2.5) return "Solid";
  if (score >= 1) return "Developing";
  return "Needs work";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Preset sample data ────────────────────────────────────────

const SAMPLE_FIRMS: Firm[] = [
  { id: "f1", name: "Goldman Sachs", tier: "bulge_bracket", roles_offered: ["Investment Banking", "Sales & Trading"], headquarters: "New York, NY", offices: ["New York", "San Francisco", "London"], gpa_floor_estimated: 3.7, recruiting_profile: "Top-tier talent from target schools", careers_url: "", scraper_adapter: null, last_scraped_at: null },
  { id: "f2", name: "Morgan Stanley", tier: "bulge_bracket", roles_offered: ["Investment Banking", "Wealth Management"], headquarters: "New York, NY", offices: ["New York", "Houston"], gpa_floor_estimated: 3.6, recruiting_profile: "Well-rounded candidates with leadership", careers_url: "", scraper_adapter: null, last_scraped_at: null },
  { id: "f3", name: "Evercore", tier: "elite_boutique", roles_offered: ["Investment Banking Advisory"], headquarters: "New York, NY", offices: ["New York", "Houston"], gpa_floor_estimated: 3.7, recruiting_profile: "Strong attention to detail", careers_url: "", scraper_adapter: null, last_scraped_at: null },
  { id: "f4", name: "Jefferies", tier: "middle_market", roles_offered: ["Investment Banking", "Equity Research"], headquarters: "New York, NY", offices: ["New York", "Los Angeles"], gpa_floor_estimated: 3.4, recruiting_profile: "Entrepreneurial mindset", careers_url: "", scraper_adapter: null, last_scraped_at: null },
  { id: "f5", name: "Lazard", tier: "elite_boutique", roles_offered: ["Financial Advisory", "Asset Management"], headquarters: "New York, NY", offices: ["New York", "Chicago"], gpa_floor_estimated: 3.7, recruiting_profile: "Intellectually curious candidates", careers_url: "", scraper_adapter: null, last_scraped_at: null },
];

const SAMPLE_READINESS: ReadinessScore[] = [
  { user_id: "demo", category: "accounting", mastery_score: 3.2, questions_attempted: 12, last_practiced_at: "2026-04-05", needs_review: false },
  { user_id: "demo", category: "valuation", mastery_score: 2.8, questions_attempted: 8, last_practiced_at: "2026-04-03", needs_review: false },
  { user_id: "demo", category: "ma", mastery_score: 1.9, questions_attempted: 4, last_practiced_at: "2026-03-28", needs_review: true },
  { user_id: "demo", category: "lbo", mastery_score: 1.4, questions_attempted: 3, last_practiced_at: "2026-03-25", needs_review: true },
  { user_id: "demo", category: "behavioral", mastery_score: 3.8, questions_attempted: 15, last_practiced_at: "2026-04-07", needs_review: false },
  { user_id: "demo", category: "firm_specific", mastery_score: 2.1, questions_attempted: 5, last_practiced_at: "2026-04-01", needs_review: true },
  { user_id: "demo", category: "market_awareness", mastery_score: 2.5, questions_attempted: 6, last_practiced_at: "2026-04-02", needs_review: false },
];

const SAMPLE_PAST_SESSIONS: PrepSession[] = [
  { id: "s1", user_id: "demo", firm_id: "f1", role_type: "investment_banking", session_type: "behavioral", questions_asked: 5, questions_correct: 4, overall_score: 3.8, claude_feedback: "Strong behavioral answers with good STAR structure.", duration_minutes: 18, created_at: "2026-04-07T14:30:00Z" },
  { id: "s2", user_id: "demo", firm_id: "f3", role_type: "investment_banking", session_type: "technical_accounting", questions_asked: 5, questions_correct: 3, overall_score: 3.2, claude_feedback: "Solid grasp of the three statements. Work on linking questions.", duration_minutes: 22, created_at: "2026-04-05T10:00:00Z" },
  { id: "s3", user_id: "demo", firm_id: "f2", role_type: "investment_banking", session_type: "technical_valuation", questions_asked: 5, questions_correct: 2, overall_score: 2.6, claude_feedback: "Review DCF mechanics and WACC calculation.", duration_minutes: 25, created_at: "2026-04-03T16:00:00Z" },
  { id: "s4", user_id: "demo", firm_id: "f1", role_type: "investment_banking", session_type: "technical_ma", questions_asked: 3, questions_correct: 1, overall_score: 1.9, claude_feedback: "Needs more work on merger model mechanics and accretion/dilution.", duration_minutes: 15, created_at: "2026-03-28T11:00:00Z" },
];

const PRESET_QUESTIONS: Record<string, PrepQuestion[]> = {
  technical_accounting: [
    { question: "Walk me through the three financial statements.", category: "accounting", difficulty: "easy" },
    { question: "What happens to each statement if depreciation increases by $10? Assume a 40% tax rate.", category: "accounting", difficulty: "medium" },
    { question: "How do you calculate enterprise value?", category: "accounting", difficulty: "medium" },
    { question: "What's the difference between EBITDA and free cash flow?", category: "accounting", difficulty: "medium" },
    { question: "If a company prepays $100 of rent, walk me through the impact on all three statements.", category: "accounting", difficulty: "hard" },
    { question: "A company issues $50 of stock to purchase $50 of PP&E. Walk me through the three statements.", category: "accounting", difficulty: "hard" },
    { question: "What is the difference between accounts payable and accrued expenses?", category: "accounting", difficulty: "easy" },
    { question: "How does an inventory write-down affect the three statements?", category: "accounting", difficulty: "hard" },
    { question: "A company collects $100 cash from a customer for a service it has not yet performed. Walk me through the three financial statements.", category: "accounting", difficulty: "medium" },
  ],
  technical_valuation: [
    { question: "Walk me through a DCF.", category: "valuation", difficulty: "medium" },
    { question: "What are the main valuation methodologies?", category: "valuation", difficulty: "easy" },
    { question: "When would you use a DCF vs comps?", category: "valuation", difficulty: "medium" },
    { question: "How do you calculate WACC?", category: "valuation", difficulty: "medium" },
    { question: "What drives terminal value?", category: "valuation", difficulty: "medium" },
    { question: "What are the advantages and disadvantages of precedent transactions vs comparable companies?", category: "valuation", difficulty: "hard" },
    { question: "How would you value a company with negative earnings?", category: "valuation", difficulty: "hard" },
    { question: "Walk me through a DCF step by step. How do you get from revenue to unlevered free cash flow, and how do you discount it back?", category: "valuation", difficulty: "hard" },
    { question: "If you could only use one valuation methodology, which would you choose and why?", category: "valuation", difficulty: "medium" },
  ],
  technical_ma: [
    { question: "Walk me through a basic merger model.", category: "ma", difficulty: "medium" },
    { question: "What is accretion/dilution?", category: "ma", difficulty: "medium" },
    { question: "Why would a company want to acquire another company?", category: "ma", difficulty: "easy" },
    { question: "What are synergies and how do you estimate them?", category: "ma", difficulty: "medium" },
    { question: "What's the difference between a stock deal and a cash deal?", category: "ma", difficulty: "easy" },
    { question: "How do you determine the purchase price in an acquisition?", category: "ma", difficulty: "hard" },
    { question: "Walk me through how goodwill is created in an acquisition and what happens if it becomes impaired.", category: "ma", difficulty: "hard" },
  ],
  technical_lbo: [
    { question: "Walk me through a basic LBO model.", category: "lbo", difficulty: "medium" },
    { question: "What makes a good LBO candidate?", category: "lbo", difficulty: "medium" },
    { question: "How do you calculate returns in an LBO?", category: "lbo", difficulty: "medium" },
    { question: "What are the key drivers of returns in an LBO?", category: "lbo", difficulty: "medium" },
    { question: "How does leverage affect returns in an LBO?", category: "lbo", difficulty: "easy" },
    { question: "Walk me through the sources and uses in an LBO.", category: "lbo", difficulty: "hard" },
    { question: "A PE firm buys a company for $500M using 60% debt. EBITDA is $50M. Walk me through the key assumptions and how you would model returns over a 5-year hold.", category: "lbo", difficulty: "hard" },
  ],
  behavioral: [
    { question: "Why investment banking?", category: "behavioral", difficulty: "easy" },
    { question: "Walk me through your resume.", category: "behavioral", difficulty: "easy" },
    { question: "Tell me about a time you worked on a team.", category: "behavioral", difficulty: "medium" },
    { question: "What's your biggest weakness?", category: "behavioral", difficulty: "medium" },
    { question: "Why should we hire you?", category: "behavioral", difficulty: "medium" },
    { question: "Tell me about a time you failed and what you learned.", category: "behavioral", difficulty: "medium" },
    { question: "Describe a time you had to persuade someone who disagreed with you.", category: "behavioral", difficulty: "hard" },
    { question: "Tell me about a time you had to work under a tight deadline. How did you prioritize and deliver?", category: "behavioral", difficulty: "medium" },
    { question: "Where do you see yourself in five years, and how does investment banking fit into that plan?", category: "behavioral", difficulty: "medium" },
  ],
  firm_specific: [
    { question: "Why do you want to work at this firm?", category: "firm_specific", difficulty: "medium" },
    { question: "What do you know about our recent deals?", category: "firm_specific", difficulty: "hard" },
    { question: "What differentiates this firm from other firms in this space?", category: "firm_specific", difficulty: "hard" },
    { question: "Where do you see this firm in five years?", category: "firm_specific", difficulty: "hard" },
  ],
  market_awareness: [
    { question: "What's happening in the markets right now?", category: "market_awareness", difficulty: "medium" },
    { question: "Tell me about a deal in the news.", category: "market_awareness", difficulty: "medium" },
    { question: "Where do you think interest rates are headed?", category: "market_awareness", difficulty: "hard" },
    { question: "What sector would you invest in right now and why?", category: "market_awareness", difficulty: "hard" },
    { question: "Tell me about an IPO or M&A deal from the last six months.", category: "market_awareness", difficulty: "medium" },
  ],
};

/** Simple local answer evaluator matching the backend rules-based logic. */
function evaluateLocally(question: PrepQuestion, answer: string): PrepAnswer {
  const words = answer.trim().split(/\s+/).length;
  const lower = answer.toLowerCase();
  let score = 50;
  const strengths: string[] = [];
  const improvements: string[] = [];

  // Length
  if (words < 20) { score -= 20; improvements.push("Answer is too short. Aim for at least a few sentences with specific detail."); }
  else if (words > 300) { score -= 10; improvements.push("Answer is too long. Keep it concise and structured."); }
  else { score += 5; strengths.push("Answer length is appropriate."); }

  // Technical key terms
  const keyTerms: Record<string, string[]> = {
    accounting: ["income statement", "balance sheet", "cash flow", "revenue", "net income", "assets", "liabilities", "equity"],
    valuation: ["dcf", "discount", "cash flow", "terminal value", "present value", "comparable", "precedent", "wacc", "multiple"],
    ma: ["synergies", "accretion", "dilution", "premium", "eps", "purchase price", "goodwill"],
    lbo: ["leverage", "debt", "equity", "irr", "cash flow", "exit", "multiple", "sponsor"],
    market_awareness: ["interest rate", "fed", "gdp", "inflation", "sector", "valuation", "deal"],
  };
  const terms = keyTerms[question.category];
  if (terms) {
    const hits = terms.filter((t) => lower.includes(t));
    const ratio = hits.length / terms.length;
    if (ratio >= 0.5) { score += 25; strengths.push(`Covers key concepts: ${hits.slice(0, 4).join(", ")}.`); }
    else if (ratio >= 0.25) { score += 10; strengths.push(`Mentions some key terms: ${hits.slice(0, 3).join(", ")}.`); }
    else { score -= 10; const missed = terms.filter((t) => !lower.includes(t)).slice(0, 4); improvements.push(`Missing critical concepts: ${missed.join(", ")}.`); }
  }

  // Behavioral STAR
  if (question.category === "behavioral") {
    const starHits = ["situation", "task", "action", "result"].filter((m) => lower.includes(m));
    if (starHits.length >= 3) { score += 20; strengths.push("Good use of the STAR framework."); }
    else if (starHits.length >= 2) { score += 10; strengths.push(`Partially uses STAR (${starHits.join(", ")}).`); }
    else { improvements.push("Structure your answer using the STAR framework: Situation, Task, Action, Result."); }
  }

  // Difficulty adj
  if (question.difficulty === "hard" && score >= 60) score += 5;
  if (question.difficulty === "easy" && score < 50) score -= 5;

  score = Math.max(0, Math.min(100, score));
  const normalizedScore = Math.round((score / 100) * 5 * 10) / 10;

  let feedback: string;
  if (score >= 80) feedback = "Strong answer. You hit the key points and structured your response well.";
  else if (score >= 60) feedback = "Decent answer, but there is room to tighten your structure and cover more key concepts.";
  else if (score >= 40) feedback = "Your answer needs more depth. Review the core frameworks and practice hitting all the key terms.";
  else feedback = "This answer needs significant improvement. Study the underlying concepts and practice delivering a structured response.";

  return {
    id: `local-${Date.now()}`,
    session_id: "local",
    user_id: "demo",
    question_text: question.question,
    question_category: question.category,
    question_difficulty: question.difficulty,
    user_answer: answer,
    score: normalizedScore,
    feedback,
    strengths,
    improvements,
    created_at: new Date().toISOString(),
  };
}

function SkeletonBlock() {
  return (
    <div className="bg-surface border border-surface-border rounded-lg p-6 animate-pulse space-y-3">
      <div className="h-4 bg-surface-hover rounded w-32" />
      <div className="h-8 bg-surface-hover rounded w-20" />
      <div className="h-3 bg-surface-hover rounded w-48" />
    </div>
  );
}

export default function PrepPage() {
  const [view, setView] = useState<View>("dashboard");
  const [firms, setFirms] = useState<Firm[]>([]);
  const [readinessScores, setReadinessScores] = useState<ReadinessScore[]>([]);
  const [overallReadiness, setOverallReadiness] = useState<number>(0);
  const [pastSessions, setPastSessions] = useState<PrepSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session start form
  const [selectedFirmId, setSelectedFirmId] = useState<string>("");
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType>("behavioral");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [startingSession, setStartingSession] = useState(false);

  // Active session state
  const [activeSession, setActiveSession] = useState<PrepSession | null>(null);
  const [questions, setQuestions] = useState<PrepQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<PrepAnswer | null>(null);
  const [sessionAnswers, setSessionAnswers] = useState<PrepAnswer[]>([]);

  // Why this firm
  const [whyFirmId, setWhyFirmId] = useState<string>("");
  const [whyFirmLoading, setWhyFirmLoading] = useState(false);
  const [whyFirmResult, setWhyFirmResult] = useState<{
    talking_points: string[];
    firm_name: string;
  } | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [firmsResult, readinessResult, historyResult] = await Promise.allSettled([
        getAllFirms(),
        getPrepReadiness(),
        getPrepHistory(),
      ]);

      const firmsOk = firmsResult.status === "fulfilled";
      const readinessOk = readinessResult.status === "fulfilled";
      const historyOk = historyResult.status === "fulfilled";

      // Use API data if available, otherwise fall back to presets
      const firmsData = firmsOk ? firmsResult.value : SAMPLE_FIRMS;
      setFirms(firmsData);
      if (firmsData.length > 0 && !selectedFirmId) setSelectedFirmId(firmsData[0].id);
      if (firmsData.length > 0 && !whyFirmId) setWhyFirmId(firmsData[0].id);

      if (readinessOk) {
        setReadinessScores(readinessResult.value.scores);
        setOverallReadiness(readinessResult.value.overall);
      } else {
        setReadinessScores(SAMPLE_READINESS);
        const totalWeighted = SAMPLE_READINESS.reduce((s, r) => s + r.mastery_score, 0);
        setOverallReadiness(Math.round((totalWeighted / SAMPLE_READINESS.length / 5) * 100));
      }

      if (historyOk) {
        setPastSessions(historyResult.value.sessions);
      } else {
        setPastSessions(SAMPLE_PAST_SESSIONS);
      }
    } catch {
      // Full fallback to preset data
      setFirms(SAMPLE_FIRMS);
      if (!selectedFirmId) setSelectedFirmId(SAMPLE_FIRMS[0].id);
      if (!whyFirmId) setWhyFirmId(SAMPLE_FIRMS[0].id);
      setReadinessScores(SAMPLE_READINESS);
      const totalWeighted = SAMPLE_READINESS.reduce((s, r) => s + r.mastery_score, 0);
      setOverallReadiness(Math.round((totalWeighted / SAMPLE_READINESS.length / 5) * 100));
      setPastSessions(SAMPLE_PAST_SESSIONS);
    } finally {
      setLoading(false);
    }
  }, [selectedFirmId, whyFirmId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleStartSession = async () => {
    if (!selectedFirmId) return;
    setStartingSession(true);
    try {
      const result = await startPrepSession({
        firm_id: selectedFirmId,
        role_type: undefined,
        session_type: selectedSessionType,
        question_count: questionCount,
      });
      setActiveSession(result.session);
      setQuestions(result.questions);
      setCurrentQuestionIndex(0);
      setUserAnswer("");
      setCurrentFeedback(null);
      setSessionAnswers([]);
      setView("session");
    } catch {
      // Fallback: use preset questions locally
      const pool = PRESET_QUESTIONS[selectedSessionType] || PRESET_QUESTIONS.behavioral;
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

      // Inject firm name for firm_specific questions
      const firmName = firms.find((f) => f.id === selectedFirmId)?.name || "the firm";
      const finalQuestions = selected.map((q) => ({
        ...q,
        question: q.question.replace(/this firm/g, firmName),
      }));

      const localSession: PrepSession = {
        id: `local-${Date.now()}`,
        user_id: "demo",
        firm_id: selectedFirmId,
        role_type: "investment_banking",
        session_type: selectedSessionType,
        questions_asked: finalQuestions.length,
        questions_correct: 0,
        overall_score: null,
        claude_feedback: null,
        duration_minutes: null,
        created_at: new Date().toISOString(),
      };
      setActiveSession(localSession);
      setQuestions(finalQuestions);
      setCurrentQuestionIndex(0);
      setUserAnswer("");
      setCurrentFeedback(null);
      setSessionAnswers([]);
      setView("session");
    } finally {
      setStartingSession(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!activeSession || !userAnswer.trim()) return;
    setSubmittingAnswer(true);
    try {
      const currentQuestion = questions[currentQuestionIndex];
      const result = await submitPrepAnswer({
        session_id: activeSession.id,
        question_text: currentQuestion.question,
        question_category: currentQuestion.category,
        question_difficulty: currentQuestion.difficulty,
        user_answer: userAnswer,
      });
      setCurrentFeedback(result.answer);
      setSessionAnswers((prev) => [...prev, result.answer]);
    } catch {
      // Fallback: evaluate locally
      const currentQuestion = questions[currentQuestionIndex];
      const localAnswer = evaluateLocally(currentQuestion, userAnswer);
      setCurrentFeedback(localAnswer);
      setSessionAnswers((prev) => [...prev, localAnswer]);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setUserAnswer("");
      setCurrentFeedback(null);
    } else {
      setView("complete");
    }
  };

  const handleBackToDashboard = async () => {
    setView("dashboard");
    setActiveSession(null);
    setQuestions([]);
    setCurrentFeedback(null);
    setSessionAnswers([]);
    await loadDashboard();
  };

  const handleNewSession = () => {
    setActiveSession(null);
    setQuestions([]);
    setCurrentFeedback(null);
    setSessionAnswers([]);
    setUserAnswer("");
    setView("dashboard");
  };

  const handleWhyFirm = async () => {
    if (!whyFirmId) return;
    setWhyFirmLoading(true);
    setWhyFirmResult(null);
    try {
      const result = await getWhyFirm(whyFirmId);
      setWhyFirmResult(result);
    } catch {
      // Fallback: generate local talking points
      const firm = firms.find((f) => f.id === whyFirmId);
      const name = firm?.name || "this firm";
      const tierPoints: Record<string, string> = {
        bulge_bracket: `${name}'s global platform and deal flow provide unmatched exposure to large-scale, complex transactions across every industry vertical.`,
        elite_boutique: `${name}'s lean deal teams give analysts significantly more responsibility and client exposure from day one compared to larger banks.`,
        middle_market: `${name}'s middle-market focus offers the chance to work on deals end-to-end, from sourcing through close, building a well-rounded skill set.`,
      };
      const points = [
        tierPoints[firm?.tier || "bulge_bracket"] || `${name} has a strong reputation for developing top-tier talent in the industry.`,
        `${name}'s culture of mentorship and analyst development aligns with my goal of building a strong technical foundation early in my career.`,
        `The caliber of transactions ${name} advises on — and the intellectual rigor required — is exactly the type of environment where I want to start my career.`,
        `${name}'s presence in ${firm?.headquarters || "New York"} positions me in the center of the financial industry and provides access to a broad professional network.`,
        `I have spoken with professionals at ${name} who consistently emphasize the collaborative team dynamic and the quality of the training program.`,
      ];
      setWhyFirmResult({ talking_points: points, firm_name: name });
    } finally {
      setWhyFirmLoading(false);
    }
  };

  const getFirmName = (firmId: string): string => {
    const firm = firms.find((f) => f.id === firmId);
    return firm ? firm.name : firmId;
  };

  const completedCorrect = sessionAnswers.filter((a) => a.score >= 3).length;
  const averageScore =
    sessionAnswers.length > 0
      ? sessionAnswers.reduce((sum, a) => sum + a.score, 0) / sessionAnswers.length
      : 0;

  // ── View: Active Session ──
  if (view === "session" && activeSession && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur border-b border-surface-border">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="font-serif text-xl font-medium text-accent">
              InternshipMatch
            </Link>
            <nav className="flex items-center gap-6 text-sm text-ink-secondary">
              <Link href="/dashboard" className="hover:text-ink-primary transition-colors">
                Dashboard
              </Link>
              <Link href="/timeline" className="hover:text-ink-primary transition-colors">
                Timeline
              </Link>
              <Link href="/applications" className="hover:text-ink-primary transition-colors">
                Applications
              </Link>
              <Link href="/alumni" className="hover:text-ink-primary transition-colors">
                Alumni
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">
          <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
            {/* Session header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-ink-secondary uppercase tracking-wider">
                  {getFirmName(activeSession.firm_id)} / {SESSION_TYPE_LABELS[activeSession.session_type as SessionType] || activeSession.session_type}
                </p>
                <h1 className="font-serif text-3xl tracking-tight mt-1">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </h1>
              </div>
              <SecondaryButton onClick={handleBackToDashboard} className="text-xs px-4 py-2">
                End session
              </SecondaryButton>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-surface-hover rounded-full h-1.5">
              <div
                className="bg-accent h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentQuestionIndex + (currentFeedback ? 1 : 0)) / questions.length) * 100}%`,
                }}
              />
            </div>

            {/* Question card */}
            <Card className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="font-mono text-xs px-2 py-1 bg-surface-hover rounded text-ink-secondary">
                  {CATEGORY_LABELS[currentQuestion.category] || currentQuestion.category}
                </span>
                <span className="font-mono text-xs px-2 py-1 bg-surface-hover rounded text-ink-secondary">
                  {currentQuestion.difficulty}
                </span>
              </div>
              <p className="text-lg leading-relaxed">{currentQuestion.question}</p>
            </Card>

            {/* Answer area */}
            {!currentFeedback && (
              <div className="space-y-4">
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={6}
                  className="w-full bg-surface border border-surface-border rounded-lg px-4 py-3 text-sm font-sans text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:border-accent resize-y"
                />
                <div className="flex justify-end">
                  <PrimaryButton
                    onClick={handleSubmitAnswer}
                    disabled={submittingAnswer || !userAnswer.trim()}
                    className={submittingAnswer ? "opacity-60" : ""}
                  >
                    {submittingAnswer ? "Evaluating..." : "Submit answer"}
                  </PrimaryButton>
                </div>
              </div>
            )}

            {/* Feedback */}
            {currentFeedback && (
              <div className="space-y-4">
                <Card className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <EyebrowLabel>Evaluation</EyebrowLabel>
                    <span className="font-mono text-3xl font-medium text-accent tabular-nums">
                      {currentFeedback.score}/5
                    </span>
                  </div>

                  <p className="text-sm text-ink-secondary leading-relaxed mb-6">
                    {currentFeedback.feedback}
                  </p>

                  {currentFeedback.strengths.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">
                        Strengths
                      </p>
                      <ul className="space-y-1">
                        {currentFeedback.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-green-800">
                            <CheckCircle size={16} weight="regular" className="mt-0.5 shrink-0" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {currentFeedback.improvements.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
                        Areas for improvement
                      </p>
                      <ul className="space-y-1">
                        {currentFeedback.improvements.map((imp, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                            <Warning size={16} weight="regular" className="mt-0.5 shrink-0" />
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>

                <div className="flex justify-end">
                  <PrimaryButton onClick={handleNextQuestion} icon={<CaretRight size={16} />}>
                    {currentQuestionIndex < questions.length - 1
                      ? "Next question"
                      : "Finish session"}
                  </PrimaryButton>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── View: Session Complete ──
  if (view === "complete" && activeSession) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur border-b border-surface-border">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="font-serif text-xl font-medium text-accent">
              InternshipMatch
            </Link>
            <nav className="flex items-center gap-6 text-sm text-ink-secondary">
              <Link href="/dashboard" className="hover:text-ink-primary transition-colors">
                Dashboard
              </Link>
              <Link href="/timeline" className="hover:text-ink-primary transition-colors">
                Timeline
              </Link>
              <Link href="/applications" className="hover:text-ink-primary transition-colors">
                Applications
              </Link>
              <Link href="/alumni" className="hover:text-ink-primary transition-colors">
                Alumni
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">
          <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
            <h1 className="font-serif text-4xl tracking-tight">Session complete</h1>

            {/* Summary card */}
            <Card className="p-8">
              <EyebrowLabel>Summary</EyebrowLabel>
              <div className="grid grid-cols-3 gap-6 mt-6">
                <div className="text-center">
                  <p className="font-mono text-4xl font-medium text-accent tabular-nums">
                    {averageScore.toFixed(1)}
                  </p>
                  <p className="text-xs text-ink-secondary mt-1">Average score</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-4xl font-medium text-accent tabular-nums">
                    {completedCorrect}/{sessionAnswers.length}
                  </p>
                  <p className="text-xs text-ink-secondary mt-1">Questions passed</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-4xl font-medium text-accent tabular-nums">
                    {activeSession.duration_minutes || "--"}
                  </p>
                  <p className="text-xs text-ink-secondary mt-1">Minutes</p>
                </div>
              </div>
            </Card>

            {/* Claude feedback */}
            {activeSession.claude_feedback && (
              <Card className="p-8">
                <EyebrowLabel>Feedback</EyebrowLabel>
                <p className="text-sm text-ink-secondary leading-relaxed mt-4">
                  {activeSession.claude_feedback}
                </p>
              </Card>
            )}

            {/* Per-question breakdown */}
            {sessionAnswers.length > 0 && (
              <div>
                <EyebrowLabel>Question breakdown</EyebrowLabel>
                <div className="space-y-2 mt-4">
                  {sessionAnswers.map((answer, i) => (
                    <div
                      key={answer.id || i}
                      className="bg-surface border border-surface-border rounded-lg px-5 py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-ink-secondary w-6">
                          {i + 1}.
                        </span>
                        <span className="text-sm truncate max-w-md">
                          {answer.question_text}
                        </span>
                      </div>
                      <span
                        className={`font-mono text-sm font-medium tabular-nums ${
                          answer.score >= 4
                            ? "text-green-700"
                            : answer.score >= 3
                            ? "text-blue-700"
                            : answer.score >= 2
                            ? "text-amber-700"
                            : "text-red-700"
                        }`}
                      >
                        {answer.score}/5
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <SecondaryButton onClick={handleBackToDashboard}>
                <ArrowLeft size={16} />
                Back to dashboard
              </SecondaryButton>
              <PrimaryButton onClick={handleNewSession} icon={<Play size={16} />}>
                Start new session
              </PrimaryButton>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── View: Dashboard (default) ──
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl font-medium text-accent">
            InternshipMatch
          </Link>
          <nav className="flex items-center gap-6 text-sm text-ink-secondary">
            <Link href="/dashboard" className="hover:text-ink-primary transition-colors">
              Dashboard
            </Link>
            <Link href="/timeline" className="hover:text-ink-primary transition-colors">
              Timeline
            </Link>
            <Link href="/applications" className="hover:text-ink-primary transition-colors">
              Applications
            </Link>
            <Link href="/alumni" className="hover:text-ink-primary transition-colors">
              Alumni
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-10">
          {/* Hero */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl tracking-tight">Interview prep</h1>
              <p className="text-base text-ink-secondary mt-1">
                Practice firm-specific questions with AI-evaluated answers.
              </p>
            </div>
            {!loading && (
              <div className="text-right">
                <p className="font-mono text-5xl font-medium text-accent tabular-nums">
                  {overallReadiness}%
                </p>
                <p className="text-xs text-ink-secondary mt-1">Overall readiness</p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 space-y-3">
              <p className="text-sm text-red-800">{error}</p>
              <PrimaryButton onClick={() => { setError(null); loadDashboard(); }} className="text-xs px-4 py-2">
                Retry
              </PrimaryButton>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-6">
              <p className="font-mono text-sm text-ink-secondary">Loading prep data...</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonBlock key={i} />
                ))}
              </div>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* ── Readiness Dashboard ── */}
              <div>
                <EyebrowLabel>Readiness by category</EyebrowLabel>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {readinessScores.map((rs) => (
                    <div
                      key={rs.category}
                      className="bg-surface border border-surface-border rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium">
                          {CATEGORY_LABELS[rs.category] || rs.category}
                        </p>
                        {rs.needs_review && (
                          <Warning size={14} weight="regular" className="text-amber-600" />
                        )}
                      </div>
                      {/* Mastery bar */}
                      <div className="w-full bg-surface-hover rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getMasteryColor(rs.mastery_score)}`}
                          style={{ width: `${(rs.mastery_score / 5) * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-ink-secondary tabular-nums">
                          {rs.mastery_score.toFixed(1)}/5
                        </span>
                        <span className="text-[10px] text-ink-tertiary">
                          {getMasteryLabel(rs.mastery_score)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-ink-tertiary">
                        <span>{rs.questions_attempted} attempted</span>
                        {rs.last_practiced_at && (
                          <span>{formatDate(rs.last_practiced_at)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Start Session Form ── */}
              <Card>
                <EyebrowLabel>Start a practice session</EyebrowLabel>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 items-end">
                  {/* Firm */}
                  <div>
                    <label className="block text-xs text-ink-secondary mb-1.5">Firm</label>
                    <select
                      value={selectedFirmId}
                      onChange={(e) => setSelectedFirmId(e.target.value)}
                      className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent cursor-pointer"
                    >
                      {firms.map((firm) => (
                        <option key={firm.id} value={firm.id}>
                          {firm.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Session type */}
                  <div>
                    <label className="block text-xs text-ink-secondary mb-1.5">Session type</label>
                    <select
                      value={selectedSessionType}
                      onChange={(e) => setSelectedSessionType(e.target.value as SessionType)}
                      className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent cursor-pointer"
                    >
                      {SESSION_TYPES.map((st) => (
                        <option key={st} value={st}>
                          {SESSION_TYPE_LABELS[st]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Question count */}
                  <div>
                    <label className="block text-xs text-ink-secondary mb-1.5">
                      Questions ({questionCount})
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value))}
                      className="w-full accent-accent cursor-pointer mt-1"
                    />
                  </div>

                  {/* Start */}
                  <PrimaryButton
                    onClick={handleStartSession}
                    disabled={startingSession || !selectedFirmId}
                    className={startingSession ? "opacity-60 w-full justify-center" : "w-full justify-center"}
                    icon={<Play size={16} />}
                  >
                    {startingSession ? "Starting..." : "Start"}
                  </PrimaryButton>
                </div>
              </Card>

              {/* ── Past Sessions ── */}
              {pastSessions.length > 0 && (
                <div>
                  <EyebrowLabel>Past sessions</EyebrowLabel>
                  <div className="mt-4 bg-surface border border-surface-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-border text-left">
                          <th className="px-4 py-3 font-mono text-xs text-ink-secondary font-normal uppercase tracking-wider">
                            Firm
                          </th>
                          <th className="px-4 py-3 font-mono text-xs text-ink-secondary font-normal uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 py-3 font-mono text-xs text-ink-secondary font-normal uppercase tracking-wider text-right">
                            Score
                          </th>
                          <th className="px-4 py-3 font-mono text-xs text-ink-secondary font-normal uppercase tracking-wider text-right">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastSessions.map((session) => (
                          <tr
                            key={session.id}
                            className="border-b border-surface-border last:border-b-0 hover:bg-surface-hover transition-colors"
                          >
                            <td className="px-4 py-3 font-mono text-xs">
                              {getFirmName(session.firm_id)}
                            </td>
                            <td className="px-4 py-3 text-ink-secondary">
                              {SESSION_TYPE_LABELS[session.session_type as SessionType] || session.session_type}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`font-mono tabular-nums font-medium ${
                                  (session.overall_score ?? 0) >= 4
                                    ? "text-green-700"
                                    : (session.overall_score ?? 0) >= 3
                                    ? "text-blue-700"
                                    : (session.overall_score ?? 0) >= 2
                                    ? "text-amber-700"
                                    : "text-red-700"
                                }`}
                              >
                                {session.overall_score?.toFixed(1) ?? "--"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs text-ink-secondary">
                              {formatDate(session.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Why This Firm ── */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb size={18} weight="regular" className="text-accent" />
                  <EyebrowLabel>Why this firm?</EyebrowLabel>
                </div>
                <p className="text-sm text-ink-secondary mb-4">
                  Generate talking points for your "Why do you want to work here?" answer.
                </p>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <select
                      value={whyFirmId}
                      onChange={(e) => {
                        setWhyFirmId(e.target.value);
                        setWhyFirmResult(null);
                      }}
                      className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent cursor-pointer"
                    >
                      {firms.map((firm) => (
                        <option key={firm.id} value={firm.id}>
                          {firm.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <SecondaryButton
                    onClick={handleWhyFirm}
                    disabled={whyFirmLoading || !whyFirmId}
                    className={whyFirmLoading ? "opacity-60" : ""}
                  >
                    {whyFirmLoading ? "Generating..." : "Generate"}
                  </SecondaryButton>
                </div>

                {whyFirmResult && (
                  <div className="mt-6 border-t border-surface-border pt-4">
                    <p className="font-mono text-xs text-ink-secondary uppercase tracking-wider mb-3">
                      {whyFirmResult.firm_name} -- Talking points
                    </p>
                    <ol className="space-y-2">
                      {whyFirmResult.talking_points.map((point, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                          <span className="font-mono text-xs text-ink-tertiary mt-0.5 shrink-0">
                            {i + 1}.
                          </span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

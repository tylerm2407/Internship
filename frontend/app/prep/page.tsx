"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  CaretDown,
  CaretUp,
  ArrowLeft,
  Lightbulb,
} from "@phosphor-icons/react";
import {
  getAllFirms,
  getProfile,
  startPrepSession,
  submitPrepAnswer,
  getPrepReadiness,
  getPrepHistory,
  getSessionAnswers,
  getWhyFirm,
} from "../../lib/api";
import { AuthGuard } from "../../components/AuthGuard";
import { Card } from "../../components/Card";
import { EyebrowLabel } from "../../components/EyebrowLabel";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SecondaryButton } from "../../components/SecondaryButton";
import type {
  Firm,
  StudentProfile,
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
  market_sizing: "Market Sizing",
  pitch_a_stock: "Pitch a Stock",
  restructuring: "Restructuring",
  pe_operations: "PE Operations",
  st_markets: "S&T / Markets",
  er_analysis: "Equity Research",
  quant_probability: "Quant / Probability",
  credit_analysis: "Credit Analysis",
};

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  technical_accounting: "Technical: Accounting",
  technical_valuation: "Technical: Valuation",
  technical_ma: "Technical: M&A",
  technical_lbo: "Technical: LBO",
  behavioral: "Behavioral",
  firm_specific: "Firm-Specific",
  market_awareness: "Market Awareness",
  brain_teaser: "Brain Teaser",
  market_sizing: "Market Sizing",
  pitch_a_stock: "Pitch a Stock",
  restructuring: "Restructuring",
  technical_pe: "Technical: Private Equity",
  technical_st_markets: "Technical: S&T / Markets",
  technical_er: "Technical: Equity Research",
  technical_quant: "Technical: Quant",
  technical_credit: "Technical: Credit",
};

const ALL_SESSION_TYPES: SessionType[] = [
  "technical_accounting",
  "technical_valuation",
  "technical_ma",
  "technical_lbo",
  "technical_pe",
  "technical_st_markets",
  "technical_er",
  "technical_quant",
  "technical_credit",
  "behavioral",
  "firm_specific",
  "market_awareness",
  "brain_teaser",
  "market_sizing",
  "pitch_a_stock",
  "restructuring",
];

// Universal session types shown to all users regardless of target role
const UNIVERSAL_SESSION_TYPES: SessionType[] = [
  "behavioral",
  "firm_specific",
  "market_awareness",
];

// Maps target roles to the session types most relevant for that role
const ROLE_TO_SESSION_TYPES: Record<string, SessionType[]> = {
  "Investment Banking": ["technical_accounting", "technical_valuation", "technical_ma", "technical_lbo", "restructuring"],
  "Capital Markets": ["technical_accounting", "technical_valuation", "technical_ma", "market_sizing"],
  "Restructuring": ["restructuring", "technical_accounting", "technical_credit", "technical_valuation"],
  "Sales & Trading": ["technical_st_markets", "brain_teaser", "market_sizing"],
  "Quant": ["technical_quant", "brain_teaser", "market_sizing"],
  "Private Equity": ["technical_pe", "technical_lbo", "technical_valuation"],
  "Hedge Fund": ["technical_quant", "pitch_a_stock", "technical_st_markets"],
  "Asset Management": ["technical_valuation", "pitch_a_stock", "market_sizing"],
  "Equity Research": ["technical_er", "technical_valuation", "pitch_a_stock"],
  "Credit / Leveraged Finance": ["technical_credit", "technical_accounting", "technical_valuation"],
  "Real Estate": ["technical_valuation", "technical_accounting", "technical_lbo"],
  "Corporate Finance / FP&A": ["technical_accounting", "technical_valuation", "market_sizing"],
  "Risk Management": ["technical_st_markets", "technical_quant", "brain_teaser"],
  "Compliance": ["technical_accounting", "market_sizing"],
  "Insurance": ["technical_accounting", "market_sizing", "brain_teaser"],
  "Wealth Management": ["technical_valuation", "pitch_a_stock", "market_sizing"],
  "Consulting (Finance)": ["technical_accounting", "technical_valuation", "market_sizing"],
};

function getSessionTypesForRoles(targetRoles: string[]): SessionType[] {
  if (!targetRoles || targetRoles.length === 0) return ALL_SESSION_TYPES;
  const roleSpecific = new Set<SessionType>();
  for (const role of targetRoles) {
    const types = ROLE_TO_SESSION_TYPES[role];
    if (types) {
      for (const t of types) roleSpecific.add(t);
    }
  }
  // Always include universal types
  for (const t of UNIVERSAL_SESSION_TYPES) roleSpecific.add(t);
  // If no matches found, show all
  if (roleSpecific.size <= UNIVERSAL_SESSION_TYPES.length) return ALL_SESSION_TYPES;
  // Return in the same order as ALL_SESSION_TYPES
  return ALL_SESSION_TYPES.filter((t) => roleSpecific.has(t));
}

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
  technical_pe: [
    { question: "Walk me through a leveraged buyout model.", category: "pe_operations", difficulty: "medium" },
    { question: "What makes a good LBO candidate?", category: "pe_operations", difficulty: "medium" },
    { question: "How do you calculate IRR and MOIC in a PE context?", category: "pe_operations", difficulty: "medium" },
    { question: "What are the key value creation levers in a PE deal?", category: "pe_operations", difficulty: "medium" },
    { question: "What is a bolt-on acquisition and why do PE firms pursue them?", category: "pe_operations", difficulty: "medium" },
    { question: "How do PE firms generate alpha beyond financial engineering?", category: "pe_operations", difficulty: "hard" },
    { question: "What due diligence would you perform on a target company?", category: "pe_operations", difficulty: "hard" },
  ],
  technical_st_markets: [
    { question: "Explain the Greeks: delta, gamma, theta, vega.", category: "st_markets", difficulty: "medium" },
    { question: "What is a yield curve and what does its shape tell you?", category: "st_markets", difficulty: "medium" },
    { question: "How does a market maker make money?", category: "st_markets", difficulty: "medium" },
    { question: "How would you hedge a long equity position?", category: "st_markets", difficulty: "medium" },
    { question: "Explain put-call parity.", category: "st_markets", difficulty: "hard" },
    { question: "If the Fed raises rates by 25 bps, what happens to bond prices?", category: "st_markets", difficulty: "easy" },
    { question: "What is duration and why does it matter for bond portfolios?", category: "st_markets", difficulty: "medium" },
  ],
  technical_er: [
    { question: "Walk me through how you would initiate coverage on a stock.", category: "er_analysis", difficulty: "hard" },
    { question: "What goes into building an earnings model?", category: "er_analysis", difficulty: "medium" },
    { question: "How do you derive a price target?", category: "er_analysis", difficulty: "medium" },
    { question: "Pitch me a stock you're following.", category: "er_analysis", difficulty: "hard" },
    { question: "What is a sum-of-the-parts valuation?", category: "er_analysis", difficulty: "medium" },
    { question: "How do you identify catalysts for a stock?", category: "er_analysis", difficulty: "medium" },
  ],
  technical_quant: [
    { question: "You flip a fair coin 10 times. What is the probability of getting exactly 7 heads?", category: "quant_probability", difficulty: "medium" },
    { question: "Explain Bayes' theorem with a practical example.", category: "quant_probability", difficulty: "medium" },
    { question: "Describe the Monty Hall problem and explain the correct strategy.", category: "quant_probability", difficulty: "medium" },
    { question: "You have 100 coins in a dark room: 30 heads, 70 tails. Split into two piles with equal heads. You can flip coins.", category: "quant_probability", difficulty: "hard" },
    { question: "What is the Central Limit Theorem and why is it important?", category: "quant_probability", difficulty: "medium" },
    { question: "Explain Monte Carlo simulation and when you would use it.", category: "quant_probability", difficulty: "medium" },
  ],
  technical_credit: [
    { question: "How do you assess a company's creditworthiness?", category: "credit_analysis", difficulty: "medium" },
    { question: "What are the key credit ratios you would look at?", category: "credit_analysis", difficulty: "medium" },
    { question: "Walk me through a capital structure analysis.", category: "credit_analysis", difficulty: "hard" },
    { question: "What is a debt covenant and why does it matter?", category: "credit_analysis", difficulty: "medium" },
    { question: "What is the difference between secured and unsecured debt?", category: "credit_analysis", difficulty: "easy" },
    { question: "How does Chapter 11 differ from Chapter 7 bankruptcy?", category: "credit_analysis", difficulty: "easy" },
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
    pe_operations: ["lbo", "leverage", "operating", "portfolio company", "irr", "moic", "bolt-on", "ebitda", "due diligence"],
    st_markets: ["greeks", "delta", "gamma", "options", "volatility", "yield curve", "duration", "market making", "spread"],
    er_analysis: ["earnings model", "price target", "valuation", "catalyst", "sector", "initiating coverage", "revenue growth"],
    quant_probability: ["probability", "expected value", "variance", "distribution", "bayes", "algorithm", "regression"],
    credit_analysis: ["credit", "leverage", "covenant", "default", "recovery", "capital structure", "rating", "spread"],
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
  const [userProfile, setUserProfile] = useState<StudentProfile | null>(null);
  const [readinessScores, setReadinessScores] = useState<ReadinessScore[]>([]);
  const [overallReadiness, setOverallReadiness] = useState<number>(0);
  const [pastSessions, setPastSessions] = useState<PrepSession[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [expandedAnswers, setExpandedAnswers] = useState<PrepAnswer[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
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

  // Compute filtered session types based on user's target roles
  const filteredSessionTypes = useMemo(
    () => getSessionTypesForRoles(userProfile?.target_roles ?? []),
    [userProfile],
  );

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
      const [firmsResult, readinessResult, historyResult, profileResult] = await Promise.allSettled([
        getAllFirms(),
        getPrepReadiness(),
        getPrepHistory(),
        getProfile(),
      ]);

      const firmsOk = firmsResult.status === "fulfilled";
      const readinessOk = readinessResult.status === "fulfilled";
      const historyOk = historyResult.status === "fulfilled";
      const profileOk = profileResult.status === "fulfilled";

      if (profileOk && profileResult.value) {
        setUserProfile(profileResult.value);
      }

      const firmsData = firmsOk ? firmsResult.value : [];
      setFirms(firmsData);
      if (firmsData.length > 0 && !selectedFirmId) setSelectedFirmId(firmsData[0].id);
      if (firmsData.length > 0 && !whyFirmId) setWhyFirmId(firmsData[0].id);

      if (readinessOk) {
        const rd = readinessResult.value;
        setReadinessScores(rd.scores ?? []);
        setOverallReadiness(rd.overall ?? 0);
      } else {
        setReadinessScores([]);
        setOverallReadiness(0);
      }

      if (historyOk) {
        setPastSessions(historyResult.value.sessions);
      } else {
        setPastSessions([]);
      }
    } catch {
      setFirms([]);
      setReadinessScores([]);
      setOverallReadiness(0);
      setPastSessions([]);
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

  const handleToggleSession = async (sessionId: string) => {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null);
      setExpandedAnswers([]);
      return;
    }
    setExpandedSessionId(sessionId);
    setLoadingAnswers(true);
    try {
      const data = await getSessionAnswers(sessionId);
      setExpandedAnswers(data.answers);
    } catch {
      setExpandedAnswers([]);
    } finally {
      setLoadingAnswers(false);
    }
  };

  const handleWhyFirm = async () => {
    if (!whyFirmId) return;
    setWhyFirmLoading(true);
    setWhyFirmResult(null);
    try {
      const result = await getWhyFirm(whyFirmId);
      setWhyFirmResult(result);
    } catch {
      setError("Failed to generate talking points. Please try again.");
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
      <AuthGuard>
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
      </AuthGuard>
    );
  }

  // ── View: Session Complete ──
  if (view === "complete" && activeSession) {
    return (
      <AuthGuard>
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
      </AuthGuard>
    );
  }

  // ── View: Dashboard (default) ──
  return (
    <AuthGuard>
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
                      {filteredSessionTypes.map((st) => (
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
                            onClick={() => handleToggleSession(session.id)}
                            className="border-b border-surface-border last:border-b-0 hover:bg-surface-hover transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3 font-mono text-xs flex items-center gap-2">
                              {expandedSessionId === session.id ? (
                                <CaretUp size={12} className="text-ink-secondary shrink-0" />
                              ) : (
                                <CaretDown size={12} className="text-ink-secondary shrink-0" />
                              )}
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

                      {/* Expanded answer detail panel */}
                      {expandedSessionId && (
                        <tfoot>
                          <tr>
                            <td colSpan={4} className="p-0">
                              <div className="border-t border-surface-border bg-[#F5F5F5] px-5 py-4 space-y-4">
                                {loadingAnswers ? (
                                  <p className="text-sm text-ink-secondary">Loading answers...</p>
                                ) : expandedAnswers.length === 0 ? (
                                  <p className="text-sm text-ink-secondary">No answers recorded for this session.</p>
                                ) : (
                                  expandedAnswers.map((answer, i) => (
                                    <div
                                      key={answer.id}
                                      className="bg-surface border border-surface-border rounded-lg p-4 space-y-3"
                                    >
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-2 min-w-0">
                                          <span className="font-mono text-xs text-ink-secondary mt-0.5 shrink-0">
                                            {i + 1}.
                                          </span>
                                          <div className="min-w-0">
                                            <p className="text-sm font-medium">{answer.question_text}</p>
                                            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded bg-surface-hover text-ink-secondary">
                                              {answer.question_difficulty}
                                            </span>
                                          </div>
                                        </div>
                                        <span
                                          className={`font-mono text-sm font-medium tabular-nums shrink-0 ${
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

                                      <div>
                                        <EyebrowLabel>Your answer</EyebrowLabel>
                                        <p className="text-sm text-ink-secondary mt-1 whitespace-pre-wrap">
                                          {answer.user_answer}
                                        </p>
                                      </div>

                                      {answer.feedback && (
                                        <div>
                                          <EyebrowLabel>Feedback</EyebrowLabel>
                                          <p className="text-sm text-ink-secondary mt-1">
                                            {answer.feedback}
                                          </p>
                                        </div>
                                      )}

                                      {answer.strengths && answer.strengths.length > 0 && (
                                        <div>
                                          <EyebrowLabel>Strengths</EyebrowLabel>
                                          <ul className="mt-1 space-y-1">
                                            {answer.strengths.map((s, si) => (
                                              <li key={si} className="text-sm text-green-700 flex items-start gap-1.5">
                                                <CheckCircle size={14} className="mt-0.5 shrink-0" />
                                                {s}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {answer.improvements && answer.improvements.length > 0 && (
                                        <div>
                                          <EyebrowLabel>Areas to improve</EyebrowLabel>
                                          <ul className="mt-1 space-y-1">
                                            {answer.improvements.map((imp, ii) => (
                                              <li key={ii} className="text-sm text-amber-700 flex items-start gap-1.5">
                                                <Warning size={14} className="mt-0.5 shrink-0" />
                                                {imp}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </td>
                          </tr>
                        </tfoot>
                      )}
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
    </AuthGuard>
  );
}

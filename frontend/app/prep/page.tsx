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
      if (firmsResult.status === "fulfilled") {
        setFirms(firmsResult.value);
        if (firmsResult.value.length > 0 && !selectedFirmId) {
          setSelectedFirmId(firmsResult.value[0].id);
        }
        if (firmsResult.value.length > 0 && !whyFirmId) {
          setWhyFirmId(firmsResult.value[0].id);
        }
      }
      if (readinessResult.status === "fulfilled") {
        setReadinessScores(readinessResult.value.scores);
        setOverallReadiness(readinessResult.value.overall);
      }
      if (historyResult.status === "fulfilled") {
        setPastSessions(historyResult.value.sessions);
      }
      const allFailed = [firmsResult, readinessResult, historyResult].every(
        (r) => r.status === "rejected"
      );
      if (allFailed) {
        setError("Failed to load prep data. Make sure you are logged in.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prep data");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answer");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate talking points");
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

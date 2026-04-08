"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  CaretDown,
  ClipboardText,
  Plus,
  X,
} from "@phosphor-icons/react";
import {
  getApplications,
  createApplication,
  updateApplication,
  getApplicationStats,
  getAllFirms,
  getOpportunities,
} from "../../lib/api";
import { Card } from "../../components/Card";
import { EyebrowLabel } from "../../components/EyebrowLabel";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SecondaryButton } from "../../components/SecondaryButton";
import type {
  Application,
  ApplicationCreate,
  ApplicationStats,
  ApplicationStatus,
  Firm,
  OpportunityResponse,
} from "../../lib/types";

// ── Status config ──

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  researching: "Researching",
  networking: "Networking",
  applied: "Applied",
  hirevue: "HireVue",
  phone_screen: "Phone Screen",
  first_round: "First Round",
  superday: "Superday",
  offer: "Offer",
  accepted: "Accepted",
  declined: "Declined",
  rejected: "Rejected",
  ghosted: "Ghosted",
};

const ALL_STATUSES: ApplicationStatus[] = [
  "researching",
  "networking",
  "applied",
  "hirevue",
  "phone_screen",
  "first_round",
  "superday",
  "offer",
  "accepted",
  "declined",
  "rejected",
  "ghosted",
];

function statusBadgeClasses(status: ApplicationStatus): string {
  switch (status) {
    case "researching":
    case "networking":
      return "bg-gray-100 text-gray-600";
    case "applied":
      return "bg-blue-50 text-blue-700";
    case "hirevue":
    case "phone_screen":
    case "first_round":
    case "superday":
      return "bg-amber-50 text-amber-700";
    case "offer":
      return "bg-green-50 text-green-800";
    case "accepted":
      return "bg-green-100 text-green-900";
    case "declined":
    case "rejected":
    case "ghosted":
      return "bg-red-50 text-red-700";
  }
}

type FilterGroup = "all" | "researching" | "networking" | "applied" | "interviewing" | "offers" | "closed";

const FILTER_GROUPS: { key: FilterGroup; label: string }[] = [
  { key: "all", label: "All" },
  { key: "researching", label: "Researching" },
  { key: "networking", label: "Networking" },
  { key: "applied", label: "Applied" },
  { key: "interviewing", label: "Interviewing" },
  { key: "offers", label: "Offers" },
  { key: "closed", label: "Closed" },
];

function matchesFilter(status: ApplicationStatus, filter: FilterGroup): boolean {
  if (filter === "all") return true;
  if (filter === "researching") return status === "researching";
  if (filter === "networking") return status === "networking";
  if (filter === "applied") return status === "applied";
  if (filter === "interviewing")
    return ["hirevue", "phone_screen", "first_round", "superday"].includes(status);
  if (filter === "offers") return ["offer", "accepted"].includes(status);
  if (filter === "closed") return ["declined", "rejected", "ghosted"].includes(status);
  return true;
}

// ── Skeleton ──

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-4"><div className="h-4 bg-surface-hover rounded w-28" /></td>
      <td className="px-4 py-4"><div className="h-4 bg-surface-hover rounded w-40" /></td>
      <td className="px-4 py-4"><div className="h-5 bg-surface-hover rounded w-20" /></td>
      <td className="px-4 py-4"><div className="h-4 bg-surface-hover rounded w-24" /></td>
      <td className="px-4 py-4"><div className="h-4 bg-surface-hover rounded w-32" /></td>
      <td className="px-4 py-4"><div className="h-4 bg-surface-hover rounded w-20" /></td>
    </tr>
  );
}

// ── Page ──

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [postings, setPostings] = useState<OpportunityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterGroup>("all");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // New application form state
  const [formFirmId, setFormFirmId] = useState("");
  const [formPostingId, setFormPostingId] = useState("");
  const [formDivision, setFormDivision] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Lookup maps
  const firmMap = new Map(firms.map((f) => [f.id, f]));
  const postingMap = new Map(postings.map((o) => [o.posting.id, o]));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [appResult, statsResult, firmResult, oppResult] = await Promise.allSettled([
        getApplications(),
        getApplicationStats(),
        getAllFirms(),
        getOpportunities(),
      ]);
      if (appResult.status === "fulfilled") setApplications(appResult.value);
      if (statsResult.status === "fulfilled") setStats(statsResult.value);
      if (firmResult.status === "fulfilled") setFirms(firmResult.value);
      if (oppResult.status === "fulfilled") setPostings(oppResult.value);
      const allFailed = [appResult, statsResult, firmResult, oppResult].every(
        (r) => r.status === "rejected"
      );
      if (allFailed) {
        setError("Failed to load data. Make sure you are logged in.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = useCallback(async () => {
    if (!formFirmId || !formPostingId) return;
    setSubmitting(true);
    try {
      const body: ApplicationCreate = {
        posting_id: formPostingId,
        firm_id: formFirmId,
        group_division: formDivision || null,
        notes: formNotes,
      };
      const newApp = await createApplication(body);
      setApplications((prev) => [newApp, ...prev]);
      setStats((prev) =>
        prev ? { ...prev, total: prev.total + 1 } : prev
      );
      setShowForm(false);
      setFormFirmId("");
      setFormPostingId("");
      setFormDivision("");
      setFormNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create application");
    } finally {
      setSubmitting(false);
    }
  }, [formFirmId, formPostingId, formDivision, formNotes]);

  const handleStatusChange = useCallback(
    async (appId: string, newStatus: ApplicationStatus) => {
      setUpdatingId(appId);
      try {
        const updated = await updateApplication(appId, { status: newStatus });
        setApplications((prev) =>
          prev.map((a) => (a.id === appId ? updated : a))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update status");
      } finally {
        setUpdatingId(null);
      }
    },
    []
  );

  const filtered = applications.filter((a) => matchesFilter(a.status, filter));

  // Compute stat counts
  const activeInterviewing = applications.filter((a) =>
    ["hirevue", "phone_screen", "first_round", "superday"].includes(a.status)
  ).length;
  const appliedCount = applications.filter((a) => a.status === "applied").length;
  const offerCount = applications.filter((a) =>
    ["offer", "accepted"].includes(a.status)
  ).length;

  // Filter postings by selected firm
  const firmPostings = formFirmId
    ? postings.filter((o) => o.firm.id === formFirmId)
    : [];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl font-medium text-accent">
            InternshipMatch
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm text-ink-secondary hover:text-ink-primary transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/timeline"
              className="text-sm text-ink-secondary hover:text-ink-primary transition-colors"
            >
              Timeline
            </Link>
            <Link
              href="/alumni"
              className="text-sm text-ink-secondary hover:text-ink-primary transition-colors"
            >
              Alumni
            </Link>
            <Link
              href="/prep"
              className="text-sm text-ink-secondary hover:text-ink-primary transition-colors"
            >
              Prep
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-10">
          {/* ── Hero ── */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="font-serif text-4xl tracking-tight">
                Application tracker
              </h1>
              <p className="text-base text-ink-secondary mt-1">
                Track every application from submitted through final round.
              </p>
            </div>
            <PrimaryButton
              onClick={() => setShowForm(!showForm)}
              icon={showForm ? <X size={16} weight="regular" /> : <Plus size={16} weight="regular" />}
            >
              {showForm ? "Cancel" : "Log application"}
            </PrimaryButton>
          </div>

          {/* ── Stats Bar ── */}
          {!loading && stats && (
            <div className="grid grid-cols-4 gap-4">
              <Card className="flex flex-col items-center py-4">
                <p className="font-mono text-3xl font-medium text-accent tabular-nums">
                  {stats.total}
                </p>
                <p className="text-xs text-ink-secondary mt-1">Total</p>
              </Card>
              <Card className="flex flex-col items-center py-4">
                <p className="font-mono text-3xl font-medium text-accent tabular-nums">
                  {appliedCount}
                </p>
                <p className="text-xs text-ink-secondary mt-1">Applied</p>
              </Card>
              <Card className="flex flex-col items-center py-4">
                <p className="font-mono text-3xl font-medium text-accent tabular-nums">
                  {activeInterviewing}
                </p>
                <p className="text-xs text-ink-secondary mt-1">Interviewing</p>
              </Card>
              <Card className="flex flex-col items-center py-4">
                <p className="font-mono text-3xl font-medium text-accent tabular-nums">
                  {offerCount}
                </p>
                <p className="text-xs text-ink-secondary mt-1">Offers</p>
              </Card>
            </div>
          )}

          {/* ── New Application Form ── */}
          {showForm && (
            <Card>
              <EyebrowLabel>Log new application</EyebrowLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-ink-primary mb-1">
                    Firm
                  </label>
                  <select
                    value={formFirmId}
                    onChange={(e) => {
                      setFormFirmId(e.target.value);
                      setFormPostingId("");
                    }}
                    className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="">Select a firm</option>
                    {firms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-primary mb-1">
                    Posting
                  </label>
                  <select
                    value={formPostingId}
                    onChange={(e) => setFormPostingId(e.target.value)}
                    disabled={!formFirmId}
                    className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {formFirmId ? "Select a posting" : "Select a firm first"}
                    </option>
                    {firmPostings.map((o) => (
                      <option key={o.posting.id} value={o.posting.id}>
                        {o.posting.title} — {o.posting.location}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-primary mb-1">
                    Group / Division
                  </label>
                  <input
                    type="text"
                    value={formDivision}
                    onChange={(e) => setFormDivision(e.target.value)}
                    placeholder="e.g. TMT, Healthcare, M&A"
                    className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent placeholder:text-ink-tertiary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-primary mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Optional notes"
                    className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent placeholder:text-ink-tertiary"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-5">
                <PrimaryButton
                  onClick={handleCreate}
                  disabled={!formFirmId || !formPostingId || submitting}
                  className={!formFirmId || !formPostingId || submitting ? "opacity-50 cursor-not-allowed" : ""}
                >
                  {submitting ? "Saving..." : "Save application"}
                </PrimaryButton>
                <SecondaryButton onClick={() => setShowForm(false)}>
                  Cancel
                </SecondaryButton>
              </div>
            </Card>
          )}

          {/* ── Filter Pills ── */}
          <div className="flex items-center gap-2 flex-wrap">
            {FILTER_GROUPS.map((fg) => (
              <button
                key={fg.key}
                onClick={() => setFilter(fg.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  filter === fg.key
                    ? "bg-accent text-white"
                    : "bg-surface border border-surface-border text-ink-secondary hover:bg-surface-hover"
                }`}
              >
                {fg.label}
              </button>
            ))}
          </div>

          {/* ── Loading ── */}
          {loading && (
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-left">
                    <th className="px-4 py-3 font-medium text-ink-secondary text-xs uppercase tracking-wider">Firm</th>
                    <th className="px-4 py-3 font-medium text-ink-secondary text-xs uppercase tracking-wider">Position</th>
                    <th className="px-4 py-3 font-medium text-ink-secondary text-xs uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 font-medium text-ink-secondary text-xs uppercase tracking-wider">Division</th>
                    <th className="px-4 py-3 font-medium text-ink-secondary text-xs uppercase tracking-wider">Next Action</th>
                    <th className="px-4 py-3 font-medium text-ink-secondary text-xs uppercase tracking-wider">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* ── Error ── */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 space-y-3">
              <p className="text-sm text-red-800">{error}</p>
              <PrimaryButton onClick={load} className="text-xs px-4 py-2">
                Retry
              </PrimaryButton>
            </div>
          )}

          {/* ── Empty State ── */}
          {!loading && !error && applications.length === 0 && (
            <div className="bg-surface border border-surface-border rounded-lg p-12 text-center space-y-4">
              <ClipboardText size={40} weight="regular" className="text-ink-tertiary mx-auto" />
              <p className="text-lg text-ink-secondary">
                No applications yet.
              </p>
              <p className="text-sm text-ink-tertiary">
                Start tracking from the dashboard or log your first application above.
              </p>
              <Link href="/dashboard">
                <SecondaryButton className="text-sm">
                  Go to dashboard
                </SecondaryButton>
              </Link>
            </div>
          )}

          {/* ── Table ── */}
          {!loading && !error && applications.length > 0 && (
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-left">
                    <th className="px-4 py-3 font-medium text-ink-secondary text-xs uppercase tracking-wider">
                      Firm
                    </th>
                    <th className="px-4 py-3 font-medium text-ink-secondary text-xs uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-4 py-3 font-medium text-ink-secondary text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 font-medium text-ink-secondary text-xs uppercase tracking-wider">
                      Division
                    </th>
                    <th className="px-4 py-3 font-medium text-ink-secondary text-xs uppercase tracking-wider">
                      Next Action
                    </th>
                    <th className="px-4 py-3 font-medium text-ink-secondary text-xs uppercase tracking-wider">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app) => {
                    const firm = firmMap.get(app.firm_id);
                    const posting = postingMap.get(app.posting_id);
                    return (
                      <tr
                        key={app.id}
                        className="border-b border-surface-border last:border-b-0 hover:bg-surface-hover transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Briefcase size={16} weight="regular" className="text-ink-tertiary shrink-0" />
                            <span className="font-medium text-ink-primary">
                              {firm?.name || "Unknown firm"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-ink-secondary">
                          {posting?.posting.title || "—"}
                        </td>
                        <td className="px-4 py-4">
                          <div className="relative inline-block">
                            <select
                              value={app.status}
                              onChange={(e) =>
                                handleStatusChange(app.id, e.target.value as ApplicationStatus)
                              }
                              disabled={updatingId === app.id}
                              className={`appearance-none pr-6 pl-2.5 py-1 rounded-md text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent ${statusBadgeClasses(app.status)} ${
                                updatingId === app.id ? "opacity-50" : ""
                              }`}
                            >
                              {ALL_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {STATUS_LABELS[s]}
                                </option>
                              ))}
                            </select>
                            <CaretDown
                              size={12}
                              weight="regular"
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-inherit"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-ink-secondary">
                          {app.group_division || "—"}
                        </td>
                        <td className="px-4 py-4 text-ink-secondary text-xs">
                          {app.next_action ? (
                            <div>
                              <p>{app.next_action}</p>
                              {app.next_action_date && (
                                <p className="font-mono text-ink-tertiary mt-0.5">
                                  {new Date(app.next_action_date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </p>
                              )}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-ink-tertiary">
                          {new Date(app.updated_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <p className="text-sm text-ink-secondary py-8 text-center">
                  No applications match the current filter.
                </p>
              )}
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

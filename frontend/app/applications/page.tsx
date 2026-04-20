"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CaretDown,
  ClipboardText,
  Clock,
  MagnifyingGlass,
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
import { AuthGuard } from "../../components/AuthGuard";
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

// ── Upcoming Deadlines ──

function UpcomingDeadlines({
  applications,
  firmMap,
}: {
  applications: Application[];
  firmMap: Map<string, Firm>;
}) {
  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcoming = applications
    .filter((a) => {
      if (!a.next_action_date) return false;
      const d = new Date(a.next_action_date);
      return d >= now && d <= sevenDaysOut;
    })
    .sort((a, b) => {
      const da = new Date(a.next_action_date as string).getTime();
      const db = new Date(b.next_action_date as string).getTime();
      return da - db;
    });

  if (upcoming.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Clock size={16} weight="regular" className="text-amber-700" />
        <span className="font-mono text-xs uppercase tracking-wider text-amber-700">
          Upcoming deadlines
        </span>
      </div>
      <div className="space-y-2">
        {upcoming.map((app) => {
          const firm = firmMap.get(app.firm_id);
          const displayName = app._firm_name || firm?.name || "Unknown firm";
          const d = new Date(app.next_action_date as string);
          const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const urgentColor = daysLeft <= 2 ? "text-red-700" : "text-amber-700";

          return (
            <div
              key={app.id}
              className="flex items-center justify-between bg-white/60 rounded-md px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm text-ink-primary">
                  {displayName}
                </span>
                {app.next_action && (
                  <span className="text-xs text-ink-secondary">
                    {app.next_action}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-ink-secondary">
                  {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <span className={`font-mono text-xs font-medium ${urgentColor}`}>
                  {daysLeft === 0 ? "Today" : daysLeft === 1 ? "Tomorrow" : `${daysLeft}d`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Conversion Funnel ──

function ConversionFunnel({ stats }: { stats: ApplicationStats }) {
  const applied = stats.by_status["applied"] || 0;
  const interviewing =
    (stats.by_status["hirevue"] || 0) +
    (stats.by_status["phone_screen"] || 0) +
    (stats.by_status["first_round"] || 0) +
    (stats.by_status["superday"] || 0);
  const offers =
    (stats.by_status["offer"] || 0) + (stats.by_status["accepted"] || 0);

  const rates = stats.conversion_rates;

  const stages = [
    { label: "Applied", count: applied },
    { label: "Interviewing", count: interviewing },
    { label: "Offers", count: offers },
  ];

  return (
    <div className="bg-surface border border-surface-border rounded-lg p-5">
      <p className="font-mono text-xs uppercase tracking-wider text-ink-secondary mb-4">
        Pipeline funnel
      </p>
      <div className="flex items-center justify-center gap-2">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-2">
            <div className="text-center">
              <p className="font-mono text-2xl font-medium text-accent tabular-nums">
                {stage.count}
              </p>
              <p className="text-xs text-ink-secondary mt-0.5">{stage.label}</p>
            </div>
            {i < stages.length - 1 && (
              <div className="flex flex-col items-center mx-2">
                <ArrowRight size={16} weight="regular" className="text-ink-tertiary" />
                {rates && (
                  <span className="font-mono text-[10px] text-ink-tertiary mt-0.5">
                    {i === 0
                      ? `${Math.round(rates.applied_to_interview * 100)}%`
                      : `${Math.round(rates.interview_to_offer * 100)}%`}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updated" | "firm" | "status" | "deadline">("updated");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // New application form state
  const [formFirmName, setFormFirmName] = useState("");
  const [formPosition, setFormPosition] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDivision, setFormDivision] = useState("");
  const [formStatus, setFormStatus] = useState<ApplicationStatus>("researching");
  const [formNotes, setFormNotes] = useState("");

  // Lookup maps
  const firmMap = new Map(firms.map((f) => [f.id, f]));
  const postingMap = new Map(postings.map((o) => [o.posting.id, o]));

  // Filter postings by selected firm (used for backend matching)
  const firmPostings = formFirmName
    ? postings.filter(
        (o) => o.firm.name.toLowerCase() === formFirmName.trim().toLowerCase()
      )
    : [];

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
    if (!formFirmName.trim()) return;
    setSubmitting(true);
    try {
      // Create a local-only application object for manual tracking
      const newApp: Application = {
        id: crypto.randomUUID(),
        user_id: "",
        posting_id: "",
        firm_id: "",
        status: formStatus,
        group_division: formDivision || null,
        applied_at: formStatus === "applied" ? new Date().toISOString() : null,
        notes: formNotes,
        next_action: null,
        next_action_date: null,
        resume_version: null,
        recruiter_name: null,
        recruiter_email: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Manual entry fields stored in the object for display
        _firm_name: formFirmName.trim(),
        _position: formPosition.trim() || null,
        _location: formLocation.trim() || null,
      };

      // Try to send to backend; if it fails, keep it local-only
      try {
        // Find matching firm from database if it exists
        const matchedFirm = firms.find(
          (f) => f.name.toLowerCase() === formFirmName.trim().toLowerCase()
        );
        if (matchedFirm) {
          const body: ApplicationCreate = {
            posting_id: firmPostings[0]?.posting.id || "",
            firm_id: matchedFirm.id,
            group_division: formDivision || null,
            notes: formNotes,
            status: formStatus,
          };
          if (body.posting_id) {
            const serverApp = await createApplication(body);
            newApp.id = serverApp.id;
            newApp.firm_id = serverApp.firm_id;
            newApp.posting_id = serverApp.posting_id;
          }
        }
      } catch {
        // Backend not available — app stays local-only, which is fine
      }

      setApplications((prev) => [newApp, ...prev]);
      setStats((prev) =>
        prev ? { ...prev, total: prev.total + 1 } : prev
      );
      setShowForm(false);
      setFormFirmName("");
      setFormPosition("");
      setFormLocation("");
      setFormDivision("");
      setFormStatus("researching");
      setFormNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create application");
    } finally {
      setSubmitting(false);
    }
  }, [formFirmName, formPosition, formLocation, formDivision, formStatus, formNotes, firms, firmPostings]);

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

  const filtered = applications
    .filter((a) => matchesFilter(a.status, filter))
    .filter((a) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const firmName = (a._firm_name || firmMap.get(a.firm_id)?.name || "").toLowerCase();
      const position = (a._position || postingMap.get(a.posting_id)?.posting.title || "").toLowerCase();
      const division = (a.group_division || "").toLowerCase();
      return firmName.includes(q) || position.includes(q) || division.includes(q);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "firm": {
          const nameA = (a._firm_name || firmMap.get(a.firm_id)?.name || "").toLowerCase();
          const nameB = (b._firm_name || firmMap.get(b.firm_id)?.name || "").toLowerCase();
          return nameA.localeCompare(nameB);
        }
        case "status": {
          return ALL_STATUSES.indexOf(a.status) - ALL_STATUSES.indexOf(b.status);
        }
        case "deadline": {
          const dateA = a.next_action_date ? new Date(a.next_action_date).getTime() : Infinity;
          const dateB = b.next_action_date ? new Date(b.next_action_date).getTime() : Infinity;
          return dateA - dateB;
        }
        case "updated":
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

  // Compute stat counts
  const activeInterviewing = applications.filter((a) =>
    ["hirevue", "phone_screen", "first_round", "superday"].includes(a.status)
  ).length;
  const appliedCount = applications.filter((a) => a.status === "applied").length;
  const offerCount = applications.filter((a) =>
    ["offer", "accepted"].includes(a.status)
  ).length;

  return (
    <AuthGuard>
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

          {/* ── Upcoming Deadlines ── */}
          {!loading && applications.length > 0 && (
            <UpcomingDeadlines applications={applications} firmMap={firmMap} />
          )}

          {/* ── Conversion Funnel ── */}
          {!loading && stats && stats.total > 0 && (
            <ConversionFunnel stats={stats} />
          )}

          {/* ── New Application Form ── */}
          {showForm && (
            <Card>
              <EyebrowLabel>Log new application</EyebrowLabel>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-ink-primary mb-1">
                    Firm name *
                  </label>
                  <input
                    type="text"
                    value={formFirmName}
                    onChange={(e) => setFormFirmName(e.target.value)}
                    placeholder="e.g. Goldman Sachs, Evercore, Jefferies"
                    className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent placeholder:text-ink-tertiary"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-primary mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    value={formPosition}
                    onChange={(e) => setFormPosition(e.target.value)}
                    placeholder="e.g. Summer Analyst - IB"
                    className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent placeholder:text-ink-tertiary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-primary mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. New York, NY"
                    className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent placeholder:text-ink-tertiary"
                  />
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
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ApplicationStatus)}
                    className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent cursor-pointer"
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
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
                  disabled={!formFirmName.trim() || submitting}
                  className={!formFirmName.trim() || submitting ? "opacity-50 cursor-not-allowed" : ""}
                >
                  {submitting ? "Saving..." : "Save application"}
                </PrimaryButton>
                <SecondaryButton onClick={() => setShowForm(false)}>
                  Cancel
                </SecondaryButton>
              </div>
            </Card>
          )}

          {/* ── Search, Filter, Sort ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <MagnifyingGlass
                  size={16}
                  weight="regular"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search firm, position, or division..."
                  className="w-full bg-surface border border-surface-border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-accent placeholder:text-ink-tertiary"
                />
              </div>

              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="appearance-none bg-surface border border-surface-border rounded-md pl-3 pr-8 py-2 text-xs font-medium text-ink-secondary focus:outline-none focus:border-accent cursor-pointer"
                >
                  <option value="updated">Sort: Recent</option>
                  <option value="firm">Sort: Firm</option>
                  <option value="status">Sort: Status</option>
                  <option value="deadline">Sort: Deadline</option>
                </select>
                <CaretDown
                  size={12}
                  weight="regular"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-tertiary"
                />
              </div>
            </div>

            {/* Filter pills */}
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
                    const displayFirmName = app._firm_name || firm?.name || "Unknown firm";
                    const displayPosition = app._position || posting?.posting.title || null;
                    return (
                      <tr
                        key={app.id}
                        className="border-b border-surface-border last:border-b-0 hover:bg-surface-hover transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Briefcase size={16} weight="regular" className="text-ink-tertiary shrink-0" />
                            <span className="font-medium text-ink-primary">
                              {displayFirmName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-ink-secondary">
                          {displayPosition || "—"}
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
    </AuthGuard>
  );
}

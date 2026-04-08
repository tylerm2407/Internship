"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarBlank,
  Briefcase,
  Star,
  Users,
  BookOpen,
  VideoCamera,
  Bell,
  Note,
  Plus,
  Check,
  Trash,
  ArrowClockwise,
  Warning,
} from "@phosphor-icons/react";
import {
  getTimelineEvents,
  getWeeklySummary,
  createTimelineEvent,
  updateTimelineEvent,
  deleteTimelineEvent,
} from "../../lib/api";
import { Card } from "../../components/Card";
import { EyebrowLabel } from "../../components/EyebrowLabel";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SecondaryButton } from "../../components/SecondaryButton";
import type {
  TimelineEvent,
  TimelineEventCreate,
  WeeklySummary,
  EventType,
  EventPriority,
} from "../../lib/types";

// ── Preset freshman IB timeline ──

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const PRESET_FRESHMAN_TIMELINE: TimelineEvent[] = [
  {
    id: "preset-01",
    user_id: "preset",
    event_type: "custom",
    title: "Join Bryant Finance Society",
    description: "Attend the first meeting of the semester. This is the #1 club for IB recruiting — attend every meeting, volunteer for events, and get on the board's radar.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(-14),
    priority: "critical",
    completed: true,
    completed_at: daysFromNow(-14),
    created_at: daysFromNow(-20),
  },
  {
    id: "preset-02",
    user_id: "preset",
    event_type: "prep_milestone",
    title: "Start reading Wall Street Journal daily",
    description: "15 minutes every morning. Focus on M&A section and Deals & Dealmakers. When someone asks 'what\'s happening in markets?' you need a real answer.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(1),
    priority: "medium",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-5),
  },
  {
    id: "preset-03",
    user_id: "preset",
    event_type: "custom",
    title: "Set up LinkedIn profile (finance-optimized)",
    description: "Professional headshot, headline: 'Finance Major at Bryant University | Aspiring Investment Banking Analyst'. Add coursework, Finance Society, any leadership.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(2),
    priority: "high",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-3),
  },
  {
    id: "preset-04",
    user_id: "preset",
    event_type: "custom",
    title: "Apply for SMIF (Student Managed Investment Fund)",
    description: "Applications for the Archway Investment Fund open in September. A SMIF seat is the single strongest resume line a Bryant freshman can get for IB recruiting.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(3),
    priority: "critical",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-10),
  },
  {
    id: "preset-05",
    user_id: "preset",
    event_type: "networking_task",
    title: "Connect with Bryant Career Services — IB advisor",
    description: "Schedule a meeting with your career advisor. Tell them you're targeting IB. Ask about alumni connections, mock interview slots, and any bank-specific recruiting events.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(5),
    priority: "medium",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-5),
  },
  {
    id: "preset-06",
    user_id: "preset",
    event_type: "prep_milestone",
    title: "Learn the 3 financial statements cold",
    description: "Income statement, balance sheet, cash flow statement. Know how they link. This is the foundation of every IB technical interview — start now, not junior year.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(7),
    priority: "critical",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-7),
  },
  {
    id: "preset-07",
    user_id: "preset",
    event_type: "prep_milestone",
    title: "Build v1 of your IB resume",
    description: "One page. Finance-formatted (no color, no graphics). Include GPA if 3.5+, relevant coursework, Finance Society, any leadership. Visit Career Services for a review.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(8),
    priority: "high",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-5),
  },
  {
    id: "preset-08",
    user_id: "preset",
    event_type: "prep_milestone",
    title: "Read 'The Vault Guide to Investment Banking'",
    description: "Chapters 1-6 cover what IB actually is, deal types, and career paths. Know this before your first networking call so you don't waste anyone's time.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(10),
    priority: "high",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-3),
  },
  {
    id: "preset-09",
    user_id: "preset",
    event_type: "networking_task",
    title: "Send first 5 cold outreach emails to Bryant alumni in IB",
    description: "Use LinkedIn to find Bryant grads at bulge bracket banks. Keep messages under 80 words. Ask for a 15-minute call, not a job. Reference Finance Society or a shared professor.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(12),
    priority: "high",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-5),
  },
  {
    id: "preset-10",
    user_id: "preset",
    event_type: "networking_task",
    title: "Attend Bryant Career Fair — finance firms",
    description: "Prepare a 30-second elevator pitch. Bring 10 copies of your resume. Target: collect 3-5 business cards. Follow up within 24 hours.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(14),
    priority: "high",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-10),
  },
  {
    id: "preset-11",
    user_id: "preset",
    event_type: "prep_milestone",
    title: "Master 'Walk me through your resume'",
    description: "Practice your story: why Bryant, why finance, why IB. 90 seconds max. Record yourself and listen back. This is THE most common first question.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(15),
    priority: "high",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-7),
  },
  {
    id: "preset-12",
    user_id: "preset",
    event_type: "diversity_program",
    title: "Goldman Sachs Possibilities Summit application",
    description: "GS runs early-look programs for freshmen and sophomores. No finance experience required — they're looking for high-potential students. Apply even if you feel underqualified.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(18),
    priority: "critical",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-10),
  },
  {
    id: "preset-13",
    user_id: "preset",
    event_type: "networking_task",
    title: "Schedule 2 informational calls with alumni",
    description: "Goal: have 2 calls completed by end of month. Prepare 5 questions for each call. Take notes. Send thank-you within 24 hours.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(20),
    priority: "high",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-5),
  },
  {
    id: "preset-14",
    user_id: "preset",
    event_type: "diversity_program",
    title: "JPMorgan Launching Leaders application",
    description: "Early insight program for freshmen. Focus your essay on intellectual curiosity about markets and client advisory, not on wanting to make money.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(21),
    priority: "critical",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-10),
  },
  {
    id: "preset-15",
    user_id: "preset",
    event_type: "custom",
    title: "Research sophomore summer programs at top 10 banks",
    description: "Goldman, JPM, Morgan Stanley, BofA, Citi, Evercore, Lazard, Moelis, Jefferies, Houlihan Lokey. Build a spreadsheet: firm, program name, deadline, requirements.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(22),
    priority: "medium",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-5),
  },
  {
    id: "preset-16",
    user_id: "preset",
    event_type: "diversity_program",
    title: "Morgan Stanley Early Insights deadline",
    description: "2-day program in NYC for freshmen and sophomores. Competitive but worth applying — the name on your resume opens doors.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(25),
    priority: "high",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-10),
  },
  {
    id: "preset-17",
    user_id: "preset",
    event_type: "prep_milestone",
    title: "Practice 'Why IB?' answer until it's natural",
    description: "Write it out, then practice saying it without reading. Should sound conversational, not rehearsed. Reference specific experiences. Under 60 seconds.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(25),
    priority: "medium",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-5),
  },
  {
    id: "preset-18",
    user_id: "preset",
    event_type: "custom",
    title: "Attend Finance Society speaker event — alumni panel",
    description: "Bryant alumni in IB panel discussion. Prepare 1 thoughtful question. Introduce yourself to at least 2 speakers after. This is networking in a low-pressure setting.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(28),
    priority: "medium",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-5),
  },
  {
    id: "preset-19",
    user_id: "preset",
    event_type: "prep_milestone",
    title: "Learn basic valuation concepts",
    description: "Understand what a DCF is at a high level, comparable companies analysis, and precedent transactions. You won't be tested deeply as a freshman but knowing these shows initiative.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(30),
    priority: "medium",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-5),
  },
  {
    id: "preset-20",
    user_id: "preset",
    event_type: "prep_milestone",
    title: "Complete 'Accounting 101' on Wall Street Prep (free)",
    description: "Free fundamentals course. Covers the basics you'll need for sophomore recruiting. Do this before winter break so you're ahead of the curve.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(35),
    priority: "medium",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-5),
  },
  {
    id: "preset-21",
    user_id: "preset",
    event_type: "custom",
    title: "Plan spring semester course load for IB",
    description: "Prioritize: Financial Accounting, Corporate Finance, Statistics, Economics. If you can take Financial Modeling or Excel-heavy courses, do it. GPA matters — don't overload.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(50),
    priority: "medium",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-5),
  },
  {
    id: "preset-22",
    user_id: "preset",
    event_type: "custom",
    title: "Winter break: read 'Monkey Business' or 'Liar's Poker'",
    description: "Classic Wall Street books that give you cultural context for IB interviews. When an interviewer asks what you're reading, having a finance book ready shows genuine interest.",
    firm_id: null,
    posting_id: null,
    event_date: daysFromNow(60),
    priority: "low",
    completed: false,
    completed_at: null,
    created_at: daysFromNow(-5),
  },
];

// ── Constants ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EVENT_TYPE_ICONS: Record<EventType, React.ComponentType<any>> = {
  application_deadline: CalendarBlank,
  application_open: Briefcase,
  diversity_program: Star,
  networking_task: Users,
  prep_milestone: BookOpen,
  interview_scheduled: VideoCamera,
  follow_up_reminder: Bell,
  custom: Note,
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  application_deadline: "Application Deadline",
  application_open: "Application Open",
  diversity_program: "Diversity Program",
  networking_task: "Networking Task",
  prep_milestone: "Prep Milestone",
  interview_scheduled: "Interview Scheduled",
  follow_up_reminder: "Follow-up Reminder",
  custom: "Custom",
};

const PRIORITY_STYLES: Record<EventPriority, string> = {
  critical: "text-red-700 bg-red-50 border-red-200",
  high: "text-amber-700 bg-amber-50 border-amber-200",
  medium: "text-blue-700 bg-blue-50 border-blue-200",
  low: "text-gray-600 bg-gray-100 border-gray-200",
};

const PRIORITY_LABELS: Record<EventPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

// ── Skeleton ──

function SkeletonCard() {
  return (
    <div className="bg-surface border border-surface-border rounded-lg p-5 flex items-center gap-4 animate-pulse">
      <div className="w-8 h-8 bg-surface-hover rounded-md shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-surface-hover rounded w-48" />
        <div className="h-3 bg-surface-hover rounded w-72" />
      </div>
      <div className="w-16 h-5 bg-surface-hover rounded shrink-0" />
    </div>
  );
}

function SkeletonPhase() {
  return (
    <div className="bg-surface border border-surface-border rounded-lg p-6 animate-pulse space-y-3">
      <div className="h-5 bg-surface-hover rounded w-40" />
      <div className="h-3 bg-surface-hover rounded w-full" />
      <div className="h-2 bg-surface-hover rounded w-1/3 mt-4" />
    </div>
  );
}

// ── Helpers ──

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function groupByMonth(events: TimelineEvent[]): Record<string, TimelineEvent[]> {
  const groups: Record<string, TimelineEvent[]> = {};
  for (const event of events) {
    const key = formatMonthYear(event.event_date);
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
  }
  return groups;
}

function isOverdue(event: TimelineEvent): boolean {
  if (event.completed) return false;
  return new Date(event.event_date) < new Date();
}

// ── Event Row Component ──

function EventRow({
  event,
  onToggleComplete,
  onDelete,
}: {
  event: TimelineEvent;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = EVENT_TYPE_ICONS[event.event_type] || Note;
  const overdue = isOverdue(event);

  return (
    <div
      className={`flex items-center gap-4 py-3 px-4 rounded-lg border transition-colors ${
        event.completed
          ? "bg-surface border-surface-border opacity-60"
          : overdue
          ? "bg-red-50/50 border-red-200"
          : "bg-surface border-surface-border hover:bg-surface-hover"
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggleComplete(event.id, !event.completed)}
        className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
          event.completed
            ? "bg-accent border-accent text-white"
            : "border-surface-border hover:border-accent"
        }`}
        aria-label={event.completed ? "Mark incomplete" : "Mark complete"}
      >
        {event.completed && <Check size={12} weight="bold" />}
      </button>

      {/* Icon */}
      <Icon
        size={20}
        weight="regular"
        className={event.completed ? "text-ink-tertiary" : "text-accent"}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            event.completed ? "line-through text-ink-tertiary" : "text-ink-primary"
          }`}
        >
          {event.title}
        </p>
        {event.description && (
          <p className="text-xs text-ink-secondary truncate mt-0.5">
            {event.description}
          </p>
        )}
      </div>

      {/* Date */}
      <span
        className={`font-mono text-xs shrink-0 ${
          overdue ? "text-red-700 font-medium" : "text-ink-secondary"
        }`}
      >
        {formatDate(event.event_date)}
      </span>

      {/* Priority badge */}
      <span
        className={`text-[10px] font-mono uppercase tracking-wider border rounded px-1.5 py-0.5 shrink-0 ${
          PRIORITY_STYLES[event.priority]
        }`}
      >
        {PRIORITY_LABELS[event.priority]}
      </span>

      {/* Type label */}
      <span className="text-[10px] font-mono uppercase tracking-wider text-ink-tertiary shrink-0 hidden md:inline">
        {EVENT_TYPE_LABELS[event.event_type]}
      </span>

      {/* Delete */}
      <button
        onClick={() => onDelete(event.id)}
        className="text-ink-tertiary hover:text-red-600 transition-colors cursor-pointer shrink-0"
        aria-label="Delete event"
      >
        <Trash size={16} weight="regular" />
      </button>
    </div>
  );
}

// ── Summary Item List ──

function SummaryItemList({
  items,
  emptyMessage,
  accentClass,
}: {
  items: TimelineEvent[];
  emptyMessage: string;
  accentClass?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-ink-tertiary italic">{emptyMessage}</p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {items.map((item) => {
        const Icon = EVENT_TYPE_ICONS[item.event_type] || Note;
        return (
          <li key={item.id} className="flex items-center gap-2 text-sm">
            <Icon
              size={14}
              weight="regular"
              className={accentClass || "text-ink-secondary"}
            />
            <span className={accentClass || "text-ink-primary"}>
              {item.title}
            </span>
            <span className="font-mono text-xs text-ink-tertiary ml-auto">
              {formatDate(item.event_date)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ── Add Event Form ──

function AddEventForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: TimelineEventCreate) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [priority, setPriority] = useState<EventPriority>("medium");
  const [eventType, setEventType] = useState<EventType>("custom");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;
    setSubmitting(true);
    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      event_date: eventDate,
      priority,
      event_type: eventType,
    });
    setSubmitting(false);
  };

  const inputClass =
    "bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent w-full";
  const selectClass =
    "bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent cursor-pointer";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Goldman Sachs TMT application deadline"
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1">
            Date
          </label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-1">
          Description (optional)
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional details..."
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1">
            Event type
          </label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventType)}
            className={selectClass + " w-full"}
          >
            {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((type) => (
              <option key={type} value={type}>
                {EVENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as EventPriority)}
            className={selectClass + " w-full"}
          >
            {(Object.keys(PRIORITY_LABELS) as EventPriority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <PrimaryButton type="submit" disabled={submitting || !title.trim() || !eventDate}>
          {submitting ? "Adding..." : "Add event"}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={onCancel}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
}

// ── Main Page ──

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsResult, summaryResult] = await Promise.allSettled([
        getTimelineEvents(),
        getWeeklySummary(),
      ]);

      const apiEvents =
        eventsResult.status === "fulfilled" ? eventsResult.value : [];

      // Use preset freshman timeline when API returns no events
      setEvents(apiEvents.length > 0 ? apiEvents : PRESET_FRESHMAN_TIMELINE);

      if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
    } catch {
      // API entirely unreachable — still show preset data
      setEvents(PRESET_FRESHMAN_TIMELINE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleComplete = useCallback(
    async (id: string, completed: boolean) => {
      // Preset events toggle locally only (not persisted)
      if (id.startsWith("preset-")) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === id
              ? { ...e, completed, completed_at: completed ? new Date().toISOString() : null }
              : e
          )
        );
        return;
      }
      try {
        const updated = await updateTimelineEvent(id, { completed });
        setEvents((prev) =>
          prev.map((e) => (e.id === id ? updated : e))
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update event"
        );
      }
    },
    []
  );

  const handleDelete = useCallback(async (id: string) => {
    // Preset events remove locally only
    if (id.startsWith("preset-")) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      return;
    }
    try {
      await deleteTimelineEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete event"
      );
    }
  }, []);

  const handleAddEvent = useCallback(
    async (data: TimelineEventCreate) => {
      try {
        const created = await createTimelineEvent(data);
        setEvents((prev) =>
          [...prev, created].sort(
            (a, b) =>
              new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
          )
        );
        setShowAddForm(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create event"
        );
      }
    },
    []
  );

  const sortedEvents = [...events].sort(
    (a, b) =>
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );
  const monthGroups = groupByMonth(sortedEvents);

  const completedCount = events.filter((e) => e.completed).length;
  const totalCount = events.length;

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
              href="/applications"
              className="text-sm text-ink-secondary hover:text-ink-primary transition-colors"
            >
              Applications
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
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl tracking-tight">
                Your recruiting timeline
              </h1>
              {!loading && totalCount > 0 && (
                <p className="text-base text-ink-secondary mt-1">
                  <span className="font-mono">{completedCount}</span> of{" "}
                  <span className="font-mono">{totalCount}</span> events completed
                </p>
              )}
            </div>
            {!loading && !error && (
              <SecondaryButton onClick={load}>
                <ArrowClockwise size={16} weight="regular" />
                Refresh
              </SecondaryButton>
            )}
          </div>

          {/* ── Loading State ── */}
          {loading && (
            <div className="space-y-6">
              <SkeletonPhase />
              <SkeletonPhase />
              <div className="space-y-3">
                <p className="font-mono text-sm text-ink-secondary">
                  Loading your timeline...
                </p>
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </div>
          )}

          {/* ── Error State ── */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Warning size={18} weight="regular" className="text-red-700" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <PrimaryButton onClick={load} className="text-xs px-4 py-2">
                Retry
              </PrimaryButton>
            </div>
          )}

          {/* ── Content ── */}
          {!loading && events.length > 0 && (
            <>
              {/* Preset data banner */}
              {events.some((e) => e.id.startsWith("preset-")) && (
                <Card className="border-accent/30 bg-accent/5">
                  <div className="flex items-start gap-3">
                    <BookOpen size={20} weight="regular" className="text-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-ink-primary">
                        Freshman IB recruiting roadmap
                      </p>
                      <p className="text-xs text-ink-secondary mt-0.5">
                        This is your preset timeline for breaking into investment banking as a Bryant freshman. Check off items as you complete them, or upload your resume to generate a personalized timeline.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Phase Indicator */}
              {summary && (
                <Card>
                  <EyebrowLabel>Current phase</EyebrowLabel>
                  <h2 className="font-serif text-2xl mt-2">
                    {summary.phase_name}
                  </h2>
                  <p className="text-sm text-ink-secondary mt-1">
                    {summary.phase_description}
                  </p>
                  {totalCount > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-ink-secondary mb-1">
                        <span className="font-mono">
                          {completedCount} / {totalCount} completed
                        </span>
                        <span className="font-mono">
                          {totalCount > 0
                            ? Math.round((completedCount / totalCount) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all duration-500"
                          style={{
                            width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {summary.stats && (
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-surface-border">
                      {Object.entries(summary.stats).map(([key, value]) => (
                        <div key={key} className="text-center">
                          <p className="font-mono text-xl font-medium text-accent tabular-nums">
                            {value as string | number}
                          </p>
                          <p className="text-[10px] font-mono uppercase tracking-wider text-ink-tertiary mt-0.5">
                            {key.replace(/_/g, " ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* This Week Summary */}
              {summary && (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <EyebrowLabel>This week</EyebrowLabel>
                    <span className="font-mono text-xs text-ink-tertiary">
                      {formatDate(summary.week_start)} &ndash;{" "}
                      {formatDate(summary.week_end)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Urgent */}
                    <div>
                      <p className="text-xs font-medium text-red-700 uppercase tracking-wider mb-2">
                        Urgent
                      </p>
                      <SummaryItemList
                        items={summary.urgent_items}
                        emptyMessage="Nothing urgent this week."
                        accentClass="text-red-700"
                      />
                    </div>

                    {/* Upcoming */}
                    <div>
                      <p className="text-xs font-medium text-blue-700 uppercase tracking-wider mb-2">
                        Upcoming
                      </p>
                      <SummaryItemList
                        items={summary.upcoming_items}
                        emptyMessage="No upcoming items."
                        accentClass="text-blue-700"
                      />
                    </div>

                    {/* Overdue */}
                    <div>
                      <p className="text-xs font-medium text-amber-700 uppercase tracking-wider mb-2">
                        Overdue
                      </p>
                      <SummaryItemList
                        items={summary.overdue_items}
                        emptyMessage="All caught up."
                        accentClass="text-amber-700"
                      />
                    </div>
                  </div>
                </Card>
              )}

              {/* Networking Nudges */}
              {summary &&
                summary.networking_nudges &&
                summary.networking_nudges.length > 0 && (
                  <Card>
                    <div className="flex items-center gap-2 mb-3">
                      <Users size={18} weight="regular" className="text-accent" />
                      <EyebrowLabel>Networking nudges</EyebrowLabel>
                    </div>
                    <ul className="space-y-2">
                      {summary.networking_nudges.map((nudge, i) => (
                        <li
                          key={i}
                          className="text-sm text-ink-primary flex items-start gap-2"
                        >
                          <span className="text-accent mt-0.5 shrink-0">
                            &bull;
                          </span>
                          {nudge}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

              {/* Add Event */}
              <div>
                {showAddForm ? (
                  <Card>
                    <EyebrowLabel>Add custom event</EyebrowLabel>
                    <div className="mt-4">
                      <AddEventForm
                        onSubmit={handleAddEvent}
                        onCancel={() => setShowAddForm(false)}
                      />
                    </div>
                  </Card>
                ) : (
                  <SecondaryButton onClick={() => setShowAddForm(true)}>
                    <Plus size={16} weight="regular" />
                    Add event
                  </SecondaryButton>
                )}
              </div>

              {/* Full Event List Grouped by Month */}
              {Object.keys(monthGroups).length > 0 && (
                <div className="space-y-8">
                  <EyebrowLabel>All events</EyebrowLabel>
                  {Object.entries(monthGroups).map(([month, monthEvents]) => (
                    <div key={month}>
                      <h3 className="font-serif text-lg mb-3">{month}</h3>
                      <div className="space-y-2">
                        {monthEvents.map((event) => (
                          <EventRow
                            key={event.id}
                            event={event}
                            onToggleComplete={handleToggleComplete}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  PaperPlaneTilt,
  Copy,
  Check,
  BellRinging,
  CaretDown,
  GraduationCap,
  Briefcase,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import {
  getAllFirms,
  getAlumni,
  getNetworkingContacts,
  createNetworkingContact,
  updateNetworkingContact,
  draftOutreach,
  getNetworkingNudges,
} from "../../lib/api";
import { Card } from "../../components/Card";
import { EyebrowLabel } from "../../components/EyebrowLabel";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SecondaryButton } from "../../components/SecondaryButton";
import type {
  Firm,
  Alumnus,
  NetworkingContact,
  OutreachDraftResponse,
  OutreachStatus,
  NetworkingNudge,
} from "../../lib/types";

// ── Status display config ──────────────────────────────────────

const STATUS_STYLES: Record<OutreachStatus, string> = {
  not_contacted: "bg-gray-100 text-gray-600",
  message_sent: "bg-blue-50 text-blue-700",
  followed_up: "bg-amber-50 text-amber-700",
  responded: "bg-green-50 text-green-700",
  call_scheduled: "bg-purple-50 text-purple-700",
  call_completed: "bg-green-100 text-green-800",
  thank_you_sent: "bg-green-50 text-green-600",
};

const STATUS_LABELS: Record<OutreachStatus, string> = {
  not_contacted: "Not contacted",
  message_sent: "Message sent",
  followed_up: "Followed up",
  responded: "Responded",
  call_scheduled: "Call scheduled",
  call_completed: "Call completed",
  thank_you_sent: "Thank you sent",
};

const ALL_STATUSES: OutreachStatus[] = [
  "not_contacted",
  "message_sent",
  "followed_up",
  "responded",
  "call_scheduled",
  "call_completed",
  "thank_you_sent",
];

// ── Sample data for demo ──────────────────────────────────────

const SAMPLE_FIRMS: Firm[] = [
  { id: "f1", name: "Goldman Sachs", tier: "bulge_bracket", roles_offered: ["Investment Banking", "Sales & Trading"], headquarters: "New York, NY", offices: ["New York", "San Francisco", "London"], gpa_floor_estimated: 3.7, recruiting_profile: "Top-tier talent from target schools with strong technical skills", careers_url: "", scraper_adapter: null, last_scraped_at: null },
  { id: "f2", name: "Morgan Stanley", tier: "bulge_bracket", roles_offered: ["Investment Banking", "Wealth Management"], headquarters: "New York, NY", offices: ["New York", "Houston", "London"], gpa_floor_estimated: 3.6, recruiting_profile: "Well-rounded candidates with leadership and analytical abilities", careers_url: "", scraper_adapter: null, last_scraped_at: null },
  { id: "f3", name: "Evercore", tier: "elite_boutique", roles_offered: ["Investment Banking Advisory"], headquarters: "New York, NY", offices: ["New York", "Houston", "London"], gpa_floor_estimated: 3.7, recruiting_profile: "Candidates with strong attention to detail and deal passion", careers_url: "", scraper_adapter: null, last_scraped_at: null },
  { id: "f4", name: "Jefferies", tier: "middle_market", roles_offered: ["Investment Banking", "Equity Research"], headquarters: "New York, NY", offices: ["New York", "Los Angeles", "Chicago"], gpa_floor_estimated: 3.4, recruiting_profile: "Entrepreneurial mindset with strong work ethic", careers_url: "", scraper_adapter: null, last_scraped_at: null },
  { id: "f5", name: "Lazard", tier: "elite_boutique", roles_offered: ["Financial Advisory", "Asset Management"], headquarters: "New York, NY", offices: ["New York", "Chicago", "Paris"], gpa_floor_estimated: 3.7, recruiting_profile: "Intellectually curious candidates with global perspective", careers_url: "", scraper_adapter: null, last_scraped_at: null },
];

const SAMPLE_ALUMNI: Record<string, Alumnus[]> = {
  f1: [
    { id: "a1", name: "Michael Chen", firm_id: "f1", current_role: "Analyst", division: "TMT Group", graduation_year: 2024, school: "Bryant University", major: "Finance", connection_hooks: ["Finance Society", "Same major"], created_at: "2025-09-15" },
    { id: "a2", name: "Sarah Thompson", firm_id: "f1", current_role: "Associate", division: "Healthcare", graduation_year: 2022, school: "Bryant University", major: "Accounting", connection_hooks: ["Bryant Honors", "Study abroad — London"], created_at: "2025-09-15" },
    { id: "a3", name: "David Park", firm_id: "f1", current_role: "VP", division: "Leveraged Finance", graduation_year: 2018, school: "Bryant University", major: "Finance", connection_hooks: ["Finance Society president", "Korean Student Association"], created_at: "2025-09-15" },
  ],
  f2: [
    { id: "a4", name: "Jessica Rivera", firm_id: "f2", current_role: "Analyst", division: "M&A", graduation_year: 2024, school: "Bryant University", major: "Finance", connection_hooks: ["Investment Club", "Women in Business"], created_at: "2025-09-15" },
    { id: "a5", name: "Ryan O'Brien", firm_id: "f2", current_role: "Associate", division: "Wealth Management", graduation_year: 2023, school: "Bryant University", major: "Financial Services", connection_hooks: ["Same fraternity", "Finance Society"], created_at: "2025-09-15" },
  ],
  f3: [
    { id: "a6", name: "Amanda Liu", firm_id: "f3", current_role: "Analyst", division: "Advisory", graduation_year: 2025, school: "Bryant University", major: "Finance", connection_hooks: ["Finance Society VP", "Same professor — Dr. Louton"], created_at: "2025-09-15" },
    { id: "a7", name: "Christopher Walsh", firm_id: "f3", current_role: "Associate", division: "Restructuring", graduation_year: 2021, school: "Bryant University", major: "Accounting", connection_hooks: ["Bryant Honors", "Accounting Association"], created_at: "2025-09-15" },
  ],
  f4: [
    { id: "a8", name: "Nicole Patel", firm_id: "f4", current_role: "Analyst", division: "Industrials", graduation_year: 2024, school: "Bryant University", major: "Finance", connection_hooks: ["Finance Society", "Dean's List"], created_at: "2025-09-15" },
  ],
  f5: [
    { id: "a9", name: "James McCarthy", firm_id: "f5", current_role: "Analyst", division: "Financial Advisory", graduation_year: 2025, school: "Bryant University", major: "Finance", connection_hooks: ["Study abroad — Paris", "Finance Society"], created_at: "2025-09-15" },
    { id: "a10", name: "Emily Nguyen", firm_id: "f5", current_role: "VP", division: "Asset Management", graduation_year: 2017, school: "Bryant University", major: "Applied Mathematics", connection_hooks: ["Math department", "First-gen scholarship"], created_at: "2025-09-15" },
  ],
};

const SAMPLE_CONTACTS: NetworkingContact[] = [
  { id: "c1", user_id: "u1", alumni_id: "a1", firm_id: "f1", contact_name: "Michael Chen", contact_role: "Analyst", contact_division: "TMT Group", connection_type: "alumni", referred_by_id: null, outreach_status: "message_sent", outreach_date: "2026-03-20", follow_up_date: "2026-03-27", call_date: null, call_notes: null, thank_you_sent_at: null, next_action: "Follow up if no response", next_action_date: "2026-03-27", created_at: "2026-03-18", updated_at: "2026-03-20" },
  { id: "c2", user_id: "u1", alumni_id: "a4", firm_id: "f2", contact_name: "Jessica Rivera", contact_role: "Analyst", contact_division: "M&A", connection_type: "alumni", referred_by_id: null, outreach_status: "call_completed", outreach_date: "2026-02-15", follow_up_date: null, call_date: "2026-03-01", call_notes: "Great call — discussed day-to-day as an analyst. She recommended reaching out to her staffer for summer recruiting info.", thank_you_sent_at: "2026-03-01", next_action: "Connect with her staffer", next_action_date: "2026-03-10", created_at: "2026-02-10", updated_at: "2026-03-01" },
  { id: "c3", user_id: "u1", alumni_id: "a6", firm_id: "f3", contact_name: "Amanda Liu", contact_role: "Analyst", contact_division: "Advisory", connection_type: "alumni", referred_by_id: null, outreach_status: "responded", outreach_date: "2026-03-25", follow_up_date: null, call_date: null, call_notes: null, thank_you_sent_at: null, next_action: "Schedule call this week", next_action_date: "2026-04-05", created_at: "2026-03-22", updated_at: "2026-03-28" },
  { id: "c4", user_id: "u1", alumni_id: null, firm_id: "f4", contact_name: "Tom Bradley", contact_role: "Managing Director", contact_division: "Healthcare", connection_type: "career_fair", referred_by_id: null, outreach_status: "followed_up", outreach_date: "2026-03-10", follow_up_date: "2026-03-24", call_date: null, call_notes: null, thank_you_sent_at: null, next_action: "Wait for response", next_action_date: "2026-04-01", created_at: "2026-03-08", updated_at: "2026-03-24" },
  { id: "c5", user_id: "u1", alumni_id: "a9", firm_id: "f5", contact_name: "James McCarthy", contact_role: "Analyst", contact_division: "Financial Advisory", connection_type: "alumni", referred_by_id: null, outreach_status: "not_contacted", outreach_date: null, follow_up_date: null, call_date: null, call_notes: null, thank_you_sent_at: null, next_action: "Send initial outreach email", next_action_date: "2026-04-10", created_at: "2026-04-01", updated_at: "2026-04-01" },
];

const SAMPLE_NUDGES: NetworkingNudge[] = [
  { contact_id: "c1", contact_name: "Michael Chen", firm_id: "f1", days_since_outreach: 19, message: "It's been 19 days since you messaged Michael Chen at Goldman Sachs. Send a polite follow-up." },
  { contact_id: "c3", contact_name: "Amanda Liu", firm_id: "f3", message: "Amanda Liu at Evercore responded — schedule a call before she forgets." },
];

// ── Skeleton loaders ───────────────────────────────────────────

function AlumniSkeleton() {
  return (
    <div className="bg-surface border border-surface-border rounded-lg p-5 animate-pulse space-y-3">
      <div className="h-5 bg-surface-hover rounded w-40" />
      <div className="h-4 bg-surface-hover rounded w-56" />
      <div className="h-3 bg-surface-hover rounded w-32" />
      <div className="flex gap-2 mt-2">
        <div className="h-5 w-16 bg-surface-hover rounded" />
        <div className="h-5 w-20 bg-surface-hover rounded" />
      </div>
      <div className="flex gap-2 mt-3">
        <div className="h-8 w-28 bg-surface-hover rounded-md" />
        <div className="h-8 w-32 bg-surface-hover rounded-md" />
      </div>
    </div>
  );
}

function ContactsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-surface border border-surface-border rounded-lg px-5 py-3 flex items-center gap-4 animate-pulse"
        >
          <div className="h-4 w-32 bg-surface-hover rounded" />
          <div className="h-4 w-24 bg-surface-hover rounded" />
          <div className="h-5 w-20 bg-surface-hover rounded" />
          <div className="ml-auto h-4 w-28 bg-surface-hover rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function AlumniPage() {
  // Data state
  const [firms, setFirms] = useState<Firm[]>([]);
  const [selectedFirmId, setSelectedFirmId] = useState<string>("");
  const [alumni, setAlumni] = useState<Alumnus[]>([]);
  const [selectedFirm, setSelectedFirm] = useState<Firm | null>(null);
  const [contacts, setContacts] = useState<NetworkingContact[]>([]);
  const [followUpNudges, setFollowUpNudges] = useState<NetworkingNudge[]>([]);
  const [thankYouNudges, setThankYouNudges] = useState<NetworkingNudge[]>([]);

  // Loading / error
  const [firmsLoading, setFirmsLoading] = useState(true);
  const [alumniLoading, setAlumniLoading] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Outreach drafts: keyed by alumni id
  const [drafts, setDrafts] = useState<Record<string, OutreachDraftResponse>>({});
  const [draftLoading, setDraftLoading] = useState<Record<string, boolean>>({});

  // Clipboard feedback
  const [copiedDraftKey, setCopiedDraftKey] = useState<string | null>(null);

  // Adding contact feedback
  const [addingContact, setAddingContact] = useState<Record<string, boolean>>({});

  // ── Initial load ─────────────────────────────────────────────

  const loadInitial = useCallback(async () => {
    setFirmsLoading(true);
    setContactsLoading(true);
    setError(null);
    try {
      const [firmsResult, contactsResult, nudgesResult] = await Promise.allSettled([
        getAllFirms(),
        getNetworkingContacts(),
        getNetworkingNudges(),
      ]);
      if (firmsResult.status === "fulfilled") setFirms(firmsResult.value);
      if (contactsResult.status === "fulfilled") setContacts(contactsResult.value);
      if (nudgesResult.status === "fulfilled") {
        setFollowUpNudges(nudgesResult.value.follow_up_nudges);
        setThankYouNudges(nudgesResult.value.thank_you_nudges);
      }
      // If API calls fail, load sample data for demo
      if (firmsResult.status === "rejected" || contactsResult.status === "rejected") {
        if (firmsResult.status === "rejected") setFirms(SAMPLE_FIRMS);
        if (contactsResult.status === "rejected") setContacts(SAMPLE_CONTACTS);
        if (nudgesResult.status === "rejected") {
          setFollowUpNudges(SAMPLE_NUDGES.filter((n) => n.days_since_outreach));
          setThankYouNudges(SAMPLE_NUDGES.filter((n) => !n.days_since_outreach));
        }
      }
    } catch {
      // Fallback to sample data
      setFirms(SAMPLE_FIRMS);
      setContacts(SAMPLE_CONTACTS);
      setFollowUpNudges(SAMPLE_NUDGES.filter((n) => n.days_since_outreach));
      setThankYouNudges(SAMPLE_NUDGES.filter((n) => !n.days_since_outreach));
    } finally {
      setFirmsLoading(false);
      setContactsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // ── Load alumni when firm changes ────────────────────────────

  const loadAlumni = useCallback(async (firmId: string) => {
    if (!firmId) {
      setAlumni([]);
      setSelectedFirm(null);
      return;
    }
    setAlumniLoading(true);
    try {
      const data = await getAlumni(firmId);
      setAlumni(data.alumni);
      setSelectedFirm(data.firm);
    } catch {
      // Fallback to sample data for demo
      const sampleAlum = SAMPLE_ALUMNI[firmId] || [];
      const sampleFirm = SAMPLE_FIRMS.find((f) => f.id === firmId) || null;
      setAlumni(sampleAlum);
      setSelectedFirm(sampleFirm);
    } finally {
      setAlumniLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFirmId) {
      loadAlumni(selectedFirmId);
    } else {
      setAlumni([]);
      setSelectedFirm(null);
    }
  }, [selectedFirmId, loadAlumni]);

  // ── Handlers ─────────────────────────────────────────────────

  async function handleAddContact(alum: Alumnus) {
    setAddingContact((prev) => ({ ...prev, [alum.id]: true }));
    try {
      const newContact = await createNetworkingContact({
        alumni_id: alum.id,
        firm_id: alum.firm_id,
        contact_name: alum.name,
        contact_role: alum.current_role,
        contact_division: alum.division,
        connection_type: "alumni",
      });
      setContacts((prev) => [newContact, ...prev]);
    } catch {
      // Fallback: create local-only contact for demo
      const localContact: NetworkingContact = {
        id: `local-${Date.now()}`,
        user_id: "demo",
        alumni_id: alum.id,
        firm_id: alum.firm_id,
        contact_name: alum.name,
        contact_role: alum.current_role,
        contact_division: alum.division,
        connection_type: "alumni",
        referred_by_id: null,
        outreach_status: "not_contacted",
        outreach_date: null,
        follow_up_date: null,
        call_date: null,
        call_notes: null,
        thank_you_sent_at: null,
        next_action: "Send initial outreach email",
        next_action_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setContacts((prev) => [localContact, ...prev]);
    } finally {
      setAddingContact((prev) => ({ ...prev, [alum.id]: false }));
    }
  }

  async function handleDraftOutreach(alum: Alumnus) {
    // Must be a contact first
    const existingContact = contacts.find((c) => c.alumni_id === alum.id);
    let contactId = existingContact?.id;

    if (!contactId) {
      // Auto-add as contact first
      await handleAddContact(alum);
      contactId = `local-fallback`;
    }

    setDraftLoading((prev) => ({ ...prev, [alum.id]: true }));
    try {
      const result = await draftOutreach(contactId, "professional");
      setDrafts((prev) => ({ ...prev, [alum.id]: result }));
    } catch {
      // Fallback: generate sample outreach draft locally
      const firmName = SAMPLE_FIRMS.find((f) => f.id === alum.firm_id)?.name || "the firm";
      const hooks = alum.connection_hooks.length > 0 ? alum.connection_hooks : ["Bryant University"];
      const localDraft: OutreachDraftResponse = {
        contact_name: alum.name,
        firm_name: firmName,
        connection_hooks_used: hooks,
        drafts: [
          `Hi ${alum.name.split(" ")[0]},\n\nMy name is Owen Ash and I'm a sophomore Finance major at Bryant University. I came across your profile and was excited to see a fellow Bulldog at ${firmName}${alum.division ? ` in the ${alum.division} group` : ""}.\n\n${hooks.includes("Finance Society") ? "I'm currently involved in the Finance Society at Bryant and " : "I'm "}very interested in learning more about your experience${alum.division ? ` in ${alum.division}` : ""} and any advice you might have for someone recruiting for similar roles.\n\nWould you have 15-20 minutes in the coming weeks for a brief call? I'd really appreciate any insight you could share.\n\nBest regards,\nOwen Ash\nBryant University '29`,
          `Dear ${alum.name.split(" ")[0]},\n\nI hope this message finds you well. I'm Owen Ash, a Finance major at Bryant University (Class of 2029), and I noticed we share a connection through ${hooks[0]}.\n\nI'm currently exploring opportunities in ${alum.division || "investment banking"} and would love to hear about your path from Bryant to ${firmName}. Your experience as ${alum.current_role} is exactly the kind of career trajectory I'm aiming for.\n\nIf you have any availability for a brief informational call, I would be very grateful for your time.\n\nThank you,\nOwen Ash`,
        ],
      };
      setDrafts((prev) => ({ ...prev, [alum.id]: localDraft }));
    } finally {
      setDraftLoading((prev) => ({ ...prev, [alum.id]: false }));
    }
  }

  async function handleStatusChange(contactId: string, newStatus: OutreachStatus) {
    try {
      const updated = await updateNetworkingContact(contactId, {
        outreach_status: newStatus,
      });
      setContacts((prev) =>
        prev.map((c) => (c.id === contactId ? updated : c))
      );
    } catch {
      // Fallback: update locally for demo
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId
            ? { ...c, outreach_status: newStatus, updated_at: new Date().toISOString() }
            : c
        )
      );
    }
  }

  function handleCopyDraft(draftText: string, key: string) {
    navigator.clipboard.writeText(draftText);
    setCopiedDraftKey(key);
    setTimeout(() => setCopiedDraftKey(null), 2000);
  }

  // ── Helpers ──────────────────────────────────────────────────

  function isAlreadyContact(alumId: string): boolean {
    return contacts.some((c) => c.alumni_id === alumId);
  }

  function getFirmName(firmId: string): string {
    const firm = firms.find((f) => f.id === firmId);
    return firm?.name || firmId;
  }

  const hasNudges = followUpNudges.length > 0 || thankYouNudges.length > 0;

  // ── Render ───────────────────────────────────────────────────

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
              href="/applications"
              className="text-sm text-ink-secondary hover:text-ink-primary transition-colors"
            >
              Applications
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
          <div>
            <h1 className="font-serif text-4xl tracking-tight">
              Networking radar
            </h1>
            <p className="text-base text-ink-secondary mt-1">
              Find alumni at your target firms. Draft outreach. Track every conversation.
            </p>
          </div>

          {/* ── Error banner ── */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start justify-between">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 text-sm ml-4 shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ── Nudges banner ── */}
          {hasNudges && (
            <Card className="border-amber-200 bg-amber-50/50">
              <div className="flex items-start gap-3">
                <BellRinging size={20} weight="regular" className="text-amber-600 mt-0.5 shrink-0" />
                <div className="space-y-2 flex-1">
                  <EyebrowLabel className="text-amber-700">Action needed</EyebrowLabel>
                  {followUpNudges.map((nudge) => (
                    <p key={nudge.contact_id} className="text-sm text-amber-800">
                      {nudge.message}
                    </p>
                  ))}
                  {thankYouNudges.map((nudge) => (
                    <p key={nudge.contact_id} className="text-sm text-amber-800">
                      {nudge.message}
                    </p>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* ── Firm selector ── */}
          <div>
            <EyebrowLabel>Select a firm</EyebrowLabel>
            <div className="mt-3 relative max-w-md">
              <select
                value={selectedFirmId}
                onChange={(e) => setSelectedFirmId(e.target.value)}
                disabled={firmsLoading}
                className="w-full bg-surface border border-surface-border rounded-md px-4 py-2.5 text-sm font-sans appearance-none focus:outline-none focus:border-accent cursor-pointer pr-10"
              >
                <option value="">
                  {firmsLoading ? "Loading firms..." : "Choose a firm to view alumni"}
                </option>
                {firms.map((firm) => (
                  <option key={firm.id} value={firm.id}>
                    {firm.name}
                  </option>
                ))}
              </select>
              <CaretDown
                size={16}
                weight="regular"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary pointer-events-none"
              />
            </div>
          </div>

          {/* ── Alumni grid ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <EyebrowLabel>
                {selectedFirm
                  ? `Alumni at ${selectedFirm.name}`
                  : "Alumni"}
              </EyebrowLabel>
              {alumni.length > 0 && (
                <span className="font-mono text-sm text-ink-secondary">
                  {alumni.length} found
                </span>
              )}
            </div>

            {/* Loading */}
            {alumniLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <AlumniSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Empty — no firm selected */}
            {!selectedFirmId && !alumniLoading && (
              <div className="bg-surface border border-surface-border rounded-lg p-12 text-center space-y-3">
                <MagnifyingGlass size={32} weight="regular" className="text-ink-tertiary mx-auto" />
                <p className="text-sm text-ink-secondary">
                  Select a firm above to see alumni connections.
                </p>
              </div>
            )}

            {/* Empty — firm selected but no alumni */}
            {selectedFirmId && !alumniLoading && alumni.length === 0 && (
              <div className="bg-surface border border-surface-border rounded-lg p-12 text-center space-y-3">
                <Users size={32} weight="regular" className="text-ink-tertiary mx-auto" />
                <p className="text-sm text-ink-secondary">
                  No alumni found at {selectedFirm?.name || "this firm"} yet.
                </p>
                <p className="text-xs text-ink-tertiary">
                  Alumni data is expanding. Check back soon.
                </p>
              </div>
            )}

            {/* Alumni cards */}
            {!alumniLoading && alumni.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {alumni.map((alum) => (
                  <div key={alum.id} className="space-y-3">
                    <div className="bg-surface border border-surface-border rounded-lg p-5 space-y-3">
                      {/* Name and role */}
                      <div>
                        <h3 className="font-sans text-sm font-semibold text-ink-primary">
                          {alum.name}
                        </h3>
                        <p className="text-sm text-ink-secondary mt-0.5">
                          {alum.current_role}
                          {alum.division && (
                            <span className="text-ink-tertiary"> / {alum.division}</span>
                          )}
                        </p>
                      </div>

                      {/* Details */}
                      <div className="flex items-center gap-4 text-xs text-ink-secondary">
                        <span className="inline-flex items-center gap-1">
                          <GraduationCap size={14} weight="regular" />
                          {alum.school} &apos;{String(alum.graduation_year).slice(-2)}
                        </span>
                        {alum.major && (
                          <span className="inline-flex items-center gap-1">
                            <Briefcase size={14} weight="regular" />
                            {alum.major}
                          </span>
                        )}
                      </div>

                      {/* Connection hooks */}
                      {alum.connection_hooks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {alum.connection_hooks.map((hook) => (
                            <span
                              key={hook}
                              className="bg-surface-hover text-ink-secondary text-xs px-2 py-0.5 rounded border border-surface-border"
                            >
                              {hook}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        {isAlreadyContact(alum.id) ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 font-mono">
                            <Check size={14} weight="regular" />
                            In contacts
                          </span>
                        ) : (
                          <SecondaryButton
                            onClick={() => handleAddContact(alum)}
                            disabled={addingContact[alum.id]}
                            className="text-xs px-3 py-1.5"
                          >
                            <UserPlus size={14} weight="regular" />
                            {addingContact[alum.id] ? "Adding..." : "Add to contacts"}
                          </SecondaryButton>
                        )}
                        <PrimaryButton
                          onClick={() => handleDraftOutreach(alum)}
                          disabled={draftLoading[alum.id]}
                          className="text-xs px-3 py-1.5"
                        >
                          <PaperPlaneTilt size={14} weight="regular" />
                          {draftLoading[alum.id] ? "Drafting..." : "Draft outreach"}
                        </PrimaryButton>
                      </div>
                    </div>

                    {/* Outreach drafts — shown below the alumni card */}
                    {drafts[alum.id] && (
                      <Card className="border-accent/20">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <EyebrowLabel>
                              Draft outreach to {drafts[alum.id].contact_name}
                            </EyebrowLabel>
                            {drafts[alum.id].connection_hooks_used.length > 0 && (
                              <span className="text-[10px] font-mono text-ink-tertiary">
                                Hooks: {drafts[alum.id].connection_hooks_used.join(", ")}
                              </span>
                            )}
                          </div>
                          {drafts[alum.id].drafts.map((draft, idx) => {
                            const draftKey = `${alum.id}-${idx}`;
                            return (
                              <div
                                key={idx}
                                className="bg-surface-hover border border-surface-border rounded-md p-4 relative group"
                              >
                                <p className="text-sm text-ink-primary whitespace-pre-wrap leading-relaxed">
                                  {draft}
                                </p>
                                <button
                                  onClick={() => handleCopyDraft(draft, draftKey)}
                                  className="absolute top-2 right-2 p-1.5 rounded-md bg-surface border border-surface-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-hover"
                                  title="Copy to clipboard"
                                >
                                  {copiedDraftKey === draftKey ? (
                                    <Check size={14} weight="regular" className="text-green-600" />
                                  ) : (
                                    <Copy size={14} weight="regular" className="text-ink-secondary" />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Your contacts ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <EyebrowLabel>Your contacts</EyebrowLabel>
              {contacts.length > 0 && (
                <span className="font-mono text-sm text-ink-secondary">
                  {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Loading */}
            {contactsLoading && <ContactsSkeleton />}

            {/* Empty */}
            {!contactsLoading && contacts.length === 0 && (
              <div className="bg-surface border border-surface-border rounded-lg p-12 text-center space-y-3">
                <Users size={32} weight="regular" className="text-ink-tertiary mx-auto" />
                <p className="text-sm text-ink-secondary">
                  No contacts yet. Select a firm and add alumni to start tracking your outreach.
                </p>
              </div>
            )}

            {/* Contacts table */}
            {!contactsLoading && contacts.length > 0 && (
              <div className="space-y-1.5">
                {/* Table header */}
                <div className="grid grid-cols-12 gap-3 px-5 py-2 text-xs font-mono uppercase tracking-wider text-ink-tertiary">
                  <div className="col-span-3">Name</div>
                  <div className="col-span-2">Firm</div>
                  <div className="col-span-2">Role</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-3">Next action</div>
                </div>

                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="bg-surface border border-surface-border rounded-lg grid grid-cols-12 gap-3 px-5 py-3 items-center text-sm hover:bg-surface-hover transition-colors"
                  >
                    {/* Name */}
                    <div className="col-span-3">
                      <p className="font-sans font-medium text-ink-primary truncate">
                        {contact.contact_name}
                      </p>
                      {contact.contact_division && (
                        <p className="text-xs text-ink-tertiary truncate">
                          {contact.contact_division}
                        </p>
                      )}
                    </div>

                    {/* Firm */}
                    <div className="col-span-2 font-mono text-xs text-ink-secondary truncate">
                      {getFirmName(contact.firm_id)}
                    </div>

                    {/* Role */}
                    <div className="col-span-2 text-xs text-ink-secondary truncate">
                      {contact.contact_role || "--"}
                    </div>

                    {/* Status dropdown */}
                    <div className="col-span-2">
                      <select
                        value={contact.outreach_status}
                        onChange={(e) =>
                          handleStatusChange(
                            contact.id,
                            e.target.value as OutreachStatus
                          )
                        }
                        className={`text-xs font-medium px-2 py-1 rounded-md border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent ${STATUS_STYLES[contact.outreach_status]}`}
                      >
                        {ALL_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Next action */}
                    <div className="col-span-3 text-xs text-ink-secondary truncate">
                      {contact.next_action ? (
                        <span>
                          {contact.next_action}
                          {contact.next_action_date && (
                            <span className="font-mono text-ink-tertiary ml-1">
                              ({new Date(contact.next_action_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-ink-tertiary">--</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

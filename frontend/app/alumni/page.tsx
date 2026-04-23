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
  CaretUp,
  Plus,
  GraduationCap,
  Briefcase,
  MagnifyingGlass,
  Envelope,
  LinkedinLogo,
  UploadSimple,
  X,
  FileText,
} from "@phosphor-icons/react";
import { Wordmark } from "../../components/Wordmark";
import {
  getAllFirms,
  getAlumni,
  searchAlumni,
  importAlumniCSV,
  createAlumnus,
  getNetworkingContacts,
  createNetworkingContact,
  updateNetworkingContact,
  draftOutreach,
  getNetworkingNudges,
} from "../../lib/api";
import { AuthGuard } from "../../components/AuthGuard";
import { Card } from "../../components/Card";
import { EyebrowLabel } from "../../components/EyebrowLabel";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SecondaryButton } from "../../components/SecondaryButton";
import type {
  Firm,
  Alumnus,
  AlumniImportResult,
  NetworkingContact,
  NetworkingContactCreate,
  OutreachDraftResponse,
  OutreachStatus,
  ConnectionType,
  NetworkingNudge,
} from "../../lib/types";

// ── Connection type labels ───────────────────────────────────

const CONNECTION_TYPE_OPTIONS: { value: ConnectionType; label: string }[] = [
  { value: "alumni", label: "Alumni" },
  { value: "referral", label: "Referral" },
  { value: "cold_outreach", label: "Cold outreach" },
  { value: "other", label: "Other" },
];

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

// ── Interaction timeline ──────────────────────────────────────

function InteractionTimeline({ contact }: { contact: NetworkingContact }) {
  const currentIndex = ALL_STATUSES.indexOf(contact.outreach_status);

  function getDateForStatus(status: OutreachStatus): string | null {
    switch (status) {
      case "not_contacted":
        return contact.created_at;
      case "message_sent":
        return contact.outreach_date;
      case "followed_up":
        return contact.follow_up_date ?? null;
      case "responded":
        return null;
      case "call_scheduled":
        return contact.call_date;
      case "call_completed":
        return contact.call_date;
      case "thank_you_sent":
        return contact.thank_you_sent_at;
      default:
        return null;
    }
  }

  return (
    <div className="pl-8 pr-5 pb-4 pt-1">
      <div className="relative">
        {ALL_STATUSES.map((status, idx) => {
          const isCompleted = idx <= currentIndex;
          const isPending = idx === currentIndex + 1;
          const isFuture = idx > currentIndex + 1;
          const date = getDateForStatus(status);
          const isLast = idx === ALL_STATUSES.length - 1;

          if (isFuture && !isPending) return null;

          return (
            <div key={status} className="relative flex items-start gap-3 pb-4 last:pb-0">
              {/* Vertical connecting line */}
              {!isLast && (idx <= currentIndex || isPending) && (
                <div
                  className="absolute left-[7px] top-[18px] w-[2px] h-[calc(100%-6px)]"
                  style={{
                    backgroundColor: isCompleted && idx < currentIndex ? "#0B2545" : "#E5E5E5",
                  }}
                />
              )}
              {/* Dot */}
              <div className="relative z-10 mt-0.5 shrink-0">
                {isCompleted ? (
                  <div
                    className="w-4 h-4 rounded-full border-2"
                    style={{ backgroundColor: "#0B2545", borderColor: "#0B2545" }}
                  />
                ) : (
                  <div
                    className="w-4 h-4 rounded-full border-2 bg-white"
                    style={{ borderColor: "#D4D4D4" }}
                  />
                )}
              </div>
              {/* Label and date */}
              <div className="flex items-baseline gap-2 min-w-0">
                <span
                  className={`font-mono text-xs ${
                    isCompleted ? "text-ink-primary font-medium" : "text-ink-tertiary"
                  }`}
                >
                  {STATUS_LABELS[status]}
                </span>
                {date && isCompleted && (
                  <span className="font-mono text-[11px] text-ink-tertiary">
                    {new Date(date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
                {isPending && (
                  <span className="font-mono text-[11px] text-ink-tertiary italic">
                    pending
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
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

  // Expanded contact rows (for interaction timeline)
  const [expandedContactIds, setExpandedContactIds] = useState<Set<string>>(new Set());

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSchool, setSearchSchool] = useState("");
  const [searchYear, setSearchYear] = useState("");
  const [searchResults, setSearchResults] = useState<Alumnus[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // CSV import
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<AlumniImportResult | null>(null);

  // Add alumni form
  const [showAddAlumniForm, setShowAddAlumniForm] = useState(false);
  const [addAlumniSubmitting, setAddAlumniSubmitting] = useState(false);
  const [addAlumniForm, setAddAlumniForm] = useState({
    name: "",
    school: "Bryant University",
    graduation_year: "",
    current_role: "",
    current_company: "",
    email: "",
    linkedin_url: "",
    city: "",
    firm_id: "",
  });

  // Manual contact form
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualFormSubmitting, setManualFormSubmitting] = useState(false);
  const [manualForm, setManualForm] = useState({
    contact_name: "",
    firm_id: "",
    contact_role: "",
    contact_division: "",
    connection_type: "alumni" as ConnectionType,
  });

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
    } catch {
      setFirms([]);
      setContacts([]);
      setFollowUpNudges([]);
      setThankYouNudges([]);
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
      setAlumni([]);
      setSelectedFirm(null);
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
      setError("Failed to add contact. Please try again.");
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
      setError("Failed to generate outreach draft. Please try again.");
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
      setError("Failed to update contact status. Please try again.");
    }
  }

  function handleCopyDraft(draftText: string, key: string) {
    navigator.clipboard.writeText(draftText);
    setCopiedDraftKey(key);
    setTimeout(() => setCopiedDraftKey(null), 2000);
  }

  function toggleContactExpanded(contactId: string) {
    setExpandedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  }

  async function handleManualContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualForm.contact_name.trim() || !manualForm.firm_id) return;

    setManualFormSubmitting(true);
    try {
      const body: NetworkingContactCreate = {
        contact_name: manualForm.contact_name.trim(),
        firm_id: manualForm.firm_id,
        connection_type: manualForm.connection_type,
      };
      if (manualForm.contact_role.trim()) {
        body.contact_role = manualForm.contact_role.trim();
      }
      if (manualForm.contact_division.trim()) {
        body.contact_division = manualForm.contact_division.trim();
      }
      const newContact = await createNetworkingContact(body);
      setContacts((prev) => [newContact, ...prev]);
      setShowManualForm(false);
      setManualForm({
        contact_name: "",
        firm_id: "",
        contact_role: "",
        contact_division: "",
        connection_type: "alumni",
      });
    } catch {
      setError("Failed to add contact. Please try again.");
    } finally {
      setManualFormSubmitting(false);
    }
  }

  // ── Search handler (debounced) ─────────────────────────────

  useEffect(() => {
    const hasFilters = searchQuery.trim() || searchSchool.trim() || searchYear.trim();
    if (!hasFilters) {
      setIsSearchMode(false);
      setSearchResults([]);
      setSearchTotal(0);
      return;
    }

    setIsSearchMode(true);
    setSearchLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const params: Record<string, string | number> = { limit: 50, offset: 0 };
        // Use searchQuery as name filter, and also try company
        if (searchQuery.trim()) {
          params.name = searchQuery.trim();
          params.company = searchQuery.trim();
        }
        if (searchSchool.trim()) params.school = searchSchool.trim();
        if (searchYear.trim()) params.graduation_year = parseInt(searchYear, 10);

        // Search by name first, then company as fallback
        const nameResult = await searchAlumni({
          name: searchQuery.trim() || undefined,
          school: searchSchool.trim() || undefined,
          graduation_year: searchYear ? parseInt(searchYear, 10) : undefined,
          limit: 50,
        });

        let combined = nameResult.alumni;
        let total = nameResult.total;

        // Also search by company if query provided
        if (searchQuery.trim()) {
          const companyResult = await searchAlumni({
            company: searchQuery.trim(),
            school: searchSchool.trim() || undefined,
            graduation_year: searchYear ? parseInt(searchYear, 10) : undefined,
            limit: 50,
          });
          // Merge results, deduplicate by id
          const seenIds = new Set(combined.map((a) => a.id));
          for (const alum of companyResult.alumni) {
            if (!seenIds.has(alum.id)) {
              combined.push(alum);
              seenIds.add(alum.id);
            }
          }
          total = combined.length;
        }

        setSearchResults(combined);
        setSearchTotal(total);
      } catch {
        setSearchResults([]);
        setSearchTotal(0);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, searchSchool, searchYear]);

  // ── CSV import handler ─────────────────────────────────────

  async function handleCSVImport() {
    if (!importFile) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const result = await importAlumniCSV(importFile);
      setImportResult(result);
      // Refresh alumni if we're in a firm view
      if (selectedFirmId) {
        loadAlumni(selectedFirmId);
      }
    } catch {
      setError("Failed to import CSV. Check the file format and try again.");
    } finally {
      setImportLoading(false);
    }
  }

  // ── Add alumni handler ─────────────────────────────────────

  async function handleAddAlumniSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addAlumniForm.name.trim() || !addAlumniForm.graduation_year) return;

    setAddAlumniSubmitting(true);
    try {
      await createAlumnus({
        name: addAlumniForm.name.trim(),
        school: addAlumniForm.school.trim() || "Bryant University",
        graduation_year: parseInt(addAlumniForm.graduation_year, 10),
        current_role: addAlumniForm.current_role.trim() || "",
        current_company: addAlumniForm.current_company.trim() || undefined,
        email: addAlumniForm.email.trim() || undefined,
        linkedin_url: addAlumniForm.linkedin_url.trim() || undefined,
        city: addAlumniForm.city.trim() || undefined,
        firm_id: addAlumniForm.firm_id || undefined,
      });
      setShowAddAlumniForm(false);
      setAddAlumniForm({
        name: "",
        school: "Bryant University",
        graduation_year: "",
        current_role: "",
        current_company: "",
        email: "",
        linkedin_url: "",
        city: "",
        firm_id: "",
      });
      // Refresh alumni if viewing a firm
      if (selectedFirmId) {
        loadAlumni(selectedFirmId);
      }
    } catch {
      setError("Failed to add alumnus. Please try again.");
    } finally {
      setAddAlumniSubmitting(false);
    }
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
    <AuthGuard>
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur border-b border-surface-border bryant-stripe">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label="InternshipMatch home">
            <Wordmark />
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

          {/* ── Search bar + filters ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search input */}
              <div className="relative flex-1 min-w-[240px]">
                <MagnifyingGlass
                  size={16}
                  weight="regular"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or company..."
                  className="w-full bg-surface border border-surface-border rounded-md pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                />
              </div>

              {/* School filter */}
              <input
                type="text"
                value={searchSchool}
                onChange={(e) => setSearchSchool(e.target.value)}
                placeholder="School"
                className="bg-surface border border-surface-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-accent w-40"
              />

              {/* Year filter */}
              <input
                type="number"
                value={searchYear}
                onChange={(e) => setSearchYear(e.target.value)}
                placeholder="Grad year"
                className="bg-surface border border-surface-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-accent w-28"
              />

              {/* Action buttons */}
              <SecondaryButton
                onClick={() => setShowImportModal(true)}
                className="text-xs px-3 py-2"
              >
                <UploadSimple size={14} weight="regular" />
                Import CSV
              </SecondaryButton>
              <SecondaryButton
                onClick={() => setShowAddAlumniForm((prev) => !prev)}
                className="text-xs px-3 py-2"
              >
                <Plus size={14} weight="regular" />
                Add alumni
              </SecondaryButton>
            </div>

            {/* Firm dropdown (secondary filter) */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-ink-tertiary uppercase tracking-wider">Or browse by firm</span>
              <div className="relative max-w-xs">
                <select
                  value={selectedFirmId}
                  onChange={(e) => {
                    setSelectedFirmId(e.target.value);
                    // Clear search when switching to firm browse
                    if (e.target.value) {
                      setSearchQuery("");
                      setSearchSchool("");
                      setSearchYear("");
                    }
                  }}
                  disabled={firmsLoading}
                  className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm font-sans appearance-none focus:outline-none focus:border-accent cursor-pointer pr-8"
                >
                  <option value="">
                    {firmsLoading ? "Loading firms..." : "All firms"}
                  </option>
                  {firms.map((firm) => (
                    <option key={firm.id} value={firm.id}>
                      {firm.name}
                    </option>
                  ))}
                </select>
                <CaretDown
                  size={14}
                  weight="regular"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-secondary pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* ── CSV Import Modal ── */}
          {showImportModal && (
            <Card>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <EyebrowLabel>Import alumni from CSV</EyebrowLabel>
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportFile(null);
                      setImportResult(null);
                    }}
                    className="text-ink-tertiary hover:text-ink-primary"
                  >
                    <X size={16} weight="regular" />
                  </button>
                </div>

                <div className="bg-surface-hover border border-dashed border-surface-border rounded-lg p-6 text-center space-y-3">
                  <FileText size={28} weight="regular" className="text-ink-tertiary mx-auto" />
                  <p className="text-sm text-ink-secondary">
                    Upload a CSV with columns: name, school, graduation_year, current_role, current_company, division, major, email, linkedin_url, city, connection_hooks
                  </p>
                  <p className="text-xs text-ink-tertiary">
                    connection_hooks should be semicolon-separated (e.g. &quot;Finance Society;Same major&quot;)
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="text-sm text-ink-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-surface-border file:text-xs file:bg-surface file:text-ink-primary file:cursor-pointer hover:file:bg-surface-hover"
                  />
                </div>

                {importResult && (
                  <div className={`rounded-md p-3 text-sm ${importResult.errors.length > 0 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
                    <p className="font-medium">
                      {importResult.imported} imported, {importResult.skipped} skipped
                    </p>
                    {importResult.errors.length > 0 && (
                      <ul className="mt-1 text-xs text-amber-700 space-y-0.5">
                        {importResult.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>...and {importResult.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <PrimaryButton
                    onClick={handleCSVImport}
                    disabled={!importFile || importLoading}
                    className="text-xs px-4 py-2"
                  >
                    <UploadSimple size={14} weight="regular" />
                    {importLoading ? "Importing..." : "Upload and import"}
                  </PrimaryButton>
                  <a
                    href="/api/alumni/template"
                    download="alumni_template.csv"
                    className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline px-2 py-2"
                  >
                    <FileText size={14} weight="regular" />
                    Download template
                  </a>
                </div>
              </div>
            </Card>
          )}

          {/* ── Add alumni form ── */}
          {showAddAlumniForm && (
            <Card>
              <form onSubmit={handleAddAlumniSubmit} className="space-y-4">
                <EyebrowLabel>Add alumnus</EyebrowLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-ink-secondary mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={addAlumniForm.name}
                      onChange={(e) => setAddAlumniForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="John Doe"
                      className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-ink-secondary mb-1">School</label>
                    <input
                      type="text"
                      value={addAlumniForm.school}
                      onChange={(e) => setAddAlumniForm((prev) => ({ ...prev, school: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-ink-secondary mb-1">Grad year *</label>
                    <input
                      type="number"
                      required
                      value={addAlumniForm.graduation_year}
                      onChange={(e) => setAddAlumniForm((prev) => ({ ...prev, graduation_year: e.target.value }))}
                      placeholder="2024"
                      className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-ink-secondary mb-1">Role</label>
                    <input
                      type="text"
                      value={addAlumniForm.current_role}
                      onChange={(e) => setAddAlumniForm((prev) => ({ ...prev, current_role: e.target.value }))}
                      placeholder="Analyst"
                      className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-ink-secondary mb-1">Company</label>
                    <input
                      type="text"
                      value={addAlumniForm.current_company}
                      onChange={(e) => setAddAlumniForm((prev) => ({ ...prev, current_company: e.target.value }))}
                      placeholder="Goldman Sachs"
                      className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-ink-secondary mb-1">Firm</label>
                    <div className="relative">
                      <select
                        value={addAlumniForm.firm_id}
                        onChange={(e) => setAddAlumniForm((prev) => ({ ...prev, firm_id: e.target.value }))}
                        className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm appearance-none focus:outline-none focus:border-accent pr-8"
                      >
                        <option value="">Optional</option>
                        {firms.map((firm) => (
                          <option key={firm.id} value={firm.id}>{firm.name}</option>
                        ))}
                      </select>
                      <CaretDown size={14} weight="regular" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-secondary pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-ink-secondary mb-1">Email</label>
                    <input
                      type="email"
                      value={addAlumniForm.email}
                      onChange={(e) => setAddAlumniForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="john@example.com"
                      className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-ink-secondary mb-1">LinkedIn URL</label>
                    <input
                      type="url"
                      value={addAlumniForm.linkedin_url}
                      onChange={(e) => setAddAlumniForm((prev) => ({ ...prev, linkedin_url: e.target.value }))}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-ink-secondary mb-1">City</label>
                    <input
                      type="text"
                      value={addAlumniForm.city}
                      onChange={(e) => setAddAlumniForm((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="New York"
                      className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <PrimaryButton
                    type="submit"
                    disabled={addAlumniSubmitting || !addAlumniForm.name.trim() || !addAlumniForm.graduation_year}
                    className="text-xs px-4 py-2"
                  >
                    {addAlumniSubmitting ? "Adding..." : "Add alumnus"}
                  </PrimaryButton>
                  <SecondaryButton
                    type="button"
                    onClick={() => setShowAddAlumniForm(false)}
                    className="text-xs px-4 py-2"
                  >
                    Cancel
                  </SecondaryButton>
                </div>
              </form>
            </Card>
          )}

          {/* ── Alumni grid ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <EyebrowLabel>
                {isSearchMode
                  ? "Search results"
                  : selectedFirm
                    ? `Alumni at ${selectedFirm.name}`
                    : "Alumni"}
              </EyebrowLabel>
              {(isSearchMode ? searchResults.length : alumni.length) > 0 && (
                <span className="font-mono text-sm text-ink-secondary">
                  {isSearchMode ? searchTotal : alumni.length} found
                </span>
              )}
            </div>

            {/* Loading */}
            {(alumniLoading || searchLoading) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <AlumniSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Empty — no search and no firm selected */}
            {!isSearchMode && !selectedFirmId && !alumniLoading && (
              <div className="bg-surface border border-surface-border rounded-lg p-12 text-center space-y-3">
                <MagnifyingGlass size={32} weight="regular" className="text-ink-tertiary mx-auto" />
                <p className="text-sm text-ink-secondary">
                  Search by name, company, or school above -- or select a firm to browse.
                </p>
              </div>
            )}

            {/* Empty — search active but no results */}
            {isSearchMode && !searchLoading && searchResults.length === 0 && (
              <div className="bg-surface border border-surface-border rounded-lg p-12 text-center space-y-3">
                <Users size={32} weight="regular" className="text-ink-tertiary mx-auto" />
                <p className="text-sm text-ink-secondary">
                  No alumni match your search. Try adjusting your filters or import new alumni.
                </p>
              </div>
            )}

            {/* Empty — firm selected but no alumni */}
            {!isSearchMode && selectedFirmId && !alumniLoading && alumni.length === 0 && (
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
            {(() => {
              const displayAlumni = isSearchMode ? searchResults : alumni;
              const isLoading = isSearchMode ? searchLoading : alumniLoading;
              if (isLoading || displayAlumni.length === 0) return null;

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayAlumni.map((alum) => (
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
                          {alum.current_company && (
                            <p className="text-xs text-ink-tertiary mt-0.5">
                              {alum.current_company}
                              {alum.city && <span> -- {alum.city}</span>}
                            </p>
                          )}
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

                        {/* Deep link actions (email + LinkedIn) */}
                        {(alum.email || alum.linkedin_url) && (
                          <div className="flex gap-2">
                            {alum.email && (
                              <a
                                href={`mailto:${alum.email}`}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-accent bg-accent/5 border border-accent/20 rounded-md px-3 py-1.5 hover:bg-accent/10 transition-colors"
                              >
                                <Envelope size={14} weight="regular" />
                                Email
                              </a>
                            )}
                            {alum.linkedin_url && (
                              <a
                                href={alum.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0A66C2] bg-[#0A66C2]/5 border border-[#0A66C2]/20 rounded-md px-3 py-1.5 hover:bg-[#0A66C2]/10 transition-colors"
                              >
                                <LinkedinLogo size={14} weight="regular" />
                                LinkedIn
                              </a>
                            )}
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
              );
            })()}
          </div>

          {/* ── Your contacts ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <EyebrowLabel>Your contacts</EyebrowLabel>
              <div className="flex items-center gap-3">
                {contacts.length > 0 && (
                  <span className="font-mono text-sm text-ink-secondary">
                    {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
                  </span>
                )}
                <SecondaryButton
                  onClick={() => setShowManualForm((prev) => !prev)}
                  className="text-xs px-3 py-1.5"
                >
                  <Plus size={14} weight="regular" />
                  Add contact manually
                </SecondaryButton>
              </div>
            </div>

            {/* Manual contact form */}
            {showManualForm && (
              <Card className="mb-4">
                <form onSubmit={handleManualContactSubmit} className="space-y-4">
                  <EyebrowLabel>New contact</EyebrowLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Contact name */}
                    <div>
                      <label className="block text-xs font-mono text-ink-secondary mb-1">
                        Contact name *
                      </label>
                      <input
                        type="text"
                        required
                        value={manualForm.contact_name}
                        onChange={(e) =>
                          setManualForm((prev) => ({ ...prev, contact_name: e.target.value }))
                        }
                        placeholder="Jane Smith"
                        className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                      />
                    </div>
                    {/* Firm */}
                    <div>
                      <label className="block text-xs font-mono text-ink-secondary mb-1">
                        Firm *
                      </label>
                      <div className="relative">
                        <select
                          required
                          value={manualForm.firm_id}
                          onChange={(e) =>
                            setManualForm((prev) => ({ ...prev, firm_id: e.target.value }))
                          }
                          className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm appearance-none focus:outline-none focus:border-accent pr-8"
                        >
                          <option value="">Select a firm</option>
                          {firms.map((firm) => (
                            <option key={firm.id} value={firm.id}>
                              {firm.name}
                            </option>
                          ))}
                        </select>
                        <CaretDown
                          size={14}
                          weight="regular"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-secondary pointer-events-none"
                        />
                      </div>
                    </div>
                    {/* Role */}
                    <div>
                      <label className="block text-xs font-mono text-ink-secondary mb-1">
                        Role
                      </label>
                      <input
                        type="text"
                        value={manualForm.contact_role}
                        onChange={(e) =>
                          setManualForm((prev) => ({ ...prev, contact_role: e.target.value }))
                        }
                        placeholder="Analyst"
                        className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                      />
                    </div>
                    {/* Division */}
                    <div>
                      <label className="block text-xs font-mono text-ink-secondary mb-1">
                        Division
                      </label>
                      <input
                        type="text"
                        value={manualForm.contact_division}
                        onChange={(e) =>
                          setManualForm((prev) => ({ ...prev, contact_division: e.target.value }))
                        }
                        placeholder="M&A"
                        className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                      />
                    </div>
                    {/* Connection type */}
                    <div>
                      <label className="block text-xs font-mono text-ink-secondary mb-1">
                        Connection type
                      </label>
                      <div className="relative">
                        <select
                          value={manualForm.connection_type}
                          onChange={(e) =>
                            setManualForm((prev) => ({
                              ...prev,
                              connection_type: e.target.value as ConnectionType,
                            }))
                          }
                          className="w-full bg-surface border border-surface-border rounded-md px-3 py-2 text-sm appearance-none focus:outline-none focus:border-accent pr-8"
                        >
                          {CONNECTION_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <CaretDown
                          size={14}
                          weight="regular"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-secondary pointer-events-none"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <PrimaryButton
                      type="submit"
                      disabled={manualFormSubmitting || !manualForm.contact_name.trim() || !manualForm.firm_id}
                      className="text-xs px-4 py-2"
                    >
                      {manualFormSubmitting ? "Adding..." : "Add contact"}
                    </PrimaryButton>
                    <SecondaryButton
                      type="button"
                      onClick={() => setShowManualForm(false)}
                      className="text-xs px-4 py-2"
                    >
                      Cancel
                    </SecondaryButton>
                  </div>
                </form>
              </Card>
            )}

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

                {contacts.map((contact) => {
                  const isExpanded = expandedContactIds.has(contact.id);
                  return (
                    <div
                      key={contact.id}
                      className="bg-surface border border-surface-border rounded-lg overflow-hidden"
                    >
                      <div
                        onClick={() => toggleContactExpanded(contact.id)}
                        className="grid grid-cols-12 gap-3 px-5 py-3 items-center text-sm hover:bg-surface-hover transition-colors cursor-pointer select-none"
                      >
                        {/* Name */}
                        <div className="col-span-3 flex items-center gap-2">
                          {isExpanded ? (
                            <CaretUp size={14} weight="regular" className="text-ink-tertiary shrink-0" />
                          ) : (
                            <CaretDown size={14} weight="regular" className="text-ink-tertiary shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-sans font-medium text-ink-primary truncate">
                              {contact.contact_name}
                            </p>
                            {contact.contact_division && (
                              <p className="text-xs text-ink-tertiary truncate">
                                {contact.contact_division}
                              </p>
                            )}
                          </div>
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
                        <div className="col-span-2" onClick={(e) => e.stopPropagation()}>
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

                      {/* Expanded interaction timeline */}
                      {isExpanded && (
                        <div className="border-t border-surface-border bg-[#FAFAFA]">
                          <InteractionTimeline contact={contact} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}

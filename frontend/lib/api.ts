import type {
  StudentProfile,
  OpportunityResponse,
  Firm,
  Posting,
  Application,
  ApplicationCreate,
  ApplicationUpdate,
  ApplicationStats,
  Alumnus,
  NetworkingContact,
  NetworkingContactCreate,
  OutreachDraftResponse,
  NetworkingNudge,
  PrepSession,
  PrepQuestion,
  PrepAnswer,
  ReadinessScore,
  PrepSessionStart,
  TimelineEvent,
  TimelineEventCreate,
  WeeklySummary,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `API error: ${res.status}`);
  }

  return res.json();
}

export async function uploadResume(
  file: File
): Promise<{ parsed_profile: StudentProfile; message: string }> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/api/resume/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Upload failed: ${res.status}`);
  }

  return res.json();
}

export async function saveProfile(
  profile: StudentProfile
): Promise<{ profile: StudentProfile; message: string }> {
  return apiFetch("/api/resume/save", {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

export async function getProfile(): Promise<StudentProfile | null> {
  try {
    const data = await apiFetch<{ profile: StudentProfile }>("/api/resume");
    return data.profile;
  } catch {
    return null;
  }
}

export async function getOpportunities(params?: {
  limit?: number;
  min_score?: number;
}): Promise<OpportunityResponse[]> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.min_score) searchParams.set("min_score", String(params.min_score));

  const query = searchParams.toString();
  const path = `/api/opportunities${query ? `?${query}` : ""}`;

  const data = await apiFetch<{ opportunities: OpportunityResponse[] }>(path);
  return data.opportunities;
}

export async function getFirm(
  id: string
): Promise<{ firm: Firm; postings: Posting[] }> {
  return apiFetch(`/api/firms/${id}`);
}

export async function getPosting(
  id: string
): Promise<{ posting: Posting; firm: Firm }> {
  return apiFetch(`/api/postings/${id}`);
}

// ============================================================
// Applications
// ============================================================

export async function getApplications(): Promise<Application[]> {
  const data = await apiFetch<{ applications: Application[] }>("/api/applications");
  return data.applications;
}

export async function createApplication(body: ApplicationCreate): Promise<Application> {
  const data = await apiFetch<{ application: Application }>("/api/applications", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.application;
}

export async function updateApplication(
  id: string,
  body: ApplicationUpdate
): Promise<Application> {
  const data = await apiFetch<{ application: Application }>(`/api/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return data.application;
}

export async function getApplicationStats(): Promise<ApplicationStats> {
  return apiFetch("/api/applications/stats");
}

// ============================================================
// Alumni & Networking
// ============================================================

export async function getAlumni(
  firmId: string
): Promise<{ alumni: Alumnus[]; firm: Firm; count: number }> {
  return apiFetch(`/api/alumni/${firmId}`);
}

export async function getNetworkingContacts(): Promise<NetworkingContact[]> {
  const data = await apiFetch<{ contacts: NetworkingContact[] }>("/api/networking/contacts");
  return data.contacts;
}

export async function createNetworkingContact(
  body: NetworkingContactCreate
): Promise<NetworkingContact> {
  const data = await apiFetch<{ contact: NetworkingContact }>("/api/networking/contacts", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.contact;
}

export async function updateNetworkingContact(
  id: string,
  body: Partial<NetworkingContact>
): Promise<NetworkingContact> {
  const data = await apiFetch<{ contact: NetworkingContact }>(`/api/networking/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return data.contact;
}

export async function draftOutreach(
  contactId: string,
  tone: "professional" | "casual" | "warm" = "professional"
): Promise<OutreachDraftResponse> {
  return apiFetch("/api/networking/draft-outreach", {
    method: "POST",
    body: JSON.stringify({ contact_id: contactId, tone }),
  });
}

export async function getNetworkingNudges(): Promise<{
  follow_up_nudges: NetworkingNudge[];
  thank_you_nudges: NetworkingNudge[];
}> {
  return apiFetch("/api/networking/nudges");
}

// ============================================================
// Interview Prep
// ============================================================

export async function startPrepSession(
  body: PrepSessionStart
): Promise<{ session: PrepSession; questions: PrepQuestion[] }> {
  return apiFetch("/api/prep/start", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function submitPrepAnswer(body: {
  session_id: string;
  question_text: string;
  question_category: string;
  question_difficulty: string;
  user_answer: string;
}): Promise<{ answer: PrepAnswer }> {
  return apiFetch("/api/prep/answer", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getPrepReadiness(): Promise<{ scores: ReadinessScore[]; overall: number }> {
  return apiFetch("/api/prep/readiness");
}

export async function getPrepHistory(): Promise<{ sessions: PrepSession[] }> {
  return apiFetch("/api/prep/history");
}

export async function getWhyFirm(
  firmId: string
): Promise<{ talking_points: string[]; firm_name: string }> {
  return apiFetch("/api/prep/why-firm", {
    method: "POST",
    body: JSON.stringify({ firm_id: firmId }),
  });
}

// ============================================================
// Timeline
// ============================================================

export async function getTimelineEvents(): Promise<TimelineEvent[]> {
  const data = await apiFetch<{ events: TimelineEvent[] }>("/api/timeline/events");
  return data.events;
}

export async function createTimelineEvent(body: TimelineEventCreate): Promise<TimelineEvent> {
  const data = await apiFetch<{ event: TimelineEvent }>("/api/timeline/events", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.event;
}

export async function updateTimelineEvent(
  id: string,
  body: Partial<TimelineEvent>
): Promise<TimelineEvent> {
  const data = await apiFetch<{ event: TimelineEvent }>(`/api/timeline/events/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return data.event;
}

export async function deleteTimelineEvent(id: string): Promise<void> {
  await apiFetch(`/api/timeline/events/${id}`, { method: "DELETE" });
}

export async function getWeeklySummary(): Promise<WeeklySummary> {
  return apiFetch("/api/timeline/weekly");
}

export async function getAllFirms(): Promise<Firm[]> {
  const data = await apiFetch<{ firms: Firm[] }>("/api/firms");
  return data.firms;
}

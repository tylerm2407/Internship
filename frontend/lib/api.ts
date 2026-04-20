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
  AlumniSearchParams,
  AlumniImportResult,
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
  Notification,
} from "./types";
import { getSupabaseBrowserClient } from "./supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {
    // No session available — continue without auth header
  }
  return {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const authHeaders = await getAuthHeaders();
    const isFormData = init?.body instanceof FormData;
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        // Skip Content-Type for FormData — browser sets multipart boundary automatically
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...authHeaders,
        ...init?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(body.detail || `API error: ${res.status}`);
    }

    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function uploadResume(
  file: File
): Promise<{ parsed_profile: StudentProfile; message: string }> {
  const form = new FormData();
  form.append("file", file);

  const authHeaders = await getAuthHeaders();
  if (!authHeaders.Authorization) {
    throw new Error("Please sign in before uploading your resume.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60s for resume parsing

  try {
    const res = await fetch(`${API_BASE}/api/resume/upload`, {
      method: "POST",
      body: form,
      signal: controller.signal,
      headers: {
        ...authHeaders,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(body.detail || `Upload failed: ${res.status}`);
    }

    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function saveProfile(
  profile: StudentProfile
): Promise<{ profile: StudentProfile; message: string }> {
  return apiFetch("/api/resume/confirm", {
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

export async function searchAlumni(
  params: AlumniSearchParams
): Promise<{ alumni: Alumnus[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.school) qs.set("school", params.school);
  if (params.company) qs.set("company", params.company);
  if (params.name) qs.set("name", params.name);
  if (params.graduation_year) qs.set("graduation_year", String(params.graduation_year));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  return apiFetch(`/api/alumni/search?${qs.toString()}`);
}

export async function importAlumniCSV(file: File): Promise<AlumniImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch("/api/alumni/import-csv", {
    method: "POST",
    body: formData,
  });
}

export async function createAlumnus(
  data: Partial<Alumnus> & { name: string; graduation_year: number }
): Promise<{ alumnus: Alumnus }> {
  return apiFetch("/api/alumni", {
    method: "POST",
    body: JSON.stringify(data),
  });
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

export async function getSessionAnswers(
  sessionId: string
): Promise<{ answers: PrepAnswer[] }> {
  return apiFetch(`/api/prep/session/${sessionId}/answers`);
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
  const data = await apiFetch<{ events: TimelineEvent[] }>("/api/timeline");
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

export async function generateTimeline(): Promise<{ events_created: number; message: string }> {
  return apiFetch("/api/timeline/generate", { method: "POST" });
}

export async function getWeeklySummary(): Promise<WeeklySummary> {
  return apiFetch("/api/timeline/weekly");
}

export async function getAllFirms(): Promise<Firm[]> {
  const data = await apiFetch<{ firms: Firm[] }>("/api/firms");
  return data.firms;
}

// ============================================================
// Notifications
// ============================================================

export async function getNotifications(): Promise<Notification[]> {
  const data = await apiFetch<{ notifications: Notification[] }>("/api/notifications");
  return data.notifications;
}

// ============================================================
// Upcoming Applications
// ============================================================

export async function getUpcomingApplications(days?: number): Promise<Application[]> {
  const params = new URLSearchParams();
  if (days) params.set("days", String(days));
  const query = params.toString();
  const path = `/api/applications/upcoming${query ? `?${query}` : ""}`;
  const data = await apiFetch<{ applications: Application[] }>(path);
  return data.applications;
}

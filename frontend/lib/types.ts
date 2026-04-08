/** TypeScript interfaces matching the Pydantic models in backend/app/models.py */

export type ClassYear = "freshman" | "sophomore" | "junior" | "senior";

export type FirmTier =
  | "bulge_bracket"
  | "elite_boutique"
  | "middle_market"
  | "boutique"
  | "regional"
  | "buy_side"
  | "quant";

export type FitTier =
  | "strong_match"
  | "reach"
  | "long_shot"
  | "not_recommended";

export interface User {
  id: string;
  email: string;
  created_at: string;
  school: string;
  graduation_year: number;
  current_class_year: ClassYear;
  onboarding_complete: boolean;
}

export interface PriorExperience {
  role: string;
  organization: string;
  summary: string;
  dates: string;
  bullets: string[];
}

export interface StudentProfile {
  user_id: string;
  name: string;
  school: string;
  major: string;
  minor: string | null;
  gpa: number | null;
  target_roles: string[];
  target_geographies: string[];
  technical_skills: string[];
  coursework_completed: string[];
  coursework_in_progress: string[];
  clubs: string[];
  certifications: string[];
  prior_experience: PriorExperience[];
  diversity_status: string | null;
  languages: string[];
  last_updated: string;
}

export interface Firm {
  id: string;
  name: string;
  tier: FirmTier;
  roles_offered: string[];
  headquarters: string;
  offices: string[];
  gpa_floor_estimated: number;
  recruiting_profile: string;
  careers_url: string;
  scraper_adapter: string | null;
  last_scraped_at: string | null;
}

export interface Posting {
  id: string;
  firm_id: string;
  title: string;
  role_type: string;
  class_year_target: ClassYear;
  location: string;
  description: string;
  requirements: string[];
  application_url: string;
  posted_at: string;
  deadline: string | null;
  closed_at: string | null;
  estimated_effort_minutes: number;
}

export interface FitScore {
  user_id: string;
  posting_id: string;
  score: number;
  tier: FitTier;
  rationale: string;
  strengths: string[];
  gaps: string[];
  computed_at: string;
}

export interface OpportunityResponse {
  posting: Posting;
  firm: Firm;
  fit_score: FitScore;
}

// ============================================================
// Phase 2 — Application Tracker
// ============================================================

export type ApplicationStatus =
  | "researching"
  | "networking"
  | "applied"
  | "hirevue"
  | "phone_screen"
  | "first_round"
  | "superday"
  | "offer"
  | "accepted"
  | "declined"
  | "rejected"
  | "ghosted";

export interface Application {
  id: string;
  user_id: string;
  posting_id: string;
  firm_id: string;
  status: ApplicationStatus;
  group_division: string | null;
  applied_at: string | null;
  notes: string;
  next_action: string | null;
  next_action_date: string | null;
  resume_version: string | null;
  recruiter_name: string | null;
  recruiter_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationCreate {
  posting_id: string;
  firm_id: string;
  status?: ApplicationStatus;
  group_division?: string | null;
  notes?: string;
}

export interface ApplicationUpdate {
  status?: ApplicationStatus;
  group_division?: string | null;
  notes?: string;
  next_action?: string | null;
  next_action_date?: string | null;
  resume_version?: string | null;
  recruiter_name?: string | null;
  recruiter_email?: string | null;
}

export interface ApplicationStats {
  total: number;
  by_status: Record<string, number>;
  by_tier: Record<string, number>;
}

// ============================================================
// Phase 2 — Networking Radar / Alumni
// ============================================================

export interface Alumnus {
  id: string;
  name: string;
  firm_id: string;
  current_role: string;
  division: string | null;
  graduation_year: number;
  school: string;
  major: string | null;
  connection_hooks: string[];
  created_at: string;
}

export type ConnectionType =
  | "alumni"
  | "career_fair"
  | "professor_referral"
  | "cold_outreach"
  | "referral"
  | "club_connection"
  | "other";

export type OutreachStatus =
  | "not_contacted"
  | "message_sent"
  | "followed_up"
  | "responded"
  | "call_scheduled"
  | "call_completed"
  | "thank_you_sent";

export interface NetworkingContact {
  id: string;
  user_id: string;
  alumni_id: string | null;
  firm_id: string;
  contact_name: string;
  contact_role: string | null;
  contact_division: string | null;
  connection_type: ConnectionType;
  referred_by_id: string | null;
  outreach_status: OutreachStatus;
  outreach_date: string | null;
  follow_up_date: string | null;
  call_date: string | null;
  call_notes: string | null;
  thank_you_sent_at: string | null;
  next_action: string | null;
  next_action_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface NetworkingContactCreate {
  alumni_id?: string | null;
  firm_id: string;
  contact_name: string;
  contact_role?: string | null;
  contact_division?: string | null;
  connection_type?: ConnectionType;
  referred_by_id?: string | null;
}

export interface OutreachDraftResponse {
  drafts: string[];
  contact_name: string;
  firm_name: string;
  connection_hooks_used: string[];
}

export interface NetworkingNudge {
  contact_id: string;
  contact_name: string;
  firm_id: string;
  days_since_outreach?: number;
  message: string;
}

// ============================================================
// Phase 2 — Interview Prep Coach
// ============================================================

export type PrepCategory =
  | "accounting"
  | "valuation"
  | "ma"
  | "lbo"
  | "behavioral"
  | "firm_specific"
  | "market_awareness"
  | "brain_teaser";

export type SessionType =
  | "technical_accounting"
  | "technical_valuation"
  | "technical_ma"
  | "technical_lbo"
  | "behavioral"
  | "firm_specific"
  | "market_awareness";

export interface PrepSession {
  id: string;
  user_id: string;
  firm_id: string;
  role_type: string;
  session_type: SessionType;
  questions_asked: number;
  questions_correct: number;
  overall_score: number | null;
  claude_feedback: string | null;
  duration_minutes: number | null;
  created_at: string;
}

export interface PrepQuestion {
  question: string;
  category: PrepCategory;
  difficulty: "easy" | "medium" | "hard";
}

export interface PrepAnswer {
  id: string;
  session_id: string;
  user_id: string;
  question_text: string;
  question_category: PrepCategory;
  question_difficulty: "easy" | "medium" | "hard";
  user_answer: string;
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  created_at: string;
}

export interface ReadinessScore {
  user_id: string;
  category: PrepCategory;
  mastery_score: number;
  questions_attempted: number;
  last_practiced_at: string | null;
  needs_review: boolean;
}

export interface PrepSessionStart {
  firm_id: string;
  role_type?: string;
  session_type?: SessionType;
  question_count?: number;
}

// ============================================================
// Phase 2 — Recruiting Timeline
// ============================================================

export type EventType =
  | "application_open"
  | "application_deadline"
  | "diversity_program"
  | "networking_task"
  | "prep_milestone"
  | "interview_scheduled"
  | "follow_up_reminder"
  | "custom";

export type EventPriority = "critical" | "high" | "medium" | "low";

export interface TimelineEvent {
  id: string;
  user_id: string;
  event_type: EventType;
  title: string;
  description: string | null;
  firm_id: string | null;
  posting_id: string | null;
  event_date: string;
  priority: EventPriority;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface TimelineEventCreate {
  title: string;
  description?: string | null;
  firm_id?: string | null;
  event_date: string;
  priority?: EventPriority;
  event_type?: EventType;
}

export interface WeeklySummary {
  week_start: string;
  week_end: string;
  phase_name: string;
  phase_description: string;
  urgent_items: TimelineEvent[];
  upcoming_items: TimelineEvent[];
  overdue_items: TimelineEvent[];
  networking_nudges: string[];
  stats: Record<string, number>;
}

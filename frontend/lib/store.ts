import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import type { StudentProfile } from "./types";

// ============================================================
// Auth Store
// ============================================================
//
// Session and user are held in memory only. Supabase's auth client owns
// persistent session storage (configurable httpOnly cookies in SSR contexts).
// Persisting tokens to localStorage via zustand was an XSS exfil vector —
// any injected script could read them via `localStorage`.

interface AuthStore {
  user: User | null;
  session: Session | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  session: null,
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  signOut: () => set({ user: null, session: null, loading: false }),
}));

// ============================================================
// Upload Store
// ============================================================
//
// Parsed resume data contains PII (GPA, prior experience, clubs). Kept in
// memory only — survives route changes within a tab but not reloads. The
// server is the source of truth via /api/resume.

interface UploadStore {
  parsedProfile: StudentProfile | null;
  savedProfile: StudentProfile | null;
  isUploading: boolean;
  uploadError: string | null;
  setParsedProfile: (profile: StudentProfile | null) => void;
  setSavedProfile: (profile: StudentProfile | null) => void;
  setUploading: (uploading: boolean) => void;
  setUploadError: (error: string | null) => void;
  clear: () => void;
}

export const useUploadStore = create<UploadStore>()((set) => ({
  parsedProfile: null,
  savedProfile: null,
  isUploading: false,
  uploadError: null,
  setParsedProfile: (profile) => set({ parsedProfile: profile }),
  setSavedProfile: (profile) => set({ savedProfile: profile }),
  setUploading: (uploading) => set({ isUploading: uploading }),
  setUploadError: (error) => set({ uploadError: error }),
  clear: () =>
    set({
      parsedProfile: null,
      savedProfile: null,
      isUploading: false,
      uploadError: null,
    }),
}));

// Migration: best-effort removal of legacy persisted data from prior versions.
// Safe to keep for a few releases; remove once you're sure all users have hit
// the new build.
if (typeof window !== "undefined") {
  try {
    window.localStorage.removeItem("internshipmatch-auth");
    window.localStorage.removeItem("internshipmatch-upload");
  } catch {
    // localStorage may be disabled; nothing to do.
  }
}

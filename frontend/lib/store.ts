import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Session } from "@supabase/supabase-js";
import type { StudentProfile } from "./types";

// ============================================================
// Auth Store
// ============================================================

interface AuthStore {
  user: User | null;
  session: Session | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      loading: true,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => set({ loading }),
      signOut: () => set({ user: null, session: null, loading: false }),
    }),
    {
      name: "internshipmatch-auth",
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    }
  )
);

// ============================================================
// Upload Store
// ============================================================

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

export const useUploadStore = create<UploadStore>()(
  persist(
    (set) => ({
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
    }),
    {
      name: "internshipmatch-upload",
      partialize: (state) => ({
        parsedProfile: state.parsedProfile,
        savedProfile: state.savedProfile,
      }),
    }
  )
);

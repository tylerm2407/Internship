import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StudentProfile } from "./types";

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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText } from "@phosphor-icons/react";
import { useUploadStore } from "../../lib/store";
import { getProfile, uploadResume } from "../../lib/api";
import { UploadZone } from "../../components/UploadZone";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SecondaryButton } from "../../components/SecondaryButton";
import { AuthGuard } from "../../components/AuthGuard";
import { Wordmark } from "../../components/Wordmark";
import { Card } from "../../components/Card";
import { EyebrowLabel } from "../../components/EyebrowLabel";
import type { StudentProfile } from "../../lib/types";

type Mode = "checking" | "has_profile" | "upload";

export default function UploadPage() {
  const router = useRouter();
  const { isUploading, uploadError, setUploading, setUploadError, setParsedProfile } =
    useUploadStore();

  const [mode, setMode] = useState<Mode>("checking");
  const [savedProfile, setSavedProfile] = useState<StudentProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const profile = await getProfile();
      if (cancelled) return;
      if (profile) {
        setSavedProfile(profile);
        setMode("has_profile");
      } else {
        setMode("upload");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError(null);

    try {
      const result = await uploadResume(file);
      setParsedProfile(result.parsed_profile);
      router.push("/onboarding");
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to parse resume",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-surface-border bryant-stripe">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
            <a href="/" aria-label="InternshipMatch home">
              <Wordmark />
            </a>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center">
          <div className="max-w-xl w-full px-6 py-24 space-y-8">
            {mode === "checking" && (
              <div className="flex justify-center gap-1 py-12">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-accent rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            )}

            {mode === "has_profile" && savedProfile && (
              <Card>
                <div className="space-y-5">
                  <EyebrowLabel>Resume on file</EyebrowLabel>
                  <div className="flex items-start gap-3">
                    <FileText
                      size={20}
                      weight="regular"
                      aria-hidden="true"
                      className="text-accent shrink-0 mt-1"
                    />
                    <div className="space-y-1">
                      <h1 className="font-serif text-2xl tracking-tight">
                        {savedProfile.name
                          ? `${savedProfile.name}'s resume is saved`
                          : "Your resume is saved"}
                      </h1>
                      <p className="text-sm text-ink-secondary">
                        {[
                          savedProfile.school,
                          savedProfile.major,
                          savedProfile.gpa
                            ? `${savedProfile.gpa.toFixed(2)} GPA`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-ink-secondary">
                    We&apos;ve got your profile. You don&apos;t need to re-upload
                    unless something has changed (new experience, new GPA, etc.)
                    — it&apos;s kept until you replace it.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <Link href="/dashboard" className="flex-1">
                      <PrimaryButton className="w-full justify-center">
                        Continue to dashboard
                        <ArrowRight size={14} aria-hidden="true" />
                      </PrimaryButton>
                    </Link>
                    <SecondaryButton
                      onClick={() => setMode("upload")}
                      className="flex-1 justify-center"
                    >
                      Replace with a new resume
                    </SecondaryButton>
                  </div>

                  <p className="font-mono text-[10px] uppercase tracking-wider text-ink-tertiary pt-2">
                    You can also edit fields directly from the dashboard.
                  </p>
                </div>
              </Card>
            )}

            {mode === "upload" && (
              <>
                <div className="space-y-3">
                  <h1 className="font-serif text-5xl tracking-tight">
                    {savedProfile ? "Replace your resume" : "Upload your resume"}
                  </h1>
                  <p className="text-lg text-ink-secondary leading-relaxed">
                    {savedProfile
                      ? "We'll parse the new PDF and let you review before we overwrite your saved profile."
                      : "We'll extract your profile and show it to you for review before saving anything."}
                  </p>
                </div>

                {isUploading ? (
                  <div className="bg-surface border border-surface-border rounded-lg p-12 text-center space-y-4">
                    <div className="flex justify-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-2 h-2 bg-accent rounded-full animate-pulse"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </div>
                    <p className="font-mono text-sm text-ink-secondary">
                      Analyzing your resume...
                    </p>
                  </div>
                ) : (
                  <UploadZone onFileSelected={handleFile} disabled={isUploading} />
                )}

                {uploadError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                    <p className="text-sm text-red-800">{uploadError}</p>
                    <PrimaryButton
                      onClick={() => setUploadError(null)}
                      className="text-xs px-4 py-2"
                    >
                      Try again
                    </PrimaryButton>
                  </div>
                )}

                {savedProfile && (
                  <button
                    type="button"
                    onClick={() => setMode("has_profile")}
                    className="text-sm text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
                  >
                    ← Keep my saved resume instead
                  </button>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

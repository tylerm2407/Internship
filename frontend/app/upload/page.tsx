"use client";

import { useRouter } from "next/navigation";
import { useUploadStore } from "../../lib/store";
import { uploadResume } from "../../lib/api";
import { UploadZone } from "../../components/UploadZone";
import { PrimaryButton } from "../../components/PrimaryButton";

export default function UploadPage() {
  const router = useRouter();
  const { isUploading, uploadError, setUploading, setUploadError, setParsedProfile } =
    useUploadStore();

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError(null);

    try {
      const result = await uploadResume(file);
      setParsedProfile(result.parsed_profile);
      router.push("/onboarding");
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to parse resume"
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header bar */}
      <header className="border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
          <a href="/" className="font-serif text-xl font-medium text-accent">
            InternshipMatch
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="max-w-xl w-full px-6 py-24 space-y-8">
          <div className="space-y-3">
            <h1 className="font-serif text-5xl tracking-tight">
              Upload your resume
            </h1>
            <p className="text-lg text-ink-secondary leading-relaxed">
              We&apos;ll extract your profile and show it to you for review
              before saving anything.
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
                Parsing your resume with Claude Vision...
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
        </div>
      </main>
    </div>
  );
}

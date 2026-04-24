"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EyebrowLabel } from "@/components/EyebrowLabel";

const ALLOWED_EMAIL_DOMAIN = "bryant.edu";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
      setError(
        `Enter the @${ALLOWED_EMAIL_DOMAIN} address tied to your account.`,
      );
      return;
    }

    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/reset-password`;

    // Supabase intentionally returns success even if the email doesn't exist
    // (prevents account enumeration). We surface a generic success either way.
    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo },
    );

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-2xl font-medium text-accent mb-1">
            InternshipMatch
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-secondary mb-3">
            Bryant University
          </p>
          <p className="text-ink-secondary text-sm">Reset your password</p>
        </div>

        <Card>
          {sent ? (
            <div className="text-center py-4">
              <EyebrowLabel className="mb-3 block">Check Your Email</EyebrowLabel>
              <p className="text-ink-secondary text-sm mb-4">
                If an account exists for{" "}
                <span className="font-mono text-ink-primary">{email}</span>,
                we just sent a password reset link. It may take a minute to
                arrive — check spam if you don&apos;t see it.
              </p>
              <Link
                href="/login"
                className="text-accent text-sm font-medium hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-ink-secondary">
                Enter your Bryant email and we&apos;ll send you a link to set a
                new password.
              </p>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-ink-primary mb-1"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@bryant.edu"
                  aria-describedby={error ? "forgot-error" : undefined}
                  className="w-full px-3 py-2 text-sm border border-surface-border rounded-md bg-bg text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
              </div>

              {error && (
                <p
                  id="forgot-error"
                  role="alert"
                  className="text-sm text-red-600"
                >
                  {error}
                </p>
              )}

              <PrimaryButton
                type="submit"
                disabled={loading}
                className="w-full justify-center"
              >
                {loading ? "Sending link..." : "Send reset link"}
              </PrimaryButton>
            </form>
          )}
        </Card>

        <p className="text-center text-sm text-ink-secondary mt-6">
          Remembered it?{" "}
          <Link
            href="/login"
            className="text-accent font-medium hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

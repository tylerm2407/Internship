"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EyebrowLabel } from "@/components/EyebrowLabel";

/**
 * Password reset landing page. Users arrive here from the email link sent by
 * `resetPasswordForEmail`. Supabase parses the recovery token from the URL
 * fragment on page load and fires an auth state change with event
 * "PASSWORD_RECOVERY", which puts the user into a temporary recovery session
 * that can call `updateUser({ password })` exactly once.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Supabase emits PASSWORD_RECOVERY once it finishes parsing the recovery
    // token from the URL fragment. Until then, updateUser will 401.
    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent) => {
        if (event === "PASSWORD_RECOVERY") {
          setRecoveryReady(true);
        }
      },
    );

    // Also check for an existing session — if the user refreshed the page
    // after the token was consumed, they'll have a normal session.
    supabase.auth
      .getSession()
      .then((result: { data: { session: Session | null } }) => {
        if (result.data.session) setRecoveryReady(true);
      });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // Supabase already upgraded the recovery session to a normal session,
    // so send the user to the dashboard after a brief confirmation.
    setTimeout(() => router.replace("/dashboard"), 1500);
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
          <p className="text-ink-secondary text-sm">Choose a new password</p>
        </div>

        <Card>
          {success ? (
            <div className="text-center py-4">
              <EyebrowLabel className="mb-3 block">Password Updated</EyebrowLabel>
              <p className="text-ink-secondary text-sm">
                You&apos;re signed in. Redirecting to your dashboard…
              </p>
            </div>
          ) : !recoveryReady ? (
            <div className="text-center py-4 space-y-3">
              <EyebrowLabel className="mb-2 block">Verifying link</EyebrowLabel>
              <p className="text-ink-secondary text-sm">
                If this doesn&apos;t resolve in a few seconds, the link may
                have expired.{" "}
                <Link
                  href="/forgot-password"
                  className="text-accent font-medium hover:underline"
                >
                  Request a new one
                </Link>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-ink-primary mb-1"
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoFocus
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2 text-sm border border-surface-border rounded-md bg-bg text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-ink-primary mb-1"
                >
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  aria-describedby={error ? "reset-error" : undefined}
                  className="w-full px-3 py-2 text-sm border border-surface-border rounded-md bg-bg text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
              </div>

              {error && (
                <p
                  id="reset-error"
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
                {loading ? "Saving..." : "Set new password"}
              </PrimaryButton>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

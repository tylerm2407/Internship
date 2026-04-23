"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EyebrowLabel } from "@/components/EyebrowLabel";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const ALLOWED_EMAIL_DOMAIN = "bryant.edu";

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
      setError(
        `Accounts are limited to @${ALLOWED_EMAIL_DOMAIN} addresses during the pilot. Use your school email to continue.`,
      );
      return;
    }

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
    const { error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
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
          <p className="text-ink-secondary text-sm">
            Create your account
          </p>
        </div>

        <Card>
          {success ? (
            <div className="text-center py-4">
              <EyebrowLabel className="mb-3 block">Check Your Email</EyebrowLabel>
              <p className="text-ink-secondary text-sm mb-4">
                We sent a confirmation link to{" "}
                <span className="font-mono text-ink-primary">{email}</span>.
                Click the link to activate your account.
              </p>
              <Link
                href="/login"
                className="text-accent text-sm font-medium hover:underline"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
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
                  aria-describedby={error ? "signup-error" : undefined}
                  className="w-full px-3 py-2 text-sm border border-surface-border rounded-md bg-bg text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
                <p className="mt-1 text-xs text-ink-tertiary">
                  Pilot is limited to @bryant.edu email addresses.
                </p>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-ink-primary mb-1"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
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
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full px-3 py-2 text-sm border border-surface-border rounded-md bg-bg text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
              </div>

              {error && (
                <p id="signup-error" role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <PrimaryButton
                type="submit"
                disabled={loading}
                className="w-full justify-center"
              >
                {loading ? "Creating account..." : "Create account"}
              </PrimaryButton>
            </form>
          )}
        </Card>

        <p className="text-center text-sm text-ink-secondary mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-accent font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

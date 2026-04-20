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

  async function handleSignup(e: FormEvent) {
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
    const { error: authError } = await supabase.auth.signUp({
      email,
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
          <h1 className="font-serif text-2xl font-medium text-ink-primary mb-2">
            InternshipMatch
          </h1>
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
                  placeholder="you@university.edu"
                  className="w-full px-3 py-2 text-sm border border-surface-border rounded-md bg-bg text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
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
                <p className="text-sm text-red-600">{error}</p>
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

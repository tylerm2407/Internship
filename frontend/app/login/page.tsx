"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EyebrowLabel } from "@/components/EyebrowLabel";

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setSession } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
      router.replace("/dashboard");
    }

    setLoading(false);
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Enter your email address first.");
      return;
    }

    setError(null);
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setMagicLinkSent(true);
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
            Sign in to your account
          </p>
        </div>

        <Card>
          {magicLinkSent ? (
            <div className="text-center py-4">
              <EyebrowLabel className="mb-3 block">Magic Link Sent</EyebrowLabel>
              <p className="text-ink-secondary text-sm mb-4">
                Check your email for a sign-in link. You can close this tab.
              </p>
              <button
                onClick={() => setMagicLinkSent(false)}
                className="text-accent text-sm font-medium hover:underline cursor-pointer"
              >
                Back to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
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
                  aria-describedby={error ? "login-error" : undefined}
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
                  placeholder="Your password"
                  className="w-full px-3 py-2 text-sm border border-surface-border rounded-md bg-bg text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
              </div>

              {error && (
                <p id="login-error" role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <PrimaryButton
                type="submit"
                disabled={loading}
                className="w-full justify-center"
              >
                {loading ? "Signing in..." : "Sign in"}
              </PrimaryButton>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-surface-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-surface px-3 text-xs text-ink-tertiary uppercase tracking-wide">
                    or
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleMagicLink}
                disabled={loading}
                className="w-full px-3 py-2.5 text-sm font-medium text-accent border border-surface-border rounded-md hover:bg-surface-hover transition-colors duration-200 cursor-pointer disabled:opacity-50"
              >
                Send magic link
              </button>
            </form>
          )}
        </Card>

        <p className="text-center text-sm text-ink-secondary mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-accent font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

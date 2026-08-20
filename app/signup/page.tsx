"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Mail, Lock, Eye, EyeOff, User, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { APP_NAME } from "@/lib/data";
import { scaleIn } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validate = (): string | null => {
    if (!fullName.trim()) return "Full name is required.";
    if (!email.trim()) return "Email is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (signUpError) throw signUpError;
      setSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Sign up failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/auth/callback",
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Google sign-in failed.";
      setError(message);
    }
  };

  return (
    <div className="mesh-bg min-h-screen flex items-center justify-center px-4 py-16">
      <motion.div
        variants={scaleIn}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        <div
          className="rounded-2xl border border-[var(--border)] backdrop-blur-xl p-8"
          style={{ background: "rgba(26,26,46,0.85)" }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-[var(--primary)] flex items-center justify-center glow-primary">
                <Sparkles className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div className="absolute -inset-1 rounded-xl bg-[var(--primary)] opacity-20 blur-sm" />
            </div>
            <span className="text-lg font-semibold text-[var(--foreground)] tracking-tight">
              {APP_NAME}
            </span>
          </div>

          {success ? (
            /* Success state */
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center gap-4 py-6 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                  Account created!
                </h2>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                  Check your email to confirm your account before signing in.
                </p>
              </div>
              <Link
                href="/login"
                className="mt-2 text-sm text-[var(--accent)] hover:text-[var(--primary-light)] transition-colors duration-200 font-medium"
              >
                Go to Sign In
              </Link>
            </motion.div>
          ) : (
            <>
              {/* Title */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight text-glow-primary mb-1">
                  Create your account
                </h1>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Start automating your QA workflow
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-[var(--destructive)]/40 bg-[var(--destructive)]/10 px-4 py-3 mb-6">
                  <AlertCircle className="w-4 h-4 text-[var(--destructive)] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[var(--destructive)] leading-snug">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                {/* Full Name */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="fullName"
                    className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Smith"
                      required
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-[var(--border)] bg-[rgba(15,15,26,0.85)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:border-[var(--accent)] transition-colors duration-200"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="email"
                    className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-[var(--border)] bg-[rgba(15,15,26,0.85)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:border-[var(--accent)] transition-colors duration-200"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="password"
                    className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      className="w-full h-11 pl-10 pr-11 rounded-xl border border-[var(--border)] bg-[rgba(15,15,26,0.85)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:border-[var(--accent)] transition-colors duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="confirmPassword"
                    className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      required
                      className="w-full h-11 pl-10 pr-11 rounded-xl border border-[var(--border)] bg-[rgba(15,15,26,0.85)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:border-[var(--accent)] transition-colors duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200"
                      aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirm ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full h-11 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 glow-primary"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-xs text-[var(--muted-foreground)]">or</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              {/* Google OAuth */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full h-11 rounded-xl border border-[var(--border)] bg-white/5 hover:bg-white/10 text-[var(--foreground)] text-sm font-medium transition-all duration-200 flex items-center justify-center gap-3"
              >
                {/* Google SVG */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
                    fill="#34A853"
                  />
                  <path
                    d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>

              {/* Sign in link */}
              <p className="text-center text-sm text-[var(--muted-foreground)] mt-6">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-[var(--accent)] hover:text-[var(--primary-light)] font-medium transition-colors duration-200"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { navLinks, APP_NAME, APP_VERSION } from "@/lib/data";
import { navbarVariants } from "@/lib/motion";
import { Sparkles, Menu, X, LogOut, UserCircle } from 'lucide-react';
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/lib/supabase/db";

const mobileMenuVariants = {
  hidden: { opacity: 0, y: -8, height: 0 },
  visible: {
    opacity: 1,
    y: 0,
    height: "auto",
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -8,
    height: 0,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const isActive = (href: string): boolean => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const truncateEmail = (email: string): string => {
    if (email.length <= 22) return email;
    const [local, domain] = email.split("@");
    if (!domain) return email.slice(0, 22) + "…";
    const truncatedLocal = local.length > 10 ? local.slice(0, 10) + "…" : local;
    return `${truncatedLocal}@${domain}`;
  };

  return (
    <motion.header
      variants={navbarVariants}
      initial="hidden"
      animate="visible"
      className="sticky top-0 z-50 glass border-b border-[var(--border)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            aria-label={APP_NAME}
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center glow-primary transition-all duration-300 group-hover:scale-110">
                <Sparkles className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <div className="absolute -inset-1 rounded-lg bg-[var(--primary)] opacity-20 blur-sm group-hover:opacity-40 transition-opacity duration-300" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
                {APP_NAME}
              </span>
              <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
                {APP_VERSION}
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav
            className="hidden md:flex items-center gap-1"
            aria-label="Main navigation"
          >
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.key}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={[
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-[var(--primary)]/20 text-[var(--primary-light)]"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5",
                  ].join(" ")}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Desktop Auth Section */}
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-[var(--border)]">
              {user ? (
                <>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5">
                    <UserCircle className="w-4 h-4 text-[var(--primary-light)] flex-shrink-0" aria-hidden="true" />
                    <span className="text-xs text-[var(--muted-foreground)] max-w-[140px] truncate">
                      {truncateEmail(user.email ?? "User")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10 transition-all duration-200"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="text-xs">Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-3 py-1.5 rounded-md text-sm bg-[var(--primary)]/20 text-[var(--primary-light)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/30 transition-all duration-200"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="px-3 py-1.5 rounded-md text-sm bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-[0_0_12px_rgba(124,58,237,0.3)]"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile slide-down panel */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            variants={mobileMenuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="md:hidden overflow-hidden border-t border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-xl"
          >
            <nav
              className="flex flex-col gap-1 px-4 py-3"
              aria-label="Mobile navigation"
            >
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.key}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={[
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-[var(--primary)]/20 text-[var(--primary-light)]"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5",
                    ].join(" ")}
                    aria-current={active ? "page" : undefined}
                  >
                    {link.icon && (
                      <span className="text-base" aria-hidden="true">
                        {link.icon}
                      </span>
                    )}
                    {link.label}
                  </Link>
                );
              })}

              {/* Mobile Auth Section */}
              <div className="mt-2 pt-2 border-t border-[var(--border)] flex flex-col gap-2">
                {user ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/5">
                      <UserCircle className="w-4 h-4 text-[var(--primary-light)] flex-shrink-0" aria-hidden="true" />
                      <span className="text-xs text-[var(--muted-foreground)] truncate">
                        {user.email ?? "User"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        handleSignOut();
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10 transition-all duration-200 w-full text-left"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center px-3 py-2 rounded-md text-sm bg-[var(--primary)]/20 text-[var(--primary-light)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/30 transition-all duration-200"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center px-3 py-2 rounded-md text-sm bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 transition-all duration-200"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

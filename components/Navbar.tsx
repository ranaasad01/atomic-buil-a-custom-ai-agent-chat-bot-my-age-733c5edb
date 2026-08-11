"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { navLinks, APP_NAME, APP_VERSION } from "@/lib/data";
import { navbarVariants } from "@/lib/motion";
import { Sparkles, Menu, X } from 'lucide-react';
import { useState } from "react";

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
  const t = useTranslations();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string): boolean => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
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
          <motion.nav
            key="mobile-menu"
            variants={mobileMenuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="md:hidden overflow-hidden border-t border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-xl"
            aria-label="Mobile navigation"
          >
            <div className="px-4 py-3 flex flex-col gap-1">
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
                      <span className="text-xs" aria-hidden="true">
                        {link.icon}
                      </span>
                    )}
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

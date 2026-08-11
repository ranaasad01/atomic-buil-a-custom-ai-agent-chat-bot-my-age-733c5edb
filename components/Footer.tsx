"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { navLinks, APP_NAME, APP_VERSION, APP_TAGLINE } from "@/lib/data";
import { fadeInUp } from "@/lib/motion";
import { Sparkles } from 'lucide-react';

export default function Footer() {
  const t = useTranslations();

  return (
    <motion.footer
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="border-t border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2 group w-fit">
              <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Sparkles className="w-3.5 h-3.5 text-white" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {APP_NAME}
              </span>
            </Link>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed max-w-[220px]">
              {APP_TAGLINE}
            </p>
            <span className="text-[10px] font-mono text-[var(--muted-foreground)]/60">
              {APP_VERSION}
            </span>
          </div>

          {/* Navigation */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-widest">
              Navigation
            </h3>
            <nav className="flex flex-col gap-2" aria-label="Footer navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors duration-200 w-fit"
                >
                  {link.icon && (
                    <span className="text-xs" aria-hidden="true">
                      {link.icon}
                    </span>
                  )}
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Built With */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-widest">
              Built With
            </h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] inline-block flex-shrink-0"
                  aria-hidden="true"
                />
                <span className="text-sm text-[var(--muted-foreground)]">
                  Next.js
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--muted-foreground)]/40 inline-block flex-shrink-0"
                  aria-hidden="true"
                />
                <span className="text-sm text-[var(--muted-foreground)]">
                  TypeScript
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--muted-foreground)]/40 inline-block flex-shrink-0"
                  aria-hidden="true"
                />
                <span className="text-sm text-[var(--muted-foreground)]">
                  Tailwind CSS
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[var(--border)] mt-8 pt-6 flex items-center justify-center">
          <p className="text-xs text-[var(--muted-foreground)]">
            {t("footer.copyright")}
          </p>
        </div>
      </div>
    </motion.footer>
  );
}

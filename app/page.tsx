"use client";

import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import { Globe, Terminal, FileText, Sparkles, Shield, Clock, ArrowRight, Play, CheckCircle, Zap, ChevronRight, Download } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { staggerContainer, fadeInUp, scaleIn } from "@/lib/motion";
import { APP_NAME, APP_TAGLINE, FRAMEWORKS } from "@/lib/data";

const MODEL_DISPLAY = "Claude 3.5 Sonnet";

// ─── Hero animation variants ─────────────────────────────────────────────────

const heroVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.13, delayChildren: 0.15 },
  },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

// ─── Static data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Globe,
    title: "Live URL Analysis",
    description:
      "Paste any live website URL and the agent instantly crawls its structure, identifying all interactive elements, forms, navigation flows, and API endpoints.",
    colorClass: "bg-[var(--accent)]/15 text-[var(--accent)]",
    borderHover: "hover:border-[var(--accent)]/40",
  },
  {
    icon: Terminal,
    title: "Multi-Framework Scripts",
    description:
      "Generate production-ready test scripts for Playwright (TypeScript), Cypress (JavaScript), and Selenium WebDriver (Python) in a single request.",
    colorClass: "bg-[var(--primary)]/15 text-[var(--primary-light)]",
    borderHover: "hover:border-[var(--primary)]/40",
  },
  {
    icon: FileText,
    title: "Excel Test Case Export",
    description:
      "Automatically produce structured test case sheets with Test ID, Suite, Steps, Expected Results, Priority, and Status columns ready for your QA team.",
    colorClass: "bg-[var(--accent)]/15 text-[var(--accent)]",
    borderHover: "hover:border-[var(--accent)]/40",
  },
  {
    icon: Sparkles,
    title: "Editable Agent Prompt",
    description:
      "Customize the agent's behavior, testing style, and output format by editing the system prompt directly from the Settings page.",
    colorClass: "bg-[var(--primary)]/15 text-[var(--primary-light)]",
    borderHover: "hover:border-[var(--primary)]/40",
  },
  {
    icon: Shield,
    title: "Best-Practice Patterns",
    description:
      "Every generated script follows AAA (Arrange-Act-Assert), uses data-testid selectors, includes error handling, and applies meaningful assertions.",
    colorClass: "bg-[var(--accent)]/15 text-[var(--accent)]",
    borderHover: "hover:border-[var(--accent)]/40",
  },
  {
    icon: Clock,
    title: "Session History",
    description:
      "All chat sessions, test plans, and generated scripts are saved locally so you can revisit, compare, and export past analyses at any time.",
    colorClass: "bg-[var(--primary)]/15 text-[var(--primary-light)]",
    borderHover: "hover:border-[var(--primary)]/40",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Globe,
    title: "Paste a URL",
    description:
      "Enter any live website URL into the chat. The agent crawls the page structure, identifies testable elements, and builds a full mental model of the application.",
    iconColor: "text-[var(--accent)]",
    iconBg: "bg-[var(--accent)]/15",
  },
  {
    step: "02",
    icon: Terminal,
    title: "Choose Frameworks",
    description:
      "Select Playwright, Cypress, Selenium, or all three. The agent tailors each script to the framework's idioms, selectors, and assertion libraries.",
    iconColor: "text-[var(--primary-light)]",
    iconBg: "bg-[var(--primary)]/15",
  },
  {
    step: "03",
    icon: Download,
    title: "Download and Ship",
    description:
      "Receive a structured test plan, full automation scripts, and a downloadable Excel sheet of test cases — all ready to drop into your CI pipeline.",
    iconColor: "text-[var(--accent)]",
    iconBg: "bg-[var(--accent)]/15",
  },
];

const PLAYWRIGHT_SNIPPET = `import { test, expect } from '@playwright/test';

test.describe('Homepage — Smoke Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://example.com');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/.+/);
  });

  test('primary CTA is visible and clickable', async ({ page }) => {
    const cta = page.locator('[data-testid="cta"]');
    await expect(cta).toBeVisible();
    await cta.click();
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.reload();
    expect(errors).toHaveLength(0);
  });
});`;

// ─── Component ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const displayFrameworks = FRAMEWORKS.filter((f) => f.value !== "all");

  return (
    <div className="flex flex-col">
      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden mesh-bg">
        {/* Floating orbs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <motion.div
            animate={{
              y: [0, -28, 0],
              scale: [1, 1.08, 1],
              opacity: [0.18, 0.28, 0.18],
            }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-[var(--primary)] blur-[120px]"
          />
          <motion.div
            animate={{
              y: [0, 24, 0],
              scale: [1, 1.06, 1],
              opacity: [0.12, 0.2, 0.12],
            }}
            transition={{
              duration: 11,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
            className="absolute -bottom-40 -right-40 w-[480px] h-[480px] rounded-full bg-[var(--accent)] blur-[140px]"
          />
          <motion.div
            animate={{
              x: [0, 16, 0],
              opacity: [0.06, 0.12, 0.06],
            }}
            transition={{
              duration: 14,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 4,
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[var(--primary-light)] blur-[180px]"
          />
        </div>

        {/* Hero content */}
        <motion.div
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex flex-col items-center text-center px-4 sm:px-6 max-w-4xl mx-auto"
        >
          {/* Badge */}
          <motion.div variants={heroItem}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-[var(--accent)]/30 text-sm text-[var(--foreground)]/80 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
              </span>
              Powered by {MODEL_DISPLAY}
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            variants={heroItem}
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-balance leading-[1.08] mb-6"
          >
            Your AI-Powered{" "}
            <span
              className="bg-gradient-to-r from-[var(--primary)] via-[var(--primary-light)] to-[var(--accent)] bg-clip-text text-transparent"
            >
              QA Engineer
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={heroItem}
            className="text-lg sm:text-xl text-[var(--muted-foreground)] max-w-2xl leading-relaxed mb-10 text-pretty"
          >
            {APP_TAGLINE}
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={heroItem}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link
              href="/chat-home-main-agent-chat-interface"
              className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[var(--primary)] text-white font-semibold text-base transition-all duration-300 hover:bg-[var(--primary-light)] glow-primary hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <Play className="w-4 h-4" aria-hidden="true" />
              Start Testing
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link
              href="/history"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl glass border border-[var(--border)] text-[var(--foreground)]/80 font-medium text-base transition-all duration-300 hover:border-[var(--primary)]/50 hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <Clock className="w-4 h-4" aria-hidden="true" />
              View History
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            variants={heroItem}
            className="flex flex-wrap items-center justify-center gap-5 mt-14 text-xs text-[var(--muted-foreground)]"
          >
            {[
              { icon: CheckCircle, label: "Playwright" },
              { icon: CheckCircle, label: "Cypress" },
              { icon: CheckCircle, label: "Selenium" },
              { icon: CheckCircle, label: "Excel Export" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-[var(--accent)]" aria-hidden="true" />
                {label}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
          aria-hidden="true"
        >
          <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest">
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="w-px h-8 bg-gradient-to-b from-[var(--muted-foreground)]/40 to-transparent"
          />
        </motion.div>
      </section>

      {/* ── 2. HOW IT WORKS ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)] mb-4">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--foreground)] text-balance">
              From URL to Test Suite in Seconds
            </h2>
          </Reveal>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Connecting line (desktop only) */}
            <div
              aria-hidden="true"
              className="hidden md:block absolute top-[3.25rem] left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-px bg-gradient-to-r from-[var(--accent)]/30 via-[var(--primary)]/40 to-[var(--accent)]/30"
            />

            {HOW_IT_WORKS.map((step, i) => (
              <Reveal key={step.step} delay={i * 0.12}>
                <div className="relative glass rounded-2xl p-7 border border-[var(--border)] hover:border-[var(--primary)]/40 transition-all duration-300 h-full">
                  {/* Step number */}
                  <span className="absolute top-5 right-6 text-5xl font-black text-[var(--foreground)]/5 select-none leading-none">
                    {step.step}
                  </span>

                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-xl ${step.iconBg} flex items-center justify-center mb-5`}
                  >
                    <step.icon
                      className={`w-6 h-6 ${step.iconColor}`}
                      aria-hidden="true"
                    />
                  </div>

                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                    {step.description}
                  </p>

                  {/* Arrow connector (mobile) */}
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="md:hidden flex justify-center mt-6"
                    >
                      <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)]/40 rotate-90" />
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. FEATURES ─────────────────────────────────────────────────── */}
      <section
        id="features"
        className="py-24 px-4 sm:px-6 bg-[var(--card)]/30"
      >
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-light)] mb-4">
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--foreground)] text-balance">
              Everything Your QA Team Needs
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 0.08}>
                <div
                  className={`glass rounded-xl p-6 border border-[var(--border)] ${feature.borderHover} transition-all duration-300 h-full group cursor-default`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl ${feature.colorClass} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}
                  >
                    <feature.icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-semibold text-[var(--foreground)] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. FRAMEWORKS ───────────────────────────────────────────────── */}
      <section id="frameworks" className="py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)] mb-4">
              Frameworks
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--foreground)] text-balance">
              Generate Scripts for Any Framework
            </h2>
          </Reveal>

          {/* Framework pills */}
          <Reveal className="flex flex-wrap justify-center gap-3 mb-12">
            {displayFrameworks.map((fw, i) => {
              const dotColor =
                i % 2 === 0 ? "bg-[var(--accent)]" : "bg-[var(--primary-light)]";
              return (
                <span
                  key={fw.value}
                  className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full glass border border-[var(--border)] text-sm font-medium text-[var(--foreground)]/80 hover:border-[var(--primary)]/40 transition-colors duration-200"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`}
                    aria-hidden="true"
                  />
                  {fw.label}
                </span>
              );
            })}
          </Reveal>

          {/* Code preview card */}
          <Reveal>
            <div className="glass rounded-2xl border border-[var(--border)] overflow-hidden shadow-[0_8px_40px_-12px_rgba(124,58,237,0.25)]">
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] bg-[var(--card)]/60">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                    <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                    <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                  </div>
                  <span className="ml-2 text-xs text-[var(--muted-foreground)] font-mono">
                    homepage.spec.ts
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                  TypeScript
                </span>
              </div>

              {/* Code block */}
              <div className="overflow-x-auto">
                <pre className="p-6 text-xs leading-relaxed text-[var(--foreground)]/85 font-mono">
                  <code>{PLAYWRIGHT_SNIPPET}</code>
                </pre>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 5. CTA ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="gradient-border relative rounded-2xl overflow-hidden">
              {/* Glow backdrop */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 via-transparent to-[var(--accent)]/10 pointer-events-none"
              />
              <div
                aria-hidden="true"
                className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-[var(--primary)] blur-[100px] opacity-20 pointer-events-none"
              />

              <div className="relative glass rounded-2xl px-8 py-14 sm:px-14 text-center">
                <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--primary)]/20 border border-[var(--primary)]/30 text-xs font-semibold text-[var(--primary-light)] mb-6">
                  <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                  Ready to automate?
                </span>

                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--foreground)] mb-4 text-balance">
                  Ready to Automate Your QA?
                </h2>
                <p className="text-[var(--muted-foreground)] text-base leading-relaxed mb-10 max-w-lg mx-auto">
                  Paste a URL, pick your frameworks, and let {APP_NAME} generate
                  production-ready test scripts and Excel test case sheets in
                  seconds.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/chat-home-main-agent-chat-interface"
                    className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--primary)] text-white font-semibold text-base transition-all duration-300 hover:bg-[var(--primary-light)] glow-primary hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                    Launch QA Agent
                    <ArrowRight
                      className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Link>

                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg px-2 py-1"
                  >
                    Configure Settings
                    <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

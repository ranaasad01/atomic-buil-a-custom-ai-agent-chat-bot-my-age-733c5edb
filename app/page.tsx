"use client";

import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import { Globe, Terminal, FileText, Sparkles, Shield, Clock, ArrowRight, Play, CheckCircle, Zap, ChevronRight, Download } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { staggerContainer, fadeInUp, scaleIn } from "@/lib/motion";
import { APP_NAME, APP_TAGLINE, FRAMEWORKS } from "@/lib/data";

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

const STATS = [
  { value: "3", label: "Frameworks Supported", icon: Terminal },
  { value: "100+", label: "Test Patterns", icon: CheckCircle },
  { value: "<30s", label: "Time to First Script", icon: Zap },
  { value: "WCAG", label: "Accessibility Checks", icon: Shield },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden px-4 py-24">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[var(--primary)] opacity-[0.07] blur-[120px] rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-[var(--accent)] opacity-[0.05] blur-[100px] rounded-full" />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <motion.div
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center gap-6"
        >
          {/* Badge */}
          <motion.div variants={heroItem}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide border border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--primary-light)]">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              AI-Powered QA Agent
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={heroItem}
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[var(--foreground)] text-balance leading-[1.1]"
          >
            Your AI-Powered{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-light)] to-[var(--accent)] text-glow-primary">
              QA Engineer
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={heroItem}
            className="text-base sm:text-lg text-[var(--muted-foreground)] max-w-2xl leading-relaxed text-pretty"
          >
            Paste any live URL and get production-ready Playwright, Cypress, and Selenium test
            scripts in seconds. Complete with Excel test case sheets and full coverage reports.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={heroItem}
            className="flex flex-col sm:flex-row items-center gap-3 mt-2"
          >
            <Link
              href="/chat-home-main-agent-chat-interface"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-semibold text-sm transition-all duration-300 hover:bg-[var(--primary-light)] glow-primary hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <Play className="w-4 h-4" aria-hidden="true" />
              Start Testing
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="/history"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] font-medium text-sm transition-all duration-300 hover:border-[var(--primary)]/50 hover:text-[var(--foreground)] hover:bg-white/5"
            >
              View History
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            variants={heroItem}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 w-full max-w-2xl"
          >
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="glass rounded-xl p-4 flex flex-col items-center gap-1 border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors duration-300"
              >
                <stat.icon className="w-4 h-4 text-[var(--accent)] mb-1" aria-hidden="true" />
                <span className="text-xl font-bold text-[var(--foreground)] tracking-tight">
                  {stat.value}
                </span>
                <span className="text-[10px] text-[var(--muted-foreground)] text-center leading-tight">
                  {stat.label}
                </span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 px-4 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-[var(--accent)] mb-3 block">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight text-balance">
              From URL to Test Suite in Seconds
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop) */}
            <div
              className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-[var(--accent)]/30 via-[var(--primary)]/30 to-[var(--accent)]/30"
              aria-hidden="true"
            />

            {HOW_IT_WORKS.map((step, i) => (
              <Reveal key={step.step} delay={i * 0.12}>
                <div className="glass rounded-2xl p-6 border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all duration-300 flex flex-col gap-4 h-full">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${step.iconBg}`}
                    >
                      <step.icon className={`w-5 h-5 ${step.iconColor}`} aria-hidden="true" />
                    </div>
                    <span className="text-3xl font-black text-[var(--border)] font-mono leading-none">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[var(--foreground)]">{step.title}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-4 bg-[var(--card)]/30">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-[var(--primary-light)] mb-3 block">
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight text-balance">
              Everything Your QA Team Needs
            </h2>
            <p className="mt-3 text-[var(--muted-foreground)] text-base max-w-xl mx-auto">
              From URL analysis to downloadable test scripts and Excel sheets.
            </p>
          </Reveal>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                className={`glass rounded-2xl p-6 border border-[var(--border)] transition-all duration-300 flex flex-col gap-4 ${feature.borderHover} hover:shadow-[0_4px_24px_rgba(124,58,237,0.12)]`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${feature.colorClass}`}
                >
                  <feature.icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Frameworks ── */}
      <section className="py-24 px-4 border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-12">
            <span className="text-xs font-semibold tracking-widest uppercase text-[var(--accent)] mb-3 block">
              Frameworks
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight text-balance">
              Generate Scripts for Any Framework
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex flex-wrap justify-center gap-4">
              {FRAMEWORKS.filter((f) => f.value !== "all").map((fw) => (
                <div
                  key={fw.value}
                  className="glass rounded-2xl px-8 py-5 border border-[var(--border)] flex flex-col items-center gap-2 min-w-[140px] hover:border-[var(--primary)]/40 transition-all duration-300 hover:scale-[1.03]"
                >
                  <Terminal
                    className="w-6 h-6"
                    style={{ color: fw.color }}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {fw.label}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                    {fw.value === "playwright"
                      ? "TypeScript"
                      : fw.value === "cypress"
                      ? "JavaScript"
                      : "Python"}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4 border-t border-[var(--border)] bg-gradient-to-b from-transparent to-[var(--card)]/40">
        <div className="max-w-2xl mx-auto text-center">
          <Reveal>
            <div className="glass rounded-3xl p-10 border border-[var(--primary)]/20 relative overflow-hidden">
              {/* Glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                aria-hidden="true"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[var(--primary)] opacity-10 blur-3xl rounded-full" />
              </div>
              <div className="relative z-10 flex flex-col items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/20 flex items-center justify-center glow-primary">
                  <Sparkles className="w-7 h-7 text-[var(--primary-light)]" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight text-balance">
                  Ready to Automate Your QA?
                </h2>
                <p className="text-[var(--muted-foreground)] text-sm leading-relaxed max-w-md">
                  Join teams using AI to ship faster with confidence. Start testing any website in seconds.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
                  <Link
                    href="/chat-home-main-agent-chat-interface"
                    className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-semibold text-sm transition-all duration-300 hover:bg-[var(--primary-light)] glow-primary hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <Play className="w-4 h-4" aria-hidden="true" />
                    Launch QA Agent
                    <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] font-medium text-sm transition-all duration-300 hover:border-[var(--primary)]/50 hover:text-[var(--foreground)] hover:bg-white/5"
                  >
                    Configure Settings
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

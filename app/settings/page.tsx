"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Save, RotateCcw, Key, Bot, Settings, CheckCircle, AlertCircle, Copy, Terminal, Shield, Sparkles, Trash2, Info } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/utils";
import {
  DEFAULT_AGENT_PROMPT,
  APP_NAME,
  FRAMEWORKS,
  type Framework,
} from "@/lib/data";
import { fadeInUp, staggerContainer } from "@/lib/motion";

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  API_KEY: "qa_agent_api_key",
  API_MODE: "qa_agent_api_mode",
  PROMPT: "qa_agent_system_prompt",
  FRAMEWORKS: "qa_agent_frameworks",
  HISTORY: "qa_agent_history",
} as const;

const PROMPT_PRESETS = [
  {
    id: "default",
    label: "Default QA",
    prompt: DEFAULT_AGENT_PROMPT,
  },
  {
    id: "minimal",
    label: "Minimal",
    prompt:
      "You are a concise QA analyst. When given a URL, produce a numbered list of test cases covering the main user flows. Each test case should include: ID, description, steps, and expected result. Keep responses brief and actionable.",
  },
  {
    id: "security",
    label: "Security",
    prompt:
      "You are a security-focused QA engineer. When given a URL, analyze it for security vulnerabilities including: XSS, CSRF, SQL injection, authentication flaws, insecure direct object references, and OWASP Top 10 risks. Generate security test cases and Playwright scripts that probe these attack surfaces.",
  },
  {
    id: "accessibility",
    label: "Accessibility",
    prompt:
      "You are an accessibility QA specialist. When given a URL, generate comprehensive accessibility test cases covering WCAG 2.1 AA compliance: keyboard navigation, screen reader compatibility, color contrast, focus management, ARIA labels, semantic HTML, and form accessibility.",
  },
  {
    id: "performance",
    label: "Performance",
    prompt:
      "You are a performance QA engineer. When given a URL, generate test cases focused on: Core Web Vitals (LCP, FID, CLS), page load times, resource optimization, caching strategies, and performance regressions. Write Playwright scripts that measure and assert on performance metrics.",
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────

type ApiMode = "env" | "runtime";
type SaveStatus = "idle" | "saved" | "error";
type DangerAction = "history" | "reset" | null;

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass rounded-xl p-6 border border-[var(--border)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  iconColor,
}: {
  icon: React.ElementType;
  title: string;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          iconColor ?? "bg-[var(--primary)]/20"
        )}
      >
        <Icon
          className={cn(
            "w-4 h-4",
            iconColor ? "text-[var(--destructive)]" : "text-[var(--primary-light)]"
          )}
        />
      </div>
      <h2 className="text-base font-semibold text-[var(--foreground)] tracking-tight">
        {title}
      </h2>
    </div>
  );
}

function StatusBadge({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
        status === "saved"
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-[var(--destructive)]/15 text-[var(--destructive)]"
      )}
    >
      {status === "saved" ? (
        <CheckCircle className="w-3 h-3" />
      ) : (
        <AlertCircle className="w-3 h-3" />
      )}
      {status === "saved" ? "Saved" : "Error"}
    </motion.span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  // ── API Key state ──
  const [apiMode, setApiMode] = useState<ApiMode>("env");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [apiStatus, setApiStatus] = useState<SaveStatus>("idle");

  // ── Prompt state ──
  const [prompt, setPrompt] = useState(DEFAULT_AGENT_PROMPT);
  const [promptStatus, setPromptStatus] = useState<SaveStatus>("idle");
  const [promptCharCount, setPromptCharCount] = useState(
    DEFAULT_AGENT_PROMPT.length
  );

  // ── Framework state ──
  const [selectedFrameworks, setSelectedFrameworks] = useState<Framework[]>([
    "playwright",
  ]);
  const [frameworkStatus, setFrameworkStatus] = useState<SaveStatus>("idle");

  // ── Danger zone state ──
  const [dangerAction, setDangerAction] = useState<DangerAction>(null);

  // ── Load from localStorage ──
  useEffect(() => {
    try {
      const storedMode = localStorage.getItem(STORAGE_KEYS.API_MODE) as ApiMode | null;
      if (storedMode) setApiMode(storedMode);

      const storedKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
      if (storedKey) setApiKey(storedKey);

      const storedPrompt = localStorage.getItem(STORAGE_KEYS.PROMPT);
      if (storedPrompt) {
        setPrompt(storedPrompt);
        setPromptCharCount(storedPrompt.length);
      }

      const storedFrameworks = localStorage.getItem(STORAGE_KEYS.FRAMEWORKS);
      if (storedFrameworks) {
        const parsed = JSON.parse(storedFrameworks) as Framework[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedFrameworks(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // ── Auto-clear status badges ──
  useEffect(() => {
    if (apiStatus !== "idle") {
      const t = setTimeout(() => setApiStatus("idle"), 2500);
      return () => clearTimeout(t);
    }
  }, [apiStatus]);

  useEffect(() => {
    if (promptStatus !== "idle") {
      const t = setTimeout(() => setPromptStatus("idle"), 2500);
      return () => clearTimeout(t);
    }
  }, [promptStatus]);

  useEffect(() => {
    if (frameworkStatus !== "idle") {
      const t = setTimeout(() => setFrameworkStatus("idle"), 2500);
      return () => clearTimeout(t);
    }
  }, [frameworkStatus]);

  // ── Handlers ──
  const handleSaveApiKey = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.API_MODE, apiMode);
      if (apiMode === "runtime" && apiKey.trim()) {
        localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey.trim());
      } else if (apiMode === "env") {
        localStorage.removeItem(STORAGE_KEYS.API_KEY);
      }
      setApiStatus("saved");
    } catch {
      setApiStatus("error");
    }
  }, [apiMode, apiKey]);

  const handleSavePrompt = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROMPT, prompt);
      setPromptStatus("saved");
    } catch {
      setPromptStatus("error");
    }
  }, [prompt]);

  const handleResetPrompt = useCallback(() => {
    setPrompt(DEFAULT_AGENT_PROMPT);
    setPromptCharCount(DEFAULT_AGENT_PROMPT.length);
    try {
      localStorage.removeItem(STORAGE_KEYS.PROMPT);
    } catch {
      // ignore
    }
  }, []);

  const handleSaveFrameworks = useCallback(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.FRAMEWORKS,
        JSON.stringify(selectedFrameworks)
      );
      setFrameworkStatus("saved");
    } catch {
      setFrameworkStatus("error");
    }
  }, [selectedFrameworks]);

  const toggleFramework = useCallback((fw: Framework) => {
    setSelectedFrameworks((prev) =>
      prev.includes(fw)
        ? prev.length > 1
          ? prev.filter((f) => f !== fw)
          : prev
        : [...prev, fw]
    );
  }, []);

  const handleDangerConfirm = useCallback(() => {
    try {
      if (dangerAction === "history") {
        localStorage.removeItem(STORAGE_KEYS.HISTORY);
      } else if (dangerAction === "reset") {
        Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
        setApiKey("");
        setApiMode("env");
        setPrompt(DEFAULT_AGENT_PROMPT);
        setPromptCharCount(DEFAULT_AGENT_PROMPT.length);
        setSelectedFrameworks(["playwright"]);
      }
    } catch {
      // ignore
    } finally {
      setDangerAction(null);
    }
  }, [dangerAction]);

  const handleCopyPrompt = useCallback(() => {
    navigator.clipboard.writeText(prompt).catch(() => {});
  }, [prompt]);

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Page header */}
        <Reveal>
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center">
                <Settings className="w-5 h-5 text-[var(--primary-light)]" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
                Settings
              </h1>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] ml-12">
              Configure your {APP_NAME} — API access, agent behavior, and framework preferences.
            </p>
          </div>
        </Reveal>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6"
        >
          {/* ── API Key Section ── */}
          <Reveal>
            <SectionCard>
              <SectionHeader icon={Key} title="API Key Configuration" />

              {/* Mode toggle */}
              <div className="flex gap-2 mb-5">
                {([
                  { value: "env", label: "Environment Variable", icon: Shield },
                  { value: "runtime", label: "Runtime Key", icon: Key },
                ] as const).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setApiMode(value)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
                      apiMode === value
                        ? "bg-[var(--primary)]/20 border-[var(--primary)]/40 text-[var(--primary-light)]"
                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border)]/80"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {apiMode === "env" ? (
                <div className="rounded-lg bg-[var(--accent)]/8 border border-[var(--accent)]/20 p-4 flex gap-3">
                  <Info className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--accent)] mb-1">
                      Using environment variable
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                      Set <code className="font-mono text-[var(--primary-light)] bg-[var(--primary)]/10 px-1 rounded">ANTHROPIC_API_KEY</code> in your{" "}
                      <code className="font-mono text-[var(--primary-light)] bg-[var(--primary)]/10 px-1 rounded">.env.local</code> file.
                      The AI model is configured and ready to use.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-ant-..."
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2.5 pr-10 text-sm font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:border-[var(--primary)]/60 transition-colors duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                      aria-label={showKey ? "Hide key" : "Show key"}
                    >
                      {showKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Your key is stored only in your browser's local storage and never sent to our servers.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 mt-5">
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white text-sm font-medium transition-all duration-200"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
                <StatusBadge status={apiStatus} />
              </div>
            </SectionCard>
          </Reveal>

          {/* ── AI Model Info ── */}
          <Reveal>
            <SectionCard>
              <SectionHeader icon={Sparkles} title="AI Model" />
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--primary)]/8 border border-[var(--primary)]/20">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-[var(--primary-light)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    AI Model configured
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    The agent uses a state-of-the-art large language model optimized for code generation and QA analysis.
                  </p>
                </div>
                <div className="ml-auto flex-shrink-0">
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    Active
                  </span>
                </div>
              </div>
            </SectionCard>
          </Reveal>

          {/* ── Agent System Prompt ── */}
          <Reveal>
            <SectionCard>
              <SectionHeader icon={Bot} title="Agent System Prompt" />

              {/* Preset chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {PROMPT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setPrompt(preset.prompt);
                      setPromptCharCount(preset.prompt.length);
                    }}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200",
                      prompt === preset.prompt
                        ? "bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border)]/80"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    setPromptCharCount(e.target.value.length);
                  }}
                  rows={14}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:border-[var(--primary)]/60 transition-colors duration-200 resize-y leading-relaxed"
                  placeholder="Enter your custom system prompt..."
                />
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="absolute top-3 right-3 p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
                  aria-label="Copy prompt"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1.5 text-right">
                {promptCharCount.toLocaleString("en-US")} characters
              </p>

              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleSavePrompt}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white text-sm font-medium transition-all duration-200"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Prompt
                </button>
                <button
                  type="button"
                  onClick={handleResetPrompt}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border)]/80 text-sm font-medium transition-all duration-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
                <StatusBadge status={promptStatus} />
              </div>
            </SectionCard>
          </Reveal>

          {/* ── Framework Preferences ── */}
          <Reveal>
            <SectionCard>
              <SectionHeader icon={Terminal} title="Framework Preferences" />
              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                Select which test frameworks the agent should generate scripts for by default.
              </p>
              <div className="flex flex-wrap gap-2 mb-5">
                {FRAMEWORKS.map((fw) => {
                  const active = selectedFrameworks.includes(fw.value);
                  return (
                    <button
                      key={fw.value}
                      type="button"
                      onClick={() => toggleFramework(fw.value)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200",
                        active
                          ? "border-transparent text-[var(--background)]"
                          : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      )}
                      style={active ? { backgroundColor: fw.color } : {}}
                    >
                      {fw.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveFrameworks}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white text-sm font-medium transition-all duration-200"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Preferences
                </button>
                <StatusBadge status={frameworkStatus} />
              </div>
            </SectionCard>
          </Reveal>

          {/* ── Danger Zone ── */}
          <Reveal>
            <SectionCard className="border-[var(--destructive)]/30">
              <SectionHeader
                icon={Trash2}
                title="Danger Zone"
                iconColor="bg-[var(--destructive)]/15"
              />

              <div className="flex flex-col gap-4">
                {/* Clear history */}
                <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-[var(--border)] bg-[var(--background)]/50">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      Clear Chat History
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      Delete all past chat sessions. This cannot be undone.
                    </p>
                  </div>
                  {dangerAction === "history" ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={handleDangerConfirm}
                        className="px-3 py-1.5 rounded-lg bg-[var(--destructive)] text-white text-xs font-medium hover:bg-[var(--destructive)]/90 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDangerAction(null)}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] text-xs font-medium hover:text-[var(--foreground)] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDangerAction("history")}
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-[var(--destructive)]/40 text-[var(--destructive)] text-xs font-medium hover:bg-[var(--destructive)]/10 transition-all duration-200"
                    >
                      Clear History
                    </button>
                  )}
                </div>

                {/* Reset all */}
                <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-[var(--border)] bg-[var(--background)]/50">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      Reset All Settings
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      Restore all settings to defaults including API key and prompts.
                    </p>
                  </div>
                  {dangerAction === "reset" ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={handleDangerConfirm}
                        className="px-3 py-1.5 rounded-lg bg-[var(--destructive)] text-white text-xs font-medium hover:bg-[var(--destructive)]/90 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDangerAction(null)}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] text-xs font-medium hover:text-[var(--foreground)] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDangerAction("reset")}
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-[var(--destructive)]/40 text-[var(--destructive)] text-xs font-medium hover:bg-[var(--destructive)]/10 transition-all duration-200"
                    >
                      Reset All
                    </button>
                  )}
                </div>
              </div>
            </SectionCard>
          </Reveal>
        </motion.div>
      </div>
    </div>
  );
}

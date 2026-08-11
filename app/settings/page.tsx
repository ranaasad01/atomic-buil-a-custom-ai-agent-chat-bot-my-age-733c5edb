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

const MODEL_DISPLAY = "Claude 3.5 Sonnet";
const MODEL_ID = "claude-3-5-sonnet-20241022";

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
          : "bg-red-500/15 text-red-400"
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  // API Key
  const [apiMode, setApiMode] = useState<ApiMode>("env");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [apiSaveStatus, setApiSaveStatus] = useState<SaveStatus>("idle");
  const [copied, setCopied] = useState(false);

  // Agent Prompt
  const [agentPrompt, setAgentPrompt] = useState(DEFAULT_AGENT_PROMPT);
  const [promptSaveStatus, setPromptSaveStatus] = useState<SaveStatus>("idle");
  const [promptDirty, setPromptDirty] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>("default");

  // Frameworks
  const [selectedFrameworks, setSelectedFrameworks] = useState<Framework[]>(["all"]);
  const [frameworkSaveStatus, setFrameworkSaveStatus] = useState<SaveStatus>("idle");

  // Danger Zone
  const [dangerConfirm, setDangerConfirm] = useState<DangerAction>(null);

  // ─── Load from localStorage ───────────────────────────────────────────────

  useEffect(() => {
    const storedMode = localStorage.getItem(STORAGE_KEYS.API_MODE) as ApiMode | null;
    if (storedMode === "env" || storedMode === "runtime") setApiMode(storedMode);

    const storedKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    if (storedKey) setApiKey(storedKey);

    const storedPrompt = localStorage.getItem(STORAGE_KEYS.PROMPT);
    if (storedPrompt) {
      setAgentPrompt(storedPrompt);
      setActivePreset(null);
    }

    const storedFw = localStorage.getItem(STORAGE_KEYS.FRAMEWORKS);
    if (storedFw) {
      try {
        const parsed = JSON.parse(storedFw) as Framework[];
        if (Array.isArray(parsed) && parsed.length > 0) setSelectedFrameworks(parsed);
      } catch {
        setSelectedFrameworks(["all"]);
      }
    }
  }, []);

  // ─── Auto-clear status ────────────────────────────────────────────────────

  const withAutoClear = useCallback(
    (setter: (s: SaveStatus) => void, status: SaveStatus) => {
      setter(status);
      setTimeout(() => setter("idle"), 2500);
    },
    []
  );

  // ─── API Key handlers ─────────────────────────────────────────────────────

  const handleSaveApiKey = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
      localStorage.setItem(STORAGE_KEYS.API_MODE, apiMode);
      withAutoClear(setApiSaveStatus, "saved");
    } catch {
      withAutoClear(setApiSaveStatus, "error");
    }
  }, [apiKey, apiMode, withAutoClear]);

  const handleCopyKey = useCallback(() => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [apiKey]);

  // ─── Prompt handlers ──────────────────────────────────────────────────────

  const handlePromptChange = useCallback((val: string) => {
    setAgentPrompt(val);
    setPromptDirty(true);
    setActivePreset(null);
  }, []);

  const handleSelectPreset = useCallback((preset: (typeof PROMPT_PRESETS)[number]) => {
    setAgentPrompt(preset.prompt);
    setActivePreset(preset.id);
    setPromptDirty(true);
  }, []);

  const handleSavePrompt = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROMPT, agentPrompt);
      setPromptDirty(false);
      withAutoClear(setPromptSaveStatus, "saved");
    } catch {
      withAutoClear(setPromptSaveStatus, "error");
    }
  }, [agentPrompt, withAutoClear]);

  const handleResetPrompt = useCallback(() => {
    setAgentPrompt(DEFAULT_AGENT_PROMPT);
    setActivePreset("default");
    setPromptDirty(false);
    try {
      localStorage.setItem(STORAGE_KEYS.PROMPT, DEFAULT_AGENT_PROMPT);
      withAutoClear(setPromptSaveStatus, "saved");
    } catch {
      withAutoClear(setPromptSaveStatus, "error");
    }
  }, [withAutoClear]);

  // ─── Framework handlers ───────────────────────────────────────────────────

  const handleFrameworkToggle = useCallback((fw: Framework) => {
    setSelectedFrameworks((prev) => {
      if (fw === "all") return ["all"];
      const withoutAll = prev.filter((f) => f !== "all");
      if (withoutAll.includes(fw)) {
        const next = withoutAll.filter((f) => f !== fw);
        return next.length === 0 ? ["all"] : next;
      }
      return [...withoutAll, fw];
    });
  }, []);

  const handleSaveFrameworks = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FRAMEWORKS, JSON.stringify(selectedFrameworks));
      withAutoClear(setFrameworkSaveStatus, "saved");
    } catch {
      withAutoClear(setFrameworkSaveStatus, "error");
    }
  }, [selectedFrameworks, withAutoClear]);

  // ─── Danger Zone handlers ─────────────────────────────────────────────────

  const handleDangerConfirm = useCallback(() => {
    if (dangerConfirm === "history") {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
    } else if (dangerConfirm === "reset") {
      Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
      setApiMode("env");
      setApiKey("");
      setAgentPrompt(DEFAULT_AGENT_PROMPT);
      setSelectedFrameworks(["all"]);
      setActivePreset("default");
      setPromptDirty(false);
    }
    setDangerConfirm(null);
  }, [dangerConfirm]);

  // ─── Derived ──────────────────────────────────────────────────────────────

  const wordCount = agentPrompt.trim().split(/\s+/).filter(Boolean).length;
  const charCount = agentPrompt.length;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Page Header */}
      <Reveal>
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center">
              <Settings className="w-5 h-5 text-[var(--primary-light)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
              Settings
            </h1>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] ml-12">
            Configure your {APP_NAME}
          </p>
        </motion.div>
      </Reveal>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6"
      >
        {/* ── Section 1: API Configuration ─────────────────────────────── */}
        <motion.div variants={fadeInUp}>
          <SectionCard>
            <SectionHeader icon={Key} title="API Key Configuration" />

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-5">
              {(["env", "runtime"] as ApiMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setApiMode(mode)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 border",
                    apiMode === mode
                      ? "bg-[var(--primary)]/20 border-[var(--primary)]/50 text-[var(--primary-light)]"
                      : "bg-transparent border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/30"
                  )}
                >
                  {mode === "env" ? "Environment Variable" : "Runtime Key"}
                </button>
              ))}
            </div>

            {/* Env Mode */}
            {apiMode === "env" && (
              <div className="rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-4 flex gap-3">
                <Info className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)] mb-1">
                    Using Environment Variable
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                    Set{" "}
                    <code className="font-mono text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded">
                      ANTHROPIC_API_KEY
                    </code>{" "}
                    in your{" "}
                    <code className="font-mono text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded">
                      .env.local
                    </code>{" "}
                    file. The agent will pick it up automatically on the server side. No key is stored in the browser.
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">Recommended for production</span>
                  </div>
                </div>
              </div>
            )}

            {/* Runtime Mode */}
            {apiMode === "runtime" && (
              <div className="flex flex-col gap-3">
                <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                  Anthropic API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 pr-20 text-sm font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:border-[var(--primary)]/60 transition-colors duration-200"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {apiKey && (
                      <button
                        onClick={handleCopyKey}
                        title="Copy key"
                        className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-colors duration-150"
                      >
                        {copied ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => setShowKey((v) => !v)}
                      title={showKey ? "Hide key" : "Show key"}
                      className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-colors duration-150"
                    >
                      {showKey ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <Shield className="w-3 h-3" />
                    Stored in browser localStorage only
                  </p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={apiSaveStatus} />
                    <button
                      onClick={handleSaveApiKey}
                      disabled={!apiKey.trim()}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                        apiKey.trim()
                          ? "bg-[var(--primary)] text-white hover:bg-[var(--primary)]/80"
                          : "bg-[var(--border)] text-[var(--muted-foreground)] cursor-not-allowed"
                      )}
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Key
                    </button>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </motion.div>

        {/* ── Section 2: Agent Prompt ───────────────────────────────────── */}
        <motion.div variants={fadeInUp}>
          <SectionCard>
            <SectionHeader icon={Bot} title="Agent System Prompt" />

            {/* Preset Selector */}
            <div className="mb-4">
              <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Quick Presets
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {PROMPT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={cn(
                      "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 whitespace-nowrap",
                      activePreset === preset.id
                        ? "bg-[var(--primary)]/20 border-[var(--primary)]/50 text-[var(--primary-light)]"
                        : "bg-transparent border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/30"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={agentPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              rows={12}
              className="w-full h-72 bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 text-sm font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:border-[var(--primary)]/60 resize-y transition-colors duration-200 leading-relaxed"
              placeholder="Enter your agent system prompt..."
              spellCheck={false}
            />

            {/* Stats + Actions */}
            <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
              <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                <span>
                  <span className="text-[var(--foreground)] font-medium">{charCount.toLocaleString("en-US")}</span>{" "}
                  chars
                </span>
                <span>
                  <span className="text-[var(--foreground)] font-medium">{wordCount.toLocaleString("en-US")}</span>{" "}
                  words
                </span>
                {promptDirty && (
                  <span className="text-amber-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                    Unsaved changes
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={promptSaveStatus} />
                <button
                  onClick={handleResetPrompt}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/30 transition-all duration-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
                <button
                  onClick={handleSavePrompt}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary)]/80 transition-all duration-200"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Prompt
                </button>
              </div>
            </div>
          </SectionCard>
        </motion.div>

        {/* ── Section 3: Framework Preferences ─────────────────────────── */}
        <motion.div variants={fadeInUp}>
          <SectionCard>
            <SectionHeader icon={Terminal} title="Test Framework Preferences" />

            <div className="flex flex-wrap gap-2 mb-5">
              {FRAMEWORKS.map((fw) => {
                const isSelected = selectedFrameworks.includes(fw.value);
                return (
                  <button
                    key={fw.value}
                    onClick={() => handleFrameworkToggle(fw.value)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200",
                      isSelected
                        ? "bg-[var(--accent)]/15 border-[var(--accent)]/50 text-[var(--accent)]"
                        : "bg-transparent border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/30"
                    )}
                  >
                    {fw.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--muted-foreground)]">
                Selected:{" "}
                <span className="text-[var(--foreground)] font-medium">
                  {selectedFrameworks.includes("all")
                    ? "All Frameworks"
                    : selectedFrameworks
                        .map((f) => FRAMEWORKS.find((fw) => fw.value === f)?.label ?? f)
                        .join(", ")}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <StatusBadge status={frameworkSaveStatus} />
                <button
                  onClick={handleSaveFrameworks}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary)]/80 transition-all duration-200"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </div>
          </SectionCard>
        </motion.div>

        {/* ── Section 4: Model Info ─────────────────────────────────────── */}
        <motion.div variants={fadeInUp}>
          <SectionCard>
            <SectionHeader icon={Sparkles} title="AI Model" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Model", value: MODEL_DISPLAY },
                { label: "Model ID", value: MODEL_ID },
                { label: "Provider", value: "Anthropic" },
                { label: "Context Window", value: "200K tokens" },
                { label: "Max Output", value: "8,192 tokens" },
                { label: "Vision", value: "Yes" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)]"
                >
                  <span className="text-xs text-[var(--muted-foreground)] font-medium">
                    {row.label}
                  </span>
                  <span className="text-xs font-mono text-[var(--foreground)] font-medium">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </motion.div>

        {/* ── Section 5: Danger Zone ────────────────────────────────────── */}
        <motion.div variants={fadeInUp}>
          <SectionCard className="border-[var(--destructive)]/30">
            <SectionHeader
              icon={Shield}
              title="Danger Zone"
              iconColor="bg-[var(--destructive)]/15"
            />

            <div className="flex flex-col gap-4">
              {/* Clear History */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-[var(--destructive)]/5 border border-[var(--destructive)]/15">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)] mb-0.5">
                    Clear Chat History
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                    Permanently removes all past chat sessions and test reports from local storage.
                  </p>
                </div>
                <div className="shrink-0">
                  {dangerConfirm === "history" ? (
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-xs text-[var(--destructive)] font-medium whitespace-nowrap">
                        Are you sure? This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDangerConfirm(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-150"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDangerConfirm}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--destructive)] text-white hover:bg-[var(--destructive)]/80 transition-colors duration-150"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDangerConfirm("history")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--destructive)]/40 text-[var(--destructive)] hover:bg-[var(--destructive)]/10 transition-all duration-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear History
                    </button>
                  )}
                </div>
              </div>

              {/* Reset All Settings */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-[var(--destructive)]/5 border border-[var(--destructive)]/15">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)] mb-0.5">
                    Reset All Settings
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                    Restores all settings to defaults, including API key, agent prompt, and framework preferences.
                  </p>
                </div>
                <div className="shrink-0">
                  {dangerConfirm === "reset" ? (
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-xs text-[var(--destructive)] font-medium whitespace-nowrap">
                        Are you sure? This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDangerConfirm(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-150"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDangerConfirm}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--destructive)] text-white hover:bg-[var(--destructive)]/80 transition-colors duration-150"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDangerConfirm("reset")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--destructive)]/40 text-[var(--destructive)] hover:bg-[var(--destructive)]/10 transition-all duration-200"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset All
                    </button>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        </motion.div>
      </motion.div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Globe, Download, FileText, Sparkles, X, Check, AlertCircle, Clock, Terminal, Plus, Copy, Code2, ChevronDown, Loader2, Bot, User, Trash2, Edit3 } from 'lucide-react';
import Link from "next/link";
import {
  APP_NAME,
  DEFAULT_AGENT_PROMPT,
  FRAMEWORKS,
  type ChatMessage,
  type ChatSession,
  type Framework,
  type AgentStatus,
} from "@/lib/data";
import { fadeInUp, scaleIn, modalOverlay, modalContent } from "@/lib/motion";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────

const MODEL_DISPLAY = "Claude 3.5 Sonnet";

const STORAGE_KEYS = {
  API_KEY: "qa_agent_api_key",
  AGENT_PROMPT: "qa_agent_prompt",
  SESSIONS: "qa_agent_sessions",
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
    prompt: `You are a concise QA analyst. When given a URL, produce a numbered list of test cases covering the main user flows. Each test case should include: ID, description, steps, and expected result. Keep responses brief and actionable.`,
  },
  {
    id: "security",
    label: "Security",
    prompt: `You are a security-focused QA engineer. When given a URL, analyze it for security vulnerabilities including: XSS, CSRF, SQL injection, authentication flaws, insecure direct object references, and OWASP Top 10 risks. Generate security test cases and Playwright scripts that probe these attack surfaces.`,
  },
  {
    id: "accessibility",
    label: "Accessibility",
    prompt: `You are an accessibility QA specialist. When given a URL, generate comprehensive accessibility test cases covering WCAG 2.1 AA compliance: keyboard navigation, screen reader compatibility, color contrast, focus management, ARIA labels, semantic HTML, and form accessibility.`,
  },
  {
    id: "performance",
    label: "Performance",
    prompt: `You are a performance QA engineer. When given a URL, generate test cases focused on: Core Web Vitals (LCP, FID, CLS), page load times, resource optimization, caching strategies, and performance regressions.`,
  },
];

const EXAMPLE_PROMPTS = [
  "Test the login flow and export test cases to Excel",
  "Generate Playwright scripts for the checkout process",
  "Check all forms for validation and error handling",
  "Run accessibility audit and generate WCAG test cases",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function isValidUrl(s: string): boolean {
  try {
    new URL(s.startsWith("http") ? s : `https://${s}`);
    return true;
  } catch {
    return false;
  }
}

function normalizeUrl(s: string): string {
  return s.startsWith("http") ? s : `https://${s}`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface ContentSegment {
  type: "text" | "code";
  content: string;
  language?: string;
}

function parseMessageContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "code", language: match[1] || "text", content: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", content: content.slice(lastIndex) });
  }

  return segments;
}

function hasTestCaseTable(content: string): boolean {
  return content.includes("| Test ID") || content.includes("|Test ID") || content.includes("| TC-");
}

function buildConversationHistory(
  messages: ChatMessage[]
): { role: "user" | "assistant"; content: string }[] {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

function getSessionTitle(messages: ChatMessage[], url?: string): string {
  if (url) {
    try {
      return new URL(url).hostname;
    } catch {
      return url.slice(0, 30);
    }
  }
  const first = messages.find((m) => m.role === "user");
  if (first) return first.content.slice(0, 40);
  return "New Session";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TextRenderer({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1 text-sm leading-relaxed text-[var(--foreground)]">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) {
          return (
            <p key={i} className="font-semibold text-[var(--accent)] mt-3 mb-1">
              {line.slice(4)}
            </p>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <p key={i} className="font-bold text-[var(--foreground)] text-base mt-4 mb-2">
              {line.slice(3)}
            </p>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <p key={i} className="font-bold text-[var(--foreground)] text-lg mt-4 mb-2">
              {line.slice(2)}
            </p>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <p key={i} className="flex gap-2 text-[var(--muted-foreground)]">
              <span className="text-[var(--accent)] mt-1 shrink-0">•</span>
              <span>{line.slice(2)}</span>
            </p>
          );
        }
        if (/^\d+\.\s/.test(line)) {
          const num = line.match(/^(\d+)\.\s(.*)/);
          if (num) {
            return (
              <p key={i} className="flex gap-2 text-[var(--muted-foreground)]">
                <span className="text-[var(--primary-light)] font-mono shrink-0">{num[1]}.</span>
                <span>{num[2]}</span>
              </p>
            );
          }
        }
        if (line.startsWith("|")) {
          return (
            <p key={i} className="font-mono text-xs text-[var(--muted-foreground)] overflow-x-auto">
              {line}
            </p>
          );
        }
        if (line.trim() === "") {
          return <div key={i} className="h-1" />;
        }
        // Inline bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="text-[var(--muted-foreground)]">
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j} className="text-[var(--foreground)] font-semibold">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                part
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

function CodeBlock({
  language,
  content,
  onCopy,
  copiedId,
  blockId,
}: {
  language: string;
  content: string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
  blockId: string;
}) {
  const isCopied = copiedId === blockId;

  const getExtension = () => {
    if (language === "typescript" || language === "ts") return "ts";
    if (language === "javascript" || language === "js") return "js";
    if (language === "python" || language === "py") return "py";
    return "txt";
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-script.${getExtension()}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const langLabel =
    language === "typescript"
      ? "TypeScript"
      : language === "javascript"
      ? "JavaScript"
      : language === "python"
      ? "Python"
      : language || "Code";

  return (
    <div
      className="rounded-xl overflow-hidden border border-[var(--border)] my-3"
      style={{ background: "#0d0d1a" }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-white/[0.03]">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="text-xs font-mono text-[var(--accent)] font-medium">{langLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onCopy(blockId, content)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/10 transition-all duration-200"
            aria-label="Copy code"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {isCopied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/10 transition-all duration-200"
            aria-label="Download script"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        </div>
      </div>
      {/* Code content */}
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
        <code
          className="font-mono text-[var(--foreground)]"
          style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
        >
          {content}
        </code>
      </pre>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatInterfacePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [selectedFramework, setSelectedFramework] = useState<Framework>("all");
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("ready");
  const [apiKey, setApiKey] = useState("");
  const [agentPrompt, setAgentPrompt] = useState(DEFAULT_AGENT_PROMPT);
  const [showEditPrompt, setShowEditPrompt] = useState(false);
  const [editPromptDraft, setEditPromptDraft] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFrameworkMenu, setShowFrameworkMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const frameworkMenuRef = useRef<HTMLDivElement>(null);

  // ── Mount: load from localStorage ──────────────────────────────────────────
  useEffect(() => {
    const storedKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    if (storedKey) setApiKey(storedKey);

    const storedPrompt = localStorage.getItem(STORAGE_KEYS.AGENT_PROMPT);
    if (storedPrompt) setAgentPrompt(storedPrompt);

    const storedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (storedSessions) {
      try {
        setSessions(JSON.parse(storedSessions));
      } catch {
        setSessions([]);
      }
    }

    setSessionId(uid());
  }, []);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Close framework menu on outside click ───────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (frameworkMenuRef.current && !frameworkMenuRef.current.contains(e.target as Node)) {
        setShowFrameworkMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Save session ────────────────────────────────────────────────────────────
  const saveSession = useCallback(
    (msgs: ChatMessage[]) => {
      if (msgs.length === 0) return;
      const session: ChatSession = {
        id: sessionId,
        title: getSessionTitle(msgs, urlInput || undefined),
        url: urlInput || undefined,
        messages: msgs,
        createdAt: msgs[0]?.timestamp ?? Date.now(),
        updatedAt: Date.now(),
        frameworks: [selectedFramework],
        agentPromptSnapshot: agentPrompt,
      };
      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== sessionId);
        const updated = [session, ...filtered].slice(0, 50);
        try {
          localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
        } catch {
          // storage full — ignore
        }
        return updated;
      });
    },
    [sessionId, urlInput, selectedFramework, agentPrompt]
  );

  // ── Copy to clipboard ───────────────────────────────────────────────────────
  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  // ── Export Excel ────────────────────────────────────────────────────────────
  const handleExportExcel = useCallback(
    async (content: string) => {
      try {
        const res = await fetch("/api/export-excel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, sessionId }),
        });
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `test-cases-${sessionId}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        setError("Failed to export Excel. Please try again.");
      }
    },
    [sessionId]
  );

  // ── New chat ────────────────────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    setMessages([]);
    setInput("");
    setUrlInput("");
    setError(null);
    setAgentStatus("ready");
    setSessionId(uid());
  }, []);

  // ── Load session ────────────────────────────────────────────────────────────
  const handleLoadSession = useCallback((session: ChatSession) => {
    setMessages(session.messages);
    setUrlInput(session.url ?? "");
    setSessionId(session.id);
    setError(null);
    setAgentStatus("ready");
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (overrideInput?: string) => {
      const text = overrideInput ?? input;
      if (!text.trim() && !urlInput.trim()) return;
      if (isStreaming) return;

      const userContent = [
        urlInput.trim() ? `URL: ${normalizeUrl(urlInput.trim())}` : "",
        text.trim(),
        selectedFramework !== "all"
          ? `Framework: ${FRAMEWORKS.find((f) => f.value === selectedFramework)?.label ?? selectedFramework}`
          : "Frameworks: Playwright, Cypress, and Selenium WebDriver",
      ]
        .filter(Boolean)
        .join("\n");

      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content: userContent,
        timestamp: Date.now(),
      };

      const assistantId = uid();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isStreaming: true,
      };

      const nextMessages = [...messages, userMsg, assistantMsg];
      setMessages(nextMessages);
      setInput("");
      setError(null);
      setIsStreaming(true);
      setAgentStatus("thinking");

      try {
        const conversationHistory = buildConversationHistory([...messages, userMsg]);

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: conversationHistory,
            systemPrompt: agentPrompt,
            apiKey: apiKey || undefined,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "Request failed" }));
          throw new Error(errData.error ?? `HTTP ${res.status}`);
        }

        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // Handle SSE format
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const delta =
                  parsed.delta?.text ??
                  parsed.choices?.[0]?.delta?.content ??
                  parsed.content?.[0]?.text ??
                  "";
                if (delta) {
                  accumulated += delta;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: accumulated, isStreaming: true }
                        : m
                    )
                  );
                }
              } catch {
                // Non-JSON line, try raw text
                if (data && data !== "[DONE]") {
                  accumulated += data;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: accumulated, isStreaming: true }
                        : m
                    )
                  );
                }
              }
            }
          }
        }

        const finalMessages = nextMessages.map((m) =>
          m.id === assistantId
            ? { ...m, content: accumulated, isStreaming: false }
            : m
        );
        setMessages(finalMessages);
        setAgentStatus("ready");
        saveSession(finalMessages);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        setError(errMsg);
        setAgentStatus("error");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `I encountered an error: ${errMsg}. Please check your API key in Settings and try again.`,
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [input, urlInput, messages, isStreaming, agentPrompt, apiKey, selectedFramework, saveSession]
  );

  // ── Textarea auto-resize ────────────────────────────────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  // ── Edit prompt modal ───────────────────────────────────────────────────────
  const openEditPrompt = () => {
    setEditPromptDraft(agentPrompt);
    setShowEditPrompt(true);
  };

  const saveEditPrompt = () => {
    setAgentPrompt(editPromptDraft);
    try {
      localStorage.setItem(STORAGE_KEYS.AGENT_PROMPT, editPromptDraft);
    } catch {
      // ignore
    }
    setShowEditPrompt(false);
  };

  const currentFrameworkLabel =
    FRAMEWORKS.find((f) => f.value === selectedFramework)?.label ?? "All Frameworks";

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className="flex overflow-hidden"
        style={{ height: "calc(100vh - 4rem)", background: "var(--background)" }}
      >
        {/* ── LEFT SIDEBAR ── */}
        <aside
          className="hidden md:flex flex-col w-64 shrink-0 border-r border-[var(--border)]"
          style={{ background: "rgba(26,26,46,0.7)", backdropFilter: "blur(16px)" }}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
              Sessions
            </span>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-[var(--foreground)] bg-[var(--primary)]/20 hover:bg-[var(--primary)]/40 border border-[var(--primary)]/30 transition-all duration-200"
              aria-label="New chat"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto py-2">
            {sessions.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Clock className="w-6 h-6 text-[var(--muted-foreground)] mx-auto mb-2 opacity-50" />
                <p className="text-xs text-[var(--muted-foreground)] opacity-60">
                  No sessions yet
                </p>
              </div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleLoadSession(session)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-[var(--border)]/50 hover:bg-white/5 transition-all duration-200 group",
                    session.id === sessionId && "bg-[var(--primary)]/10 border-l-2 border-l-[var(--primary)]"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        "text-xs font-medium truncate",
                        session.id === sessionId
                          ? "text-[var(--foreground)]"
                          : "text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]"
                      )}
                    >
                      {session.title}
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">
                      {formatRelativeTime(session.updatedAt)}
                    </span>
                  </div>
                  {session.frameworks && session.frameworks.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {session.frameworks.slice(0, 2).map((fw) => (
                        <span
                          key={fw}
                          className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-mono"
                        >
                          {fw}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Sidebar footer */}
          <div className="p-3 border-t border-[var(--border)]">
            <button
              onClick={openEditPrompt}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 border border-[var(--border)] transition-all duration-200"
            >
              <Edit3 className="w-3.5 h-3.5 text-[var(--primary-light)]" />
              Edit Agent Prompt
            </button>
          </div>
        </aside>

        {/* ── MAIN AREA ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <div
            className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0"
            style={{ background: "rgba(26,26,46,0.7)", backdropFilter: "blur(16px)" }}
          >
            {/* Left: Agent identity */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:flex flex-col leading-none">
                <span className="text-xs font-semibold text-[var(--foreground)]">QA Agent</span>
                <span className="text-[10px] font-mono text-[var(--accent)]">{MODEL_DISPLAY}</span>
              </div>
            </div>

            {/* Center: URL input */}
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/5 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors duration-200"
                />
              </div>
            </div>

            {/* Right: Framework selector + status */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Framework dropdown */}
              <div className="relative" ref={frameworkMenuRef}>
                <button
                  onClick={() => setShowFrameworkMenu((v) => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-white/5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/50 transition-all duration-200"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{currentFrameworkLabel}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {showFrameworkMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-[var(--border)] overflow-hidden z-50"
                      style={{ background: "rgba(26,26,46,0.98)", backdropFilter: "blur(16px)" }}
                    >
                      {FRAMEWORKS.map((fw) => (
                        <button
                          key={fw.value}
                          onClick={() => {
                            setSelectedFramework(fw.value);
                            setShowFrameworkMenu(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs transition-colors duration-150",
                            selectedFramework === fw.value
                              ? "text-[var(--accent)] bg-[var(--accent)]/10"
                              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5"
                          )}
                        >
                          {fw.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Status badge */}
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border",
                  agentStatus === "ready" &&
                    "bg-green-500/10 border-green-500/30 text-green-400",
                  agentStatus === "thinking" &&
                    "bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]",
                  agentStatus === "error" &&
                    "bg-red-500/10 border-red-500/30 text-red-400"
                )}
              >
                {agentStatus === "thinking" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : agentStatus === "error" ? (
                  <AlertCircle className="w-3 h-3" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                )}
                <span className="hidden sm:inline">
                  {agentStatus === "ready"
                    ? "Ready"
                    : agentStatus === "thinking"
                    ? "Thinking"
                    : "Error"}
                </span>
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {messages.length === 0 ? (
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="flex flex-col items-center justify-center h-full text-center gap-6 py-16"
              >
                <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/20 border border-[var(--primary)]/30 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-[var(--primary-light)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                    Start by entering a URL above
                  </h2>
                  <p className="text-sm text-[var(--muted-foreground)] max-w-sm">
                    Paste any live website URL and describe what you want to test. The agent will
                    analyze, generate scripts, and export test cases.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setInput(prompt)}
                      className="px-3 py-1.5 rounded-full text-xs bg-white/5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/10 transition-all duration-200"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    variants={fadeInUp}
                    initial="hidden"
                    animate="visible"
                    className={cn(
                      "flex gap-3",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* Assistant avatar */}
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}

                    {/* Message bubble */}
                    <div
                      className={cn(
                        "flex flex-col gap-2",
                        msg.role === "user" ? "max-w-[75%] items-end" : "max-w-[85%] items-start"
                      )}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--foreground)]">
                            QA Agent
                          </span>
                          <span className="text-[10px] font-mono text-[var(--accent)]">
                            {MODEL_DISPLAY}
                          </span>
                          <span className="text-[10px] text-[var(--muted-foreground)]">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      )}

                      <div
                        className={cn(
                          msg.role === "user"
                            ? "bg-[var(--primary)]/20 border border-[var(--primary)]/30 rounded-2xl rounded-tr-sm px-4 py-3"
                            : "glass rounded-2xl rounded-tl-sm px-4 py-4"
                        )}
                      >
                        {msg.role === "user" ? (
                          <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        ) : (
                          <div>
                            {parseMessageContent(msg.content).map((seg, idx) =>
                              seg.type === "code" ? (
                                <CodeBlock
                                  key={idx}
                                  language={seg.language ?? "text"}
                                  content={seg.content}
                                  onCopy={handleCopy}
                                  copiedId={copiedId}
                                  blockId={`${msg.id}-${idx}`}
                                />
                              ) : (
                                <TextRenderer key={idx} text={seg.content} />
                              )
                            )}
                            {msg.isStreaming && (
                              <span className="streaming-cursor" aria-hidden="true" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Assistant footer actions */}
                      {msg.role === "assistant" && !msg.isStreaming && msg.content && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleCopy(`all-${msg.id}`, msg.content)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-white/5 hover:bg-white/10 border border-[var(--border)] transition-all duration-200"
                          >
                            {copiedId === `all-${msg.id}` ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            {copiedId === `all-${msg.id}` ? "Copied" : "Copy All"}
                          </button>
                          {hasTestCaseTable(msg.content) && (
                            <button
                              onClick={() => handleExportExcel(msg.content)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 border border-[var(--accent)]/30 transition-all duration-200"
                            >
                              <FileText className="w-3 h-3" />
                              Export Excel
                            </button>
                          )}
                        </div>
                      )}

                      {/* User timestamp */}
                      {msg.role === "user" && (
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          {formatTime(msg.timestamp)}
                        </span>
                      )}
                    </div>

                    {/* User avatar */}
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/30 border border-[var(--primary)]/40 flex items-center justify-center shrink-0 mt-1">
                        <User className="w-4 h-4 text-[var(--primary-light)]" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div
            className="shrink-0 border-t border-[var(--border)] px-4 py-4"
            style={{ background: "rgba(26,26,46,0.85)", backdropFilter: "blur(16px)" }}
          >
            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="flex items-center gap-2 px-3 py-2 mb-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="hover:text-red-300 transition-colors"
                    aria-label="Dismiss error"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Textarea */}
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Describe what to test... (e.g. Test the login flow and export test cases to Excel)"
                  rows={2}
                  disabled={isStreaming}
                  className="w-full px-4 py-3 rounded-xl text-sm bg-white/5 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)]/60 resize-none transition-colors duration-200 disabled:opacity-50"
                  style={{ minHeight: "60px", maxHeight: "160px" }}
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-[var(--muted-foreground)] opacity-50">
                  Ctrl+Enter
                </span>
              </div>

              {/* Send button */}
              <button
                onClick={() => handleSubmit()}
                disabled={isStreaming || (!input.trim() && !urlInput.trim())}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shrink-0"
                aria-label="Send message"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{isStreaming ? "Thinking" : "Send"}</span>
              </button>
            </div>

            {/* Framework pills */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {FRAMEWORKS.map((fw) => (
                <button
                  key={fw.value}
                  onClick={() => setSelectedFramework(fw.value)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-mono border transition-all duration-200",
                    selectedFramework === fw.value
                      ? "bg-[var(--accent)]/20 border-[var(--accent)]/50 text-[var(--accent)]"
                      : "bg-white/5 border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/30 hover:text-[var(--foreground)]"
                  )}
                >
                  {fw.label}
                </button>
              ))}
              <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">
                {messages.length > 0 && `${Math.floor(messages.length / 2)} exchange${messages.length > 2 ? "s" : ""}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── EDIT AGENT PROMPT MODAL ── */}
      <AnimatePresence>
        {showEditPrompt && (
          <motion.div
            variants={modalOverlay}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-16 pb-8 overflow-y-auto"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowEditPrompt(false);
            }}
          >
            <motion.div
              variants={modalContent}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="glass w-full max-w-2xl rounded-2xl p-6 border border-[var(--border)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[var(--primary-light)]" />
                  <h2 className="text-base font-semibold text-[var(--foreground)]">
                    Edit Agent Prompt
                  </h2>
                </div>
                <button
                  onClick={() => setShowEditPrompt(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/10 transition-all duration-200"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preset buttons */}
              <div className="mb-4">
                <p className="text-xs text-[var(--muted-foreground)] mb-2 font-medium uppercase tracking-wider">
                  Quick Presets
                </p>
                <div className="flex flex-wrap gap-2">
                  {PROMPT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setEditPromptDraft(preset.prompt)}
                      className="px-3 py-1.5 rounded-lg text-xs border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/10 transition-all duration-200"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <textarea
                value={editPromptDraft}
                onChange={(e) => setEditPromptDraft(e.target.value)}
                className="w-full h-64 px-4 py-3 rounded-xl text-xs font-mono bg-white/5 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)]/60 resize-none transition-colors duration-200"
                placeholder="Enter your custom agent instructions..."
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              />

              {/* Modal footer */}
              <div className="flex items-center justify-between mt-4">
                <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
                  {editPromptDraft.length.toLocaleString("en-US")} characters
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditPromptDraft(DEFAULT_AGENT_PROMPT)}
                    className="px-3 py-1.5 rounded-lg text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-white/5 hover:bg-white/10 border border-[var(--border)] transition-all duration-200"
                  >
                    Reset to Default
                  </button>
                  <button
                    onClick={saveEditPrompt}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white transition-all duration-200"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

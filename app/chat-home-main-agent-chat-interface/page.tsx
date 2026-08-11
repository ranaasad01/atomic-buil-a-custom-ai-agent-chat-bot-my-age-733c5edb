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
    segments.push({
      type: "code",
      language: match[1] || "text",
      content: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", content: content.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", content }];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }, [code]);

  const handleDownload = useCallback(() => {
    const ext =
      language === "python" ? "py" : language === "typescript" ? "ts" : "js";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-script.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [code, language]);

  return (
    <div className="code-block my-3 rounded-xl overflow-hidden border border-[var(--border)]">
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--card)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="text-xs font-mono text-[var(--muted-foreground)]">
            {language || "code"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
            title="Download script"
          >
            <Download className="w-3 h-3" />
            <span>Download</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
          >
            {copied ? (
              <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Copied</span></>
            ) : (
              <><Copy className="w-3 h-3" /><span>Copy</span></>
            )}
          </button>
        </div>
      </div>
      <pre className="p-4 overflow-x-auto text-xs leading-relaxed text-[var(--foreground)] font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const segments = parseMessageContent(message.content);

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className={cn(
        "flex gap-3 group",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white",
          isUser
            ? "bg-[var(--primary)]"
            : "bg-gradient-to-br from-[var(--accent)]/30 to-[var(--primary)]/30 border border-[var(--border)]"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4 text-[var(--accent)]" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-[var(--primary)]/20 border border-[var(--primary)]/30 text-[var(--foreground)]"
            : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)]"
        )}
      >
        {message.isStreaming && segments.length === 1 && segments[0].type === "text" && segments[0].content === "" ? (
          <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        ) : (
          <div className="prose-dark text-sm">
            {segments.map((seg, i) =>
              seg.type === "code" ? (
                <CodeBlock key={i} code={seg.content} language={seg.language || ""} />
              ) : (
                <div
                  key={i}
                  className="whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: seg.content
                      .replace(/&/g, "&amp;")
                      .replace(/</g, "&lt;")
                      .replace(/>/g, "&gt;")
                      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\*(.+?)\*/g, "<em>$1</em>")
                      .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-[var(--accent)] mt-3 mb-1">$1</h3>')
                      .replace(/^## (.+)$/gm, '<h2 class="text-sm font-semibold text-[var(--primary-light)] mt-4 mb-1">$1</h2>')
                      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
                      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>'),
                  }}
                />
              )
            )}
            {message.isStreaming && (
              <span className="streaming-cursor" aria-hidden="true" />
            )}
          </div>
        )}
        <div
          className={cn(
            "text-[10px] mt-1.5",
            isUser
              ? "text-[var(--primary-light)]/60 text-right"
              : "text-[var(--muted-foreground)]/60"
          )}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  // ── State ──
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [selectedFramework, setSelectedFramework] = useState<Framework>("all");
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("ready");
  const [apiKey, setApiKey] = useState("");
  const [agentPrompt, setAgentPrompt] = useState(DEFAULT_AGENT_PROMPT);
  const [showEditPrompt, setShowEditPrompt] = useState(false);
  const [editPromptDraft, setEditPromptDraft] = useState("");
  const [promptSaved, setPromptSaved] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showExampleDropdown, setShowExampleDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Hydration guard ──
  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Load from localStorage ──
  useEffect(() => {
    if (!mounted) return;
    try {
      const storedKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
      if (storedKey) setApiKey(storedKey);
      const storedPrompt = localStorage.getItem(STORAGE_KEYS.AGENT_PROMPT);
      if (storedPrompt) setAgentPrompt(storedPrompt);
      const storedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (storedSessions) {
        const parsed = JSON.parse(storedSessions) as ChatSession[];
        setSessions(parsed);
        if (parsed.length > 0) setActiveSessionId(parsed[0].id);
      }
    } catch {
      // ignore
    }
  }, [mounted]);

  // ── Persist sessions ──
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch {
      // ignore
    }
  }, [sessions, mounted]);

  // ── Scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeSessionId]);

  // ── Active session ──
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  // ── New session ──
  const createNewSession = useCallback(() => {
    const session: ChatSession = {
      id: uid(),
      title: "New Session",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setUrlInput("");
    setInput("");
  }, []);

  // ── Delete session ──
  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
    },
    [activeSessionId]
  );

  // ── Export Excel ──
  const exportExcel = useCallback(async () => {
    if (!activeSession) return;
    try {
      const { utils, writeFile } = await import("xlsx");
      const testCases = [
        [
          "Test ID",
          "Test Suite",
          "Description",
          "Preconditions",
          "Steps",
          "Expected Result",
          "Actual Result",
          "Status",
          "Priority",
          "Assigned To",
        ],
        [
          "TC-001",
          "Smoke",
          "Verify page loads",
          "Browser open",
          "1. Navigate to URL\n2. Wait for load",
          "Page loads within 3s",
          "",
          "Pending",
          "High",
          "",
        ],
      ];
      const ws = utils.aoa_to_sheet(testCases);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Test Cases");
      writeFile(wb, `test-cases-${Date.now()}.xlsx`);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id ? { ...s, excelExported: true } : s
        )
      );
    } catch (err) {
      console.error("Excel export failed:", err);
    }
  }, [activeSession]);

  // ── Send message ──
  const sendMessage = useCallback(
    async (overrideContent?: string) => {
      const content = overrideContent ?? input.trim();
      if (!content || agentStatus === "thinking") return;

      let sessionId = activeSessionId;
      let currentSession: ChatSession;

      if (!sessionId) {
        const newSession: ChatSession = {
          id: uid(),
          title: content.slice(0, 40),
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          url: urlInput || undefined,
          frameworks: [selectedFramework],
        };
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        sessionId = newSession.id;
        currentSession = newSession;
      } else {
        currentSession = sessions.find((s) => s.id === sessionId)!;
      }

      const urlContext =
        urlInput && isValidUrl(urlInput)
          ? `\n\n[Target URL: ${normalizeUrl(urlInput)}]\n[Framework: ${selectedFramework}]`
          : "";

      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content: content + urlContext,
        timestamp: Date.now(),
      };

      const assistantMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isStreaming: true,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                messages: [...s.messages, userMsg, assistantMsg],
                updatedAt: Date.now(),
                title:
                  s.messages.length === 0
                    ? content.slice(0, 40)
                    : s.title,
              }
            : s
        )
      );

      setInput("");
      setAgentStatus("thinking");

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const allMessages = [
          ...currentSession.messages,
          userMsg,
        ].map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify({
            messages: allMessages,
            systemPrompt: agentPrompt,
            apiKey: apiKey || undefined,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const finalAccumulated = accumulated;
          setSessions((prev) =>
            prev.map((s) =>
              s.id === sessionId
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantMsg.id
                        ? { ...m, content: finalAccumulated, isStreaming: true }
                        : m
                    ),
                  }
                : s
            )
          );
        }

        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, isStreaming: false }
                      : m
                  ),
                  updatedAt: Date.now(),
                }
              : s
          )
        );
        setAgentStatus("ready");
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") {
          setAgentStatus("ready");
          return;
        }
        const message = err instanceof Error ? err.message : "Unknown error";
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === assistantMsg.id
                      ? {
                          ...m,
                          content: `Error: ${message}`,
                          isStreaming: false,
                        }
                      : m
                  ),
                }
              : s
          )
        );
        setAgentStatus("error");
        setTimeout(() => setAgentStatus("ready"), 3000);
      }
    },
    [input, activeSessionId, sessions, agentStatus, urlInput, selectedFramework, agentPrompt, apiKey]
  );

  // ── Keyboard handler ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage]
  );

  // ── Save prompt ──
  const savePrompt = useCallback(() => {
    setAgentPrompt(editPromptDraft);
    try {
      localStorage.setItem(STORAGE_KEYS.AGENT_PROMPT, editPromptDraft);
    } catch {
      // ignore
    }
    setPromptSaved(true);
    setTimeout(() => {
      setPromptSaved(false);
      setShowEditPrompt(false);
    }, 1200);
  }, [editPromptDraft]);

  if (!mounted) return null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Sidebar ── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex-shrink-0 overflow-hidden border-r border-[var(--border)] bg-[var(--card)]/60 backdrop-blur-sm flex flex-col"
          >
            <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
                Sessions
              </span>
              <button
                onClick={createNewSession}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-[var(--primary)]/20 text-[var(--primary-light)] hover:bg-[var(--primary)]/30 transition-all duration-200"
              >
                <Plus className="w-3 h-3" />
                New
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-[var(--muted-foreground)] text-xs">
                  No sessions yet
                </div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                      activeSessionId === session.id
                        ? "bg-[var(--primary)]/20 border border-[var(--primary)]/30"
                        : "hover:bg-white/5 border border-transparent"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--foreground)] truncate">
                          {session.title}
                        </p>
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                          {formatRelativeTime(session.updatedAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--muted-foreground)] hover:text-red-400 transition-all duration-200"
                        aria-label="Delete session"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {session.url && (
                      <p className="text-[10px] text-[var(--accent)]/70 truncate mt-0.5">
                        {session.url}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Edit Agent Prompt */}
            <div className="p-3 border-t border-[var(--border)]">
              <button
                onClick={() => {
                  setEditPromptDraft(agentPrompt);
                  setShowEditPrompt(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200 border border-[var(--border)]"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Agent Prompt
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--card)]/40 backdrop-blur-sm flex-shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
            aria-label="Toggle sidebar"
          >
            <Terminal className="w-4 h-4" />
          </button>

          {/* URL input */}
          <div className="flex-1 flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 focus-within:border-[var(--accent)]/50 transition-colors duration-200">
            <Globe className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com — paste URL to test"
              className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none min-w-0"
            />
            {urlInput && isValidUrl(urlInput) && (
              <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            )}
          </div>

          {/* Framework selector */}
          <div className="flex items-center gap-1">
            {FRAMEWORKS.map((fw) => (
              <button
                key={fw.value}
                onClick={() => setSelectedFramework(fw.value)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200",
                  selectedFramework === fw.value
                    ? "bg-[var(--primary)]/30 text-[var(--primary-light)] border border-[var(--primary)]/40"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 border border-transparent"
                )}
              >
                {fw.label}
              </button>
            ))}
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                agentStatus === "ready" && "bg-green-400",
                agentStatus === "thinking" && "bg-[var(--accent)] animate-pulse",
                agentStatus === "error" && "bg-red-400"
              )}
            />
            <span className="text-xs text-[var(--muted-foreground)] hidden sm:block">
              {agentStatus === "ready" && "Ready"}
              {agentStatus === "thinking" && "Thinking..."}
              {agentStatus === "error" && "Error"}
            </span>
          </div>

          {/* Export Excel */}
          {activeSession && activeSession.messages.length > 0 && (
            <button
              onClick={exportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 transition-all duration-200"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Export Excel</span>
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeSession || activeSession.messages.length === 0 ? (
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center justify-center h-full gap-6 text-center"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)]/30 to-[var(--accent)]/20 border border-[var(--border)] flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-[var(--accent)]" />
                </div>
                <div className="absolute -inset-2 rounded-2xl bg-[var(--primary)] opacity-10 blur-xl" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">
                  {APP_NAME}
                </h2>
                <p className="text-sm text-[var(--muted-foreground)] max-w-sm">
                  Paste a URL above and describe what to test. I&apos;ll generate test cases, automation scripts, and Excel sheets.
                </p>
              </div>

              {/* Example prompts */}
              <div className="relative">
                <button
                  onClick={() => setShowExampleDropdown((v) => !v)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/40 transition-all duration-200"
                >
                  <span>Try an example</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <AnimatePresence>
                  {showExampleDropdown && (
                    <motion.div
                      variants={scaleIn}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute top-full mt-2 left-0 right-0 bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xl z-10"
                    >
                      {EXAMPLE_PROMPTS.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setShowExampleDropdown(false);
                            void sendMessage(prompt);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200 border-b border-[var(--border)] last:border-0"
                        >
                          {prompt}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <>
              {activeSession.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 p-4 border-t border-[var(--border)] bg-[var(--card)]/40 backdrop-blur-sm">
          <div className="flex items-end gap-3">
            <div className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-xl focus-within:border-[var(--accent)]/50 transition-colors duration-200 overflow-hidden">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what to test, or ask for specific scripts..."
                rows={1}
                className="w-full bg-transparent px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none resize-none leading-relaxed"
                style={{ maxHeight: "120px", overflowY: "auto" }}
                disabled={agentStatus === "thinking"}
              />
            </div>
            <button
              onClick={() => void sendMessage()}
              disabled={!input.trim() || agentStatus === "thinking"}
              className={cn(
                "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                input.trim() && agentStatus !== "thinking"
                  ? "bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white glow-primary"
                  : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] cursor-not-allowed"
              )}
              aria-label="Send message"
            >
              {agentStatus === "thinking" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]/50 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* ── Edit Agent Prompt Modal ── */}
      <AnimatePresence>
        {showEditPrompt && (
          <>
            <motion.div
              variants={modalOverlay}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowEditPrompt(false)}
            />
            <motion.div
              variants={modalContent}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-2xl mx-auto bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[var(--accent)]" />
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    Edit Agent Prompt
                  </h2>
                </div>
                <button
                  onClick={() => setShowEditPrompt(false)}
                  className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Presets */}
              <div className="px-5 py-3 border-b border-[var(--border)] flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[var(--muted-foreground)]">Presets:</span>
                {PROMPT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setEditPromptDraft(preset.prompt)}
                    className="px-2.5 py-1 rounded-md text-xs border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/40 transition-all duration-200"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                <textarea
                  value={editPromptDraft}
                  onChange={(e) => setEditPromptDraft(e.target.value)}
                  rows={12}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none resize-none font-mono leading-relaxed focus:border-[var(--accent)]/50 transition-colors duration-200"
                  placeholder="Enter agent system prompt..."
                />
              </div>

              <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)]">
                <button
                  onClick={() => setEditPromptDraft(DEFAULT_AGENT_PROMPT)}
                  className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200"
                >
                  Reset to default
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEditPrompt(false)}
                    className="px-4 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 border border-[var(--border)] transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={savePrompt}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white transition-all duration-200"
                  >
                    {promptSaved ? (
                      <><Check className="w-3.5 h-3.5" /> Saved!</>
                    ) : (
                      "Save Prompt"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

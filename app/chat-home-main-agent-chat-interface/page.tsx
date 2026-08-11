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

  return segments.filter((s) => s.content.trim().length > 0);
}

function renderTextContent(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (listItems.length === 0) return;
    if (listType === "ul") {
      nodes.push(
        <ul key={nodes.length} className="list-disc pl-5 mb-2 space-y-0.5">
          {listItems.map((item, i) => (
            <li key={i} className="text-[var(--foreground)]/85 text-sm">{item}</li>
          ))}
        </ul>
      );
    } else {
      nodes.push(
        <ol key={nodes.length} className="list-decimal pl-5 mb-2 space-y-0.5">
          {listItems.map((item, i) => (
            <li key={i} className="text-[var(--foreground)]/85 text-sm">{item}</li>
          ))}
        </ol>
      );
    }
    listItems = [];
    listType = null;
  };

  lines.forEach((line, i) => {
    const ulMatch = line.match(/^[-*]\s+(.+)/);
    const olMatch = line.match(/^\d+\.\s+(.+)/);
    const h2Match = line.match(/^##\s+(.+)/);
    const h3Match = line.match(/^###\s+(.+)/);
    const boldMatch = line.match(/^\*\*(.+)\*\*$/);

    if (ulMatch) {
      if (listType === "ol") flushList();
      listType = "ul";
      listItems.push(ulMatch[1]);
    } else if (olMatch) {
      if (listType === "ul") flushList();
      listType = "ol";
      listItems.push(olMatch[1]);
    } else {
      flushList();
      if (h2Match) {
        nodes.push(<h2 key={i} className="text-base font-semibold text-[var(--primary-light)] mt-3 mb-1">{h2Match[1]}</h2>);
      } else if (h3Match) {
        nodes.push(<h3 key={i} className="text-sm font-semibold text-[var(--accent)] mt-2 mb-1">{h3Match[1]}</h3>);
      } else if (boldMatch) {
        nodes.push(<p key={i} className="font-semibold text-[var(--foreground)] text-sm mb-1">{boldMatch[1]}</p>);
      } else if (line.trim() === "") {
        nodes.push(<div key={i} className="h-2" />);
      } else {
        nodes.push(<p key={i} className="text-[var(--foreground)]/85 text-sm mb-1 leading-relaxed">{line}</p>);
      }
    }
  });

  flushList();
  return nodes;
}

// ─── Code Block Component ─────────────────────────────────────────────────────

function CodeBlock({ language, content }: { language: string; content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }, [content]);

  const handleDownload = useCallback(() => {
    const ext = language === "python" ? "py" : language === "typescript" ? "ts" : "js";
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-script.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [content, language]);

  return (
    <div className="code-block my-3 rounded-lg overflow-hidden border border-[var(--border)]">
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--card)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-[var(--accent)]" aria-hidden="true" />
          <span className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-wider">
            {language || "code"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
            aria-label="Download script"
          >
            <Download className="w-3 h-3" aria-hidden="true" />
            <span>Download</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
            aria-label={copied ? "Copied" : "Copy code"}
          >
            {copied ? (
              <><Check className="w-3 h-3 text-green-400" aria-hidden="true" /><span className="text-green-400">Copied</span></>
            ) : (
              <><Copy className="w-3 h-3" aria-hidden="true" /><span>Copy</span></>
            )}
          </button>
        </div>
      </div>
      <pre className="p-4 overflow-x-auto text-xs leading-relaxed text-[var(--foreground)]/90 font-mono">
        <code>{content}</code>
      </pre>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const segments = isUser ? null : parseMessageContent(message.content);

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
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
          isUser
            ? "bg-[var(--primary)]/20 border border-[var(--primary)]/30"
            : "bg-[var(--accent)]/15 border border-[var(--accent)]/30"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-[var(--primary-light)]" aria-hidden="true" />
        ) : (
          <Bot className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-[var(--primary)]/20 border border-[var(--primary)]/25 text-[var(--foreground)] text-sm"
            : "glass border border-[var(--border)] text-[var(--foreground)]"
        )}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose-dark">
            {segments?.map((seg, i) =>
              seg.type === "code" ? (
                <CodeBlock key={i} language={seg.language ?? ""} content={seg.content} />
              ) : (
                <div key={i}>{renderTextContent(seg.content)}</div>
              )
            )}
            {message.isStreaming && <span className="streaming-cursor" aria-hidden="true" />}
          </div>
        )}
        <div
          className={cn(
            "text-[10px] mt-1.5",
            isUser ? "text-right text-[var(--muted-foreground)]/60" : "text-[var(--muted-foreground)]/60"
          )}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Edit Agent Modal ─────────────────────────────────────────────────────────

function EditAgentModal({
  isOpen,
  onClose,
  prompt,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  onSave: (p: string) => void;
}) {
  const [draft, setDraft] = useState(prompt);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) setDraft(prompt);
  }, [isOpen, prompt]);

  const handleSave = () => {
    onSave(draft);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            variants={modalOverlay}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            variants={modalContent}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="glass rounded-2xl border border-[var(--border)] w-full max-w-2xl pointer-events-auto shadow-[0_8px_40px_rgba(124,58,237,0.2)]">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center">
                    <Edit3 className="w-4 h-4 text-[var(--primary-light)]" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--foreground)]">Edit Agent Instructions</h2>
                    <p className="text-xs text-[var(--muted-foreground)]">Customize how the QA Agent behaves</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Presets */}
              <div className="px-6 pt-4">
                <p className="text-xs text-[var(--muted-foreground)] mb-2 font-medium uppercase tracking-wider">Quick Presets</p>
                <div className="flex flex-wrap gap-2">
                  {PROMPT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setDraft(preset.prompt)}
                      className="px-3 py-1 rounded-full text-xs border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-all duration-200"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div className="px-6 py-4">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={12}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)]/60 resize-none transition-colors duration-200"
                  placeholder="Enter agent system prompt..."
                  aria-label="Agent system prompt"
                />
                <p className="text-xs text-[var(--muted-foreground)] mt-1.5">
                  {draft.length} characters
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)]">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white transition-all duration-200"
                >
                  {saved ? (
                    <><Check className="w-4 h-4" aria-hidden="true" />Saved!</>
                  ) : (
                    <><Check className="w-4 h-4" aria-hidden="true" />Save Instructions</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Session Sidebar Item ─────────────────────────────────────────────────────

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
}: {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200",
        isActive
          ? "bg-[var(--primary)]/15 border border-[var(--primary)]/25"
          : "hover:bg-white/5 border border-transparent"
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      aria-label={`Session: ${session.title}`}
      aria-current={isActive ? "true" : undefined}
    >
      <div className="w-6 h-6 rounded-md bg-[var(--accent)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Globe className="w-3 h-3 text-[var(--accent)]" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--foreground)] truncate">{session.title}</p>
        <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
          {formatRelativeTime(session.updatedAt)} · {session.messages.length} msgs
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-all duration-200"
        aria-label="Delete session"
      >
        <Trash2 className="w-3 h-3" aria-hidden="true" />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  // ── State ──
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("ready");
  const [selectedFrameworks, setSelectedFrameworks] = useState<Framework[]>(["playwright"]);
  const [agentPrompt, setAgentPrompt] = useState(DEFAULT_AGENT_PROMPT);
  const [apiKey, setApiKey] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [mounted, setMounted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Active session ──
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const messages = activeSession?.messages ?? [];

  // ── Mount / hydration guard ──
  useEffect(() => {
    setMounted(true);
    try {
      const storedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (storedSessions) setSessions(JSON.parse(storedSessions));
      const storedPrompt = localStorage.getItem(STORAGE_KEYS.AGENT_PROMPT);
      if (storedPrompt) setAgentPrompt(storedPrompt);
      const storedKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
      if (storedKey) setApiKey(storedKey);
    } catch {
      // ignore
    }
  }, []);

  // ── Persist sessions ──
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch {
      // ignore
    }
  }, [sessions, mounted]);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Session helpers ──
  const createSession = useCallback((firstMessage?: string, url?: string): ChatSession => {
    const now = Date.now();
    return {
      id: uid(),
      title: url ? new URL(url.startsWith("http") ? url : `https://${url}`).hostname : (firstMessage?.slice(0, 40) ?? "New Session"),
      url,
      messages: [],
      createdAt: now,
      updatedAt: now,
      frameworks: selectedFrameworks,
    };
  }, [selectedFrameworks]);

  const updateSession = useCallback((id: string, updater: (s: ChatSession) => ChatSession) => {
    setSessions((prev) => prev.map((s) => s.id === id ? updater(s) : s));
  }, []);

  const addMessage = useCallback((sessionId: string, msg: ChatMessage) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, msg], updatedAt: Date.now() }
          : s
      )
    );
  }, []);

  const updateLastMessage = useCallback((sessionId: string, updater: (m: ChatMessage) => ChatMessage) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const msgs = [...s.messages];
        if (msgs.length === 0) return s;
        msgs[msgs.length - 1] = updater(msgs[msgs.length - 1]);
        return { ...s, messages: msgs, updatedAt: Date.now() };
      })
    );
  }, []);

  const handleNewSession = useCallback(() => {
    setActiveSessionId(null);
    setInput("");
    setUrlInput("");
    setErrorMsg("");
  }, []);

  const handleDeleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) setActiveSessionId(null);
  }, [activeSessionId]);

  // ── Framework toggle ──
  const toggleFramework = useCallback((fw: Framework) => {
    setSelectedFrameworks((prev) => {
      if (fw === "all") return ["all"];
      const without = prev.filter((f) => f !== "all" && f !== fw);
      return prev.includes(fw) && prev.length > 1 ? without : [...without.filter((f) => f !== fw), fw];
    });
  }, []);

  // ── Save agent prompt ──
  const handleSavePrompt = useCallback((p: string) => {
    setAgentPrompt(p);
    try {
      localStorage.setItem(STORAGE_KEYS.AGENT_PROMPT, p);
    } catch {
      // ignore
    }
  }, []);

  // ── Excel export ──
  const handleExportExcel = useCallback(async () => {
    if (messages.length === 0) return;
    try {
      const XLSX = await import("xlsx");
      const testCases = [
        ["Test ID", "Test Suite", "Description", "Preconditions", "Steps", "Expected Result", "Actual Result", "Status", "Priority", "Assigned To"],
        ["TC-001", "Smoke", "Verify page loads", "Browser open", "1. Navigate to URL", "Page loads with 200 OK", "", "Pending", "High", ""],
        ["TC-002", "Functional", "Verify navigation links", "Page loaded", "1. Click each nav link", "Each link navigates correctly", "", "Pending", "Medium", ""],
      ];
      const ws = XLSX.utils.aoa_to_sheet(testCases);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Test Cases");
      XLSX.writeFile(wb, `test-cases-${Date.now()}.xlsx`);
    } catch {
      setErrorMsg("Failed to export Excel. Please try again.");
    }
  }, [messages]);

  // ── Send message ──
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || agentStatus === "thinking") return;

    setErrorMsg("");

    // Resolve or create session
    let sessionId = activeSessionId;
    let url = urlInput.trim() ? normalizeUrl(urlInput.trim()) : activeSession?.url;

    if (!sessionId) {
      const newSession = createSession(text, url);
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      sessionId = newSession.id;
    }

    // Build user message
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: url && !activeSession ? `URL: ${url}\n\n${text}` : text,
      timestamp: Date.now(),
    };

    addMessage(sessionId, userMsg);
    setInput("");
    setAgentStatus("thinking");

    // Build assistant placeholder
    const assistantMsg: ChatMessage = {
      id: uid(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    };
    addMessage(sessionId, assistantMsg);

    // Build API messages
    const currentSession = sessions.find((s) => s.id === sessionId);
    const apiMessages = [
      ...(currentSession?.messages ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: userMsg.content },
    ];

    // Build system prompt with framework context
    const frameworkContext = selectedFrameworks.includes("all")
      ? "Generate scripts for Playwright (TypeScript), Cypress (JavaScript), and Selenium (Python)."
      : `Generate scripts for: ${selectedFrameworks.join(", ")}.`;

    const systemPrompt = `${agentPrompt}\n\nFramework preference: ${frameworkContext}`;

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          systemPrompt,
          apiKey: apiKey || undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const finalAccumulated = accumulated;
        updateLastMessage(sessionId, (m) => ({ ...m, content: finalAccumulated, isStreaming: true }));
      }

      updateLastMessage(sessionId, (m) => ({ ...m, isStreaming: false }));
      setAgentStatus("ready");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        updateLastMessage(sessionId, (m) => ({ ...m, isStreaming: false }));
        setAgentStatus("ready");
        return;
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      setErrorMsg(message);
      updateLastMessage(sessionId, (m) => ({
        ...m,
        content: `Error: ${message}`,
        isStreaming: false,
      }));
      setAgentStatus("error");
      setTimeout(() => setAgentStatus("ready"), 3000);
    }
  }, [input, agentStatus, activeSessionId, urlInput, activeSession, createSession, addMessage, sessions, selectedFrameworks, agentPrompt, apiKey, updateLastMessage]);

  // ── Keyboard submit ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // ── Status indicator ──
  const statusConfig = {
    ready: { color: "bg-green-400", label: "Ready" },
    thinking: { color: "bg-[var(--accent)]", label: "Analyzing..." },
    error: { color: "bg-[var(--destructive)]", label: "Error" },
  }[agentStatus];

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Sidebar ── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex-shrink-0 glass border-r border-[var(--border)] flex flex-col overflow-hidden"
            aria-label="Session sidebar"
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Sessions</span>
              <button
                onClick={handleNewSession}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all duration-200"
                aria-label="New session"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                New
              </button>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <Clock className="w-6 h-6 text-[var(--muted-foreground)]/40 mb-2" aria-hidden="true" />
                  <p className="text-xs text-[var(--muted-foreground)]/60">No sessions yet</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={session.id === activeSessionId}
                    onSelect={() => setActiveSessionId(session.id)}
                    onDelete={() => handleDeleteSession(session.id)}
                  />
                ))
              )}
            </div>

            {/* Sidebar footer */}
            <div className="px-4 py-3 border-t border-[var(--border)]">
              <Link
                href="/history"
                className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors duration-200"
              >
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                View all history
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center justify-between px-4 py-3 glass border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
              aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              <ChevronDown
                className={cn("w-4 h-4 transition-transform duration-200", sidebarOpen ? "-rotate-90" : "rotate-90")}
                aria-hidden="true"
              />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center">
                <Bot className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)] leading-none">QA Agent</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={cn("w-1.5 h-1.5 rounded-full", statusConfig.color,
                      agentStatus === "thinking" && "pulse-ring"
                    )}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] text-[var(--muted-foreground)]">{statusConfig.label}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Framework selector */}
            <div className="hidden sm:flex items-center gap-1">
              {FRAMEWORKS.map((fw) => (
                <button
                  key={fw.value}
                  onClick={() => toggleFramework(fw.value)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all duration-200",
                    selectedFrameworks.includes(fw.value)
                      ? "border-[var(--accent)]/50 text-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--border)]/80"
                  )}
                  aria-pressed={selectedFrameworks.includes(fw.value)}
                  aria-label={`Toggle ${fw.label}`}
                >
                  {fw.label}
                </button>
              ))}
            </div>

            {/* Edit agent */}
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary-light)] hover:border-[var(--primary)]/40 transition-all duration-200"
              aria-label="Edit agent instructions"
            >
              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
              Edit Agent
            </button>

            {/* Export Excel */}
            {messages.length > 0 && (
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-all duration-200"
                aria-label="Export test cases to Excel"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                Export Excel
              </button>
            )}
          </div>
        </div>

        {/* URL bar */}
        <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--background)]/50 flex-shrink-0">
          <div className="flex items-center gap-2 max-w-2xl">
            <Globe className="w-4 h-4 text-[var(--muted-foreground)] flex-shrink-0" aria-hidden="true" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com — paste a URL to analyze"
              className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none"
              aria-label="Website URL to test"
            />
            {urlInput && isValidUrl(urlInput) && (
              <span className="text-[10px] text-green-400 font-medium">Valid URL</span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.length === 0 ? (
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center justify-center h-full text-center px-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-[var(--accent)]" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">QA Agent Ready</h2>
              <p className="text-sm text-[var(--muted-foreground)] max-w-md mb-6">
                Paste a website URL above, then describe what you want to test. The agent will analyze the site and generate test scripts.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {EXAMPLE_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(prompt)}
                    className="text-left px-3 py-2.5 rounded-xl border border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/5 transition-all duration-200"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}

          {/* Error banner */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[var(--destructive)]/10 border border-[var(--destructive)]/25"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 text-[var(--destructive)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--destructive)]">Error</p>
                  <p className="text-xs text-[var(--foreground)]/70 mt-0.5">{errorMsg}</p>
                </div>
                <button
                  onClick={() => setErrorMsg("")}
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  aria-label="Dismiss error"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-[var(--border)] glass">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what to test, or ask for specific scripts..."
                rows={1}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 pr-12 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:border-[var(--primary)]/50 resize-none transition-colors duration-200 leading-relaxed"
                style={{ minHeight: "48px", maxHeight: "160px" }}
                aria-label="Chat input"
                disabled={agentStatus === "thinking"}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || agentStatus === "thinking"}
              className={cn(
                "flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200",
                input.trim() && agentStatus !== "thinking"
                  ? "bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white glow-primary"
                  : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] cursor-not-allowed"
              )}
              aria-label="Send message"
            >
              {agentStatus === "thinking" ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="text-center text-[10px] text-[var(--muted-foreground)]/40 mt-2">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* ── Edit Agent Modal ── */}
      <EditAgentModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        prompt={agentPrompt}
        onSave={handleSavePrompt}
      />
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Globe, Download, FileText, Sparkles, X, Check, AlertCircle, Clock, Terminal, Plus, Copy, Code2, ChevronDown, Loader2, Bot, User, Trash2, Edit3 } from 'lucide-react';
import Link from "next/link";
import type { User as SupabaseUser } from '@supabase/supabase-js';
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
    segments.push({ type: "code", language: match[1] || "text", content: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", content: content.slice(lastIndex) });
  }

  return segments.filter((s) => s.content.trim());
}

// ─── Supabase DB helpers (lazy-loaded to avoid breaking if not configured) ────

async function tryGetCurrentUser(): Promise<SupabaseUser | null> {
  try {
    const { getCurrentUser } = await import('@/lib/supabase/db');
    return await getCurrentUser();
  } catch {
    return null;
  }
}

async function trySaveSession(userId: string, session: ChatSession): Promise<void> {
  try {
    const { saveSession } = await import('@/lib/supabase/db');
    await saveSession(userId, session);
  } catch {
    // Silently fall back to localStorage only
  }
}

async function tryGetUserSessions(userId: string): Promise<ChatSession[]> {
  try {
    const { getUserSessions } = await import('@/lib/supabase/db');
    return await getUserSessions(userId);
  } catch {
    return [];
  }
}

async function tryDeleteSession(sessionId: string, userId: string): Promise<void> {
  try {
    const { deleteSession } = await import('@/lib/supabase/db');
    await deleteSession(sessionId, userId);
  } catch {
    // Silently fall back
  }
}

async function tryDeleteAllSessions(userId: string): Promise<void> {
  try {
    const { deleteAllSessions } = await import('@/lib/supabase/db');
    await deleteAllSessions(userId);
  } catch {
    // Silently fall back
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CodeBlock({ content, language }: { content: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [content]);

  const handleDownload = useCallback(() => {
    const ext =
      language === "python" ? "py" : language === "typescript" ? "ts" : "js";
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-script.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [content, language]);

  return (
    <div className="code-block my-3 rounded-xl overflow-hidden border border-[var(--border)]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d0d1a] border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="text-xs font-mono text-[var(--muted-foreground)]">
            {language || "code"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors duration-200 px-2 py-1 rounded hover:bg-white/5"
          >
            <Download className="w-3 h-3" />
            <span>Download</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors duration-200 px-2 py-1 rounded hover:bg-white/5"
          >
            {copied ? (
              <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
            ) : (
              <><Copy className="w-3 h-3" /><span>Copy</span></>
            )}
          </button>
        </div>
      </div>
      <pre className="p-4 overflow-x-auto text-xs leading-relaxed text-[var(--foreground)] font-mono">
        <code>{content}</code>
      </pre>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const segments = parseMessageContent(content);

  return (
    <div className="prose-dark">
      {segments.map((seg, i) =>
        seg.type === "code" ? (
          <CodeBlock key={i} content={seg.content} language={seg.language ?? ""} />
        ) : (
          <div
            key={i}
            className="whitespace-pre-wrap text-sm leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: seg.content
                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                .replace(/\*(.+?)\*/g, "<em>$1</em>")
                .replace(/^#{1,3}\s(.+)$/gm, "<h3 class='text-[var(--primary-light)] font-semibold mt-3 mb-1'>$1</h3>")
                .replace(/^[-*]\s(.+)$/gm, "<li class='ml-4 list-disc'>$1</li>")
                .replace(/^(\d+)\.\s(.+)$/gm, "<li class='ml-4 list-decimal'>$2</li>"),
            }}
          />
        )
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [activeUrl, setActiveUrl] = useState("");
  const [framework, setFramework] = useState<Framework>("all");
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("ready");
  const [apiKey, setApiKey] = useState("");
  const [agentPrompt, setAgentPrompt] = useState(DEFAULT_AGENT_PROMPT);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [editPromptDraft, setEditPromptDraft] = useState("");
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Mount + load persisted state ───────────────────────────────────────────
  useEffect(() => {
    setMounted(true);

    // Load settings from localStorage
    const storedKey = localStorage.getItem(STORAGE_KEYS.API_KEY) ?? "";
    const storedPrompt = localStorage.getItem(STORAGE_KEYS.AGENT_PROMPT) ?? DEFAULT_AGENT_PROMPT;
    setApiKey(storedKey);
    setApiKeyDraft(storedKey);
    setAgentPrompt(storedPrompt);
    setEditPromptDraft(storedPrompt);

    // Load sessions from localStorage first
    let localSessions: ChatSession[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (raw) {
        localSessions = JSON.parse(raw) as ChatSession[];
      }
    } catch {
      localSessions = [];
    }

    // Then try to get current user and merge with Supabase sessions
    tryGetCurrentUser().then(async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const remoteSessions = await tryGetUserSessions(currentUser.id);

        // Merge: prefer Supabase data, deduplicate by id
        const mergedMap = new Map<string, ChatSession>();
        for (const s of localSessions) {
          mergedMap.set(s.id, s);
        }
        for (const s of remoteSessions) {
          mergedMap.set(s.id, s); // Supabase wins on conflict
        }
        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => b.updatedAt - a.updatedAt
        );
        setSessions(merged);
        // Sync merged back to localStorage
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(merged));
      } else {
        setSessions(localSessions.sort((a, b) => b.updatedAt - a.updatedAt));
      }
    });
  }, []);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Persist sessions to localStorage (and Supabase if user exists) ─────────
  const persistSessions = useCallback(
    async (updated: ChatSession[]) => {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
    },
    []
  );

  // ── Session helpers ────────────────────────────────────────────────────────
  const saveCurrentSession = useCallback(
    async (msgs: ChatMessage[], sessionId: string | null = activeSessionId) => {
      if (!msgs.length) return;

      const now = Date.now();
      const title =
        msgs[0]?.content?.slice(0, 60) ||
        (activeUrl ? `Test: ${activeUrl}` : "New Session");

      setSessions((prev) => {
        const existing = prev.find((s) => s.id === sessionId);
        const session: ChatSession = existing
          ? {
              ...existing,
              messages: msgs,
              updatedAt: now,
              title: existing.title || title,
              url: activeUrl || existing.url,
              frameworks: [framework],
            }
          : {
              id: sessionId ?? uid(),
              title,
              url: activeUrl,
              messages: msgs,
              createdAt: now,
              updatedAt: now,
              frameworks: [framework],
              testCaseCount: 0,
              excelExported: false,
              agentPromptSnapshot: agentPrompt,
            };

        const updated = existing
          ? prev.map((s) => (s.id === session.id ? session : s))
          : [session, ...prev];

        // Persist to localStorage
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));

        // Persist to Supabase if user is logged in
        if (user) {
          trySaveSession(user.id, session);
        }

        return updated;
      });
    },
    [activeSessionId, activeUrl, framework, agentPrompt, user]
  );

  const startNewSession = useCallback(() => {
    const id = uid();
    setActiveSessionId(id);
    setMessages([]);
    setUrlInput("");
    setActiveUrl("");
    setInput("");
    setAgentStatus("ready");
    abortRef.current?.abort();
  }, []);

  const loadSession = useCallback((session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages ?? []);
    setActiveUrl(session.url ?? "");
    setUrlInput(session.url ?? "");
    setFramework((session.frameworks?.[0] as Framework) ?? "all");
    setAgentStatus("ready");
  }, []);

  const deleteSession = useCallback(
    async (id: string) => {
      setSessions((prev) => {
        const updated = prev.filter((s) => s.id !== id);
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
        return updated;
      });

      // Delete from Supabase if user is logged in
      if (user) {
        await tryDeleteSession(id, user.id);
      }

      if (activeSessionId === id) {
        startNewSession();
      }
      setDeleteConfirm(null);
    },
    [activeSessionId, startNewSession, user]
  );

  const clearAllSessions = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    setSessions([]);

    // Delete all from Supabase if user is logged in
    if (user) {
      await tryDeleteAllSessions(user.id);
    }

    startNewSession();
  }, [startNewSession, user]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (overrideContent?: string) => {
      const content = (overrideContent ?? input).trim();
      if (!content || agentStatus === "thinking") return;

      const resolvedUrl = activeUrl || (isValidUrl(urlInput) ? normalizeUrl(urlInput) : "");
      if (resolvedUrl && !activeUrl) setActiveUrl(resolvedUrl);

      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content,
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

      const newMessages = [...messages, userMsg, assistantMsg];
      setMessages(newMessages);
      setInput("");
      setAgentStatus("thinking");

      const sessionId = activeSessionId ?? uid();
      if (!activeSessionId) setActiveSessionId(sessionId);

      abortRef.current = new AbortController();

      try {
        const systemPrompt = `${agentPrompt}\n\n${resolvedUrl ? `The user is testing this URL: ${resolvedUrl}` : ""}\nPreferred framework: ${framework}`;

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMsg].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            systemPrompt,
            apiKey: apiKey || undefined,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                const delta =
                  parsed.delta?.text ||
                  parsed.choices?.[0]?.delta?.content ||
                  "";
                accumulated += delta;

                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: accumulated, isStreaming: true }
                      : m
                  )
                );
              } catch {
                // skip malformed SSE lines
              }
            }
          }
        }

        const finalMessages = newMessages.map((m) =>
          m.id === assistantId
            ? { ...m, content: accumulated, isStreaming: false }
            : m
        );
        setMessages(finalMessages);
        setAgentStatus("ready");
        await saveCurrentSession(finalMessages, sessionId);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setAgentStatus("ready");
          return;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: "Sorry, something went wrong. Please check your API key and try again.",
                  isStreaming: false,
                }
              : m
          )
        );
        setAgentStatus("error");
      }
    },
    [input, agentStatus, activeUrl, urlInput, messages, activeSessionId, agentPrompt, framework, apiKey, saveCurrentSession]
  );

  // ── Export Excel ───────────────────────────────────────────────────────────
  const exportExcel = useCallback(async () => {
    if (!messages.length) return;
    setIsExporting(true);
    try {
      const { utils, writeFile } = await import("xlsx");
      const testCases = [
        ["Test ID", "Test Suite", "Description", "Preconditions", "Steps", "Expected Result", "Actual Result", "Status", "Priority", "Assigned To"],
        ["TC-001", "Smoke", "Verify page loads", "App is running", "1. Navigate to URL", "Page loads successfully", "", "Pending", "High", ""],
      ];
      const ws = utils.aoa_to_sheet(testCases);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Test Cases");
      writeFile(wb, `test-cases-${Date.now()}.xlsx`);

      // Mark session as exported
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === activeSessionId ? { ...s, excelExported: true } : s
        );
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error("Excel export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, [messages, activeSessionId]);

  // ── Save agent prompt ──────────────────────────────────────────────────────
  const saveAgentPrompt = useCallback(() => {
    setAgentPrompt(editPromptDraft);
    localStorage.setItem(STORAGE_KEYS.AGENT_PROMPT, editPromptDraft);
    setSaveStatus("saved");
    setTimeout(() => {
      setSaveStatus("idle");
      setShowEditModal(false);
    }, 1200);
  }, [editPromptDraft]);

  // ── Save API key ───────────────────────────────────────────────────────────
  const saveApiKey = useCallback(() => {
    setApiKey(apiKeyDraft);
    localStorage.setItem(STORAGE_KEYS.API_KEY, apiKeyDraft);
    setSaveStatus("saved");
    setTimeout(() => {
      setSaveStatus("idle");
      setShowApiModal(false);
    }, 1200);
  }, [apiKeyDraft]);

  // ── Keyboard handler ───────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  // ── Guard: don't render until mounted (avoid hydration mismatch) ───────────
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Sidebar ── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex-shrink-0 overflow-hidden border-r border-[var(--border)] bg-[var(--card)]/60 backdrop-blur-xl flex flex-col"
          >
            <div className="flex flex-col h-full w-[280px]">
              {/* Sidebar header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
                  Sessions
                </span>
                <button
                  type="button"
                  onClick={startNewSession}
                  className="flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--foreground)] transition-colors duration-200 px-2 py-1 rounded hover:bg-white/5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New
                </button>
              </div>

              {/* Session list */}
              <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
                {sessions.length === 0 && (
                  <div className="text-center py-8 text-xs text-[var(--muted-foreground)]">
                    No sessions yet.
                    <br />
                    Start a new chat!
                  </div>
                )}
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "group relative rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-200",
                      session.id === activeSessionId
                        ? "bg-[var(--primary)]/20 border border-[var(--primary)]/30"
                        : "hover:bg-white/5 border border-transparent"
                    )}
                    onClick={() => loadSession(session)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && loadSession(session)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--foreground)] truncate">
                          {session.title || "Untitled Session"}
                        </p>
                        {session.url && (
                          <p className="text-[10px] text-[var(--muted-foreground)] truncate mt-0.5">
                            {session.url}
                          </p>
                        )}
                        <p className="text-[10px] text-[var(--muted-foreground)]/60 mt-1">
                          {formatRelativeTime(session.updatedAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-all duration-200"
                        aria-label="Delete session"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sidebar footer */}
              <div className="border-t border-[var(--border)] p-3 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditPromptDraft(agentPrompt);
                    setShowEditModal(true);
                  }}
                  className="w-full flex items-center gap-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200 px-2 py-1.5 rounded hover:bg-white/5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Agent Prompt
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApiKeyDraft(apiKey);
                    setShowApiModal(true);
                  }}
                  className="w-full flex items-center gap-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200 px-2 py-1.5 rounded hover:bg-white/5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {apiKey ? "Update API Key" : "Set API Key"}
                </button>
                {sessions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm("__all__")}
                    className="w-full flex items-center gap-2 text-xs text-[var(--destructive)]/70 hover:text-[var(--destructive)] transition-colors duration-200 px-2 py-1.5 rounded hover:bg-[var(--destructive)]/5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All Sessions
                  </button>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--card)]/40 backdrop-blur-xl flex-shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                sidebarOpen ? "-rotate-90" : "rotate-90"
              )}
            />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-md bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-[var(--foreground)] truncate">
                {activeSession?.title || APP_NAME}
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    agentStatus === "ready" && "bg-emerald-400",
                    agentStatus === "thinking" && "bg-[var(--accent)] animate-pulse",
                    agentStatus === "error" && "bg-[var(--destructive)]"
                  )}
                />
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  {agentStatus === "ready" && "Ready"}
                  {agentStatus === "thinking" && "Analyzing..."}
                  {agentStatus === "error" && "Error"}
                </span>
                {user && (
                  <span className="text-[10px] text-[var(--accent)]/70 ml-2">
                    Synced
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={exportExcel}
                disabled={isExporting}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all duration-200 disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <FileText className="w-3 h-3" />
                )}
                Export Excel
              </button>
            )}
            <button
              type="button"
              onClick={startNewSession}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary-light)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 transition-all duration-200"
            >
              <Plus className="w-3 h-3" />
              New Chat
            </button>
          </div>
        </div>

        {/* URL bar */}
        <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--card)]/20 flex-shrink-0">
          <div className="flex items-center gap-2 max-w-3xl mx-auto">
            <Globe className="w-4 h-4 text-[var(--muted-foreground)] flex-shrink-0" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onBlur={() => {
                if (isValidUrl(urlInput)) setActiveUrl(normalizeUrl(urlInput));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValidUrl(urlInput)) {
                  setActiveUrl(normalizeUrl(urlInput));
                }
              }}
              placeholder="https://example.com — paste a URL to test"
              className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 outline-none font-mono"
            />
            {activeUrl && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 flex-shrink-0">
                <Check className="w-3 h-3" />
                Active
              </span>
            )}
          </div>
        </div>

        {/* Framework selector */}
        <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--card)]/10 flex-shrink-0">
          <div className="flex items-center gap-2 max-w-3xl mx-auto">
            <Terminal className="w-3.5 h-3.5 text-[var(--muted-foreground)] flex-shrink-0" />
            <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest mr-1">
              Framework:
            </span>
            <div className="flex items-center gap-1">
              {FRAMEWORKS.map((fw) => (
                <button
                  key={fw.value}
                  type="button"
                  onClick={() => setFramework(fw.value)}
                  className={cn(
                    "text-[10px] px-2.5 py-1 rounded-full border transition-all duration-200",
                    framework === fw.value
                      ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/40 hover:text-[var(--foreground)]"
                  )}
                >
                  {fw.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 && (
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="text-center py-16"
              >
                <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/20 border border-[var(--primary)]/30 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-[var(--primary-light)]" />
                </div>
                <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                  {APP_NAME}
                </h2>
                <p className="text-sm text-[var(--muted-foreground)] mb-8 max-w-md mx-auto">
                  Paste a URL above and describe what you want to test. The agent will analyze the site and generate test scripts.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      className="text-left text-xs px-3 py-2.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/40 hover:bg-white/5 transition-all duration-200"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

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
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/20 border border-[var(--primary)]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-[var(--primary-light)]" />
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3",
                    msg.role === "user"
                      ? "bg-[var(--primary)]/20 border border-[var(--primary)]/30 text-[var(--foreground)]"
                      : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)]"
                  )}
                >
                  {msg.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <>
                      <MessageContent content={msg.content} />
                      {msg.isStreaming && (
                        <span className="streaming-cursor" aria-hidden="true" />
                      )}
                    </>
                  )}
                  <p className="text-[10px] text-[var(--muted-foreground)]/50 mt-2 text-right">
                    {formatTime(msg.timestamp)}
                  </p>
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                )}
              </motion.div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="px-4 py-4 border-t border-[var(--border)] bg-[var(--card)]/40 backdrop-blur-xl flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl px-4 py-3 focus-within:border-[var(--accent)]/50 transition-colors duration-200">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what to test, or ask a QA question..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 outline-none resize-none max-h-32 leading-relaxed"
                style={{ minHeight: "24px" }}
                disabled={agentStatus === "thinking"}
              />
              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={!input.trim() || agentStatus === "thinking"}
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
                  input.trim() && agentStatus !== "thinking"
                    ? "bg-[var(--accent)] text-[var(--background)] hover:opacity-90 glow-accent"
                    : "bg-[var(--border)] text-[var(--muted-foreground)] cursor-not-allowed"
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
            <p className="text-[10px] text-[var(--muted-foreground)]/40 text-center mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* ── Delete confirm modal ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            variants={modalOverlay}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              variants={modalContent}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-[var(--destructive)]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    {deleteConfirm === "__all__" ? "Clear All Sessions" : "Delete Session"}
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-xs rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deleteConfirm === "__all__") {
                      clearAllSessions();
                    } else {
                      deleteSession(deleteConfirm);
                    }
                  }}
                  className="px-4 py-2 text-xs rounded-lg bg-[var(--destructive)] text-white hover:opacity-90 transition-all duration-200"
                >
                  {deleteConfirm === "__all__" ? "Clear All" : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit Agent Prompt modal ── */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            variants={modalOverlay}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              variants={modalContent}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[var(--accent)]" />
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    Edit Agent Prompt
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {PROMPT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setEditPromptDraft(preset.prompt)}
                    className="text-[10px] px-2.5 py-1 rounded-full border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-all duration-200"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <textarea
                value={editPromptDraft}
                onChange={(e) => setEditPromptDraft(e.target.value)}
                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl p-3 text-xs font-mono text-[var(--foreground)] outline-none resize-none focus:border-[var(--accent)]/50 transition-colors duration-200 min-h-[300px]"
                placeholder="Enter agent system prompt..."
              />

              <div className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  onClick={() => setEditPromptDraft(DEFAULT_AGENT_PROMPT)}
                  className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200"
                >
                  Reset to default
                </button>
                <button
                  type="button"
                  onClick={saveAgentPrompt}
                  className="flex items-center gap-2 px-4 py-2 text-xs rounded-xl bg-[var(--accent)] text-[var(--background)] font-medium hover:opacity-90 transition-all duration-200"
                >
                  {saveStatus === "saved" ? (
                    <><Check className="w-3.5 h-3.5" /> Saved!</>
                  ) : (
                    "Save Prompt"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── API Key modal ── */}
      <AnimatePresence>
        {showApiModal && (
          <motion.div
            variants={modalOverlay}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setShowApiModal(false)}
          >
            <motion.div
              variants={modalContent}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    API Key Configuration
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApiModal(false)}
                  className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                Enter your LLM API key. It is stored locally in your browser and never sent to our servers.
              </p>

              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKeyDraft}
                  onChange={(e) => setApiKeyDraft(e.target.value)}
                  placeholder="sk-ant-... or your API key"
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm font-mono text-[var(--foreground)] outline-none focus:border-[var(--accent)]/50 transition-colors duration-200 pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200"
                >
                  {showApiKey ? "Hide" : "Show"}
                </button>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={saveApiKey}
                  className="flex items-center gap-2 px-4 py-2 text-xs rounded-xl bg-[var(--accent)] text-[var(--background)] font-medium hover:opacity-90 transition-all duration-200"
                >
                  {saveStatus === "saved" ? (
                    <><Check className="w-3.5 h-3.5" /> Saved!</>
                  ) : (
                    "Save Key"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

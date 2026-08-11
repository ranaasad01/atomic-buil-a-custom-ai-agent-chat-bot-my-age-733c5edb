"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Trash2, Play, Search, FileText, AlertCircle, X, ChevronRight, Calendar, MessageSquare, Globe, CheckSquare, Plus, Bot } from 'lucide-react';
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/motion";
import type { ChatSession } from "@/lib/data";
import { cn } from "@/lib/utils";

// ─── Storage key (mirrors what the chat interface uses) ──────────────────────
const STORAGE_KEYS = {
  SESSIONS: "qa_agent_sessions",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

interface SessionStats {
  messageCount: number;
  testCaseCount: number;
  excelExported: boolean;
}

function getSessionStats(session: ChatSession): SessionStats {
  return {
    messageCount: session.messages?.length ?? 0,
    testCaseCount: session.testCaseCount ?? 0,
    excelExported: session.excelExported ?? false,
  };
}

function getLastAssistantPreview(session: ChatSession): string {
  const msgs = [...(session.messages ?? [])].reverse();
  const last = msgs.find((m) => m.role === "assistant");
  if (!last) return "No response yet.";
  // Strip markdown code fences for preview
  return last.content
    .replace(/```[\s\S]*?```/g, "[code block]")
    .replace(/#{1,6}\s/g, "")
    .trim()
    .slice(0, 180);
}

const FRAMEWORK_COLORS: Record<string, string> = {
  playwright: "bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/30",
  cypress: "bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/30",
  selenium: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
  all: "bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/30",
};

type FilterType = "all" | "playwright" | "cypress" | "selenium";

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [mounted, setMounted] = useState(false);

  // Load sessions from localStorage after mount
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (raw) {
        const parsed: ChatSession[] = JSON.parse(raw);
        const sorted = [...parsed].sort((a, b) => b.updatedAt - a.updatedAt);
        setSessions(sorted);
      }
    } catch {
      setSessions([]);
    }
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      const updated = sessions.filter((s) => s.id !== id);
      setSessions(updated);
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
      setDeleteConfirm(null);
    },
    [sessions]
  );

  const handleClearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    setSessions([]);
    setDeleteConfirm(null);
  }, []);

  // Filtered + searched sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesFilter =
      filter === "all" ||
      (s.frameworks ?? []).some(
        (fw) => fw.toLowerCase() === filter.toLowerCase()
      );
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      (s.title ?? "").toLowerCase().includes(q) ||
      (s.url ?? "").toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  // Stats
  const totalTestCases = sessions.reduce(
    (acc, s) => acc + (s.testCaseCount ?? 0),
    0
  );
  const totalExcelExports = sessions.filter((s) => s.excelExported).length;

  const filterPills: { label: string; value: FilterType }[] = [
    { label: "All", value: "all" },
    { label: "Playwright", value: "playwright" },
    { label: "Cypress", value: "cypress" },
    { label: "Selenium", value: "selenium" },
  ];

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-4xl mx-auto">
        {/* ── Page Header ── */}
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 py-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
                <span className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-widest">
                  Session Archive
                </span>
              </div>
              <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">
                Test History
              </h1>
              <p className="text-[var(--muted-foreground)] mt-1 text-sm">
                Browse, resume, and manage all past QA agent sessions.
              </p>
            </div>
            <Link
              href="/chat-home-main-agent-chat-interface"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white text-sm font-semibold transition-all duration-200 glow-primary shrink-0"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              New Chat
            </Link>
          </div>
        </Reveal>

        {/* ── Stats Row ── */}
        <Reveal delay={0.05}>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              {
                label: "Total Sessions",
                value: sessions.length,
                icon: MessageSquare,
                color: "text-[var(--primary-light)]",
              },
              {
                label: "Total Test Cases",
                value: totalTestCases,
                icon: CheckSquare,
                color: "text-[var(--accent)]",
              },
              {
                label: "Excel Exports",
                value: totalExcelExports,
                icon: FileText,
                color: "text-emerald-400",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass rounded-xl p-4 flex flex-col gap-1 border border-[var(--border)]"
              >
                <stat.icon
                  className={cn("w-4 h-4", stat.color)}
                  aria-hidden="true"
                />
                <span className="text-2xl font-bold text-[var(--foreground)] tabular-nums">
                  {stat.value}
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ── Search + Filter Bar ── */}
        <Reveal delay={0.08}>
          <div className="glass rounded-xl px-4 py-3 mb-6 border border-[var(--border)] flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or URL..."
                className="w-full pl-9 pr-4 py-2 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none"
                aria-label="Search sessions"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Framework filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {filterPills.map((pill) => (
                <button
                  key={pill.value}
                  onClick={() => setFilter(pill.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                    filter === pill.value
                      ? "bg-[var(--primary)] text-white"
                      : "bg-white/5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/10"
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ── Session List ── */}
        {filteredSessions.length === 0 ? (
          <Reveal delay={0.1}>
            <div className="glass rounded-2xl border border-[var(--border)] p-16 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
                <Clock className="w-7 h-7 text-[var(--primary-light)]" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[var(--foreground)] font-semibold text-lg">
                  {sessions.length === 0 ? "No sessions yet" : "No matching sessions"}
                </p>
                <p className="text-[var(--muted-foreground)] text-sm mt-1">
                  {sessions.length === 0
                    ? "Start a new chat to begin testing a website."
                    : "Try adjusting your search or filter."}
                </p>
              </div>
              {sessions.length === 0 && (
                <Link
                  href="/chat-home-main-agent-chat-interface"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white text-sm font-semibold transition-all duration-200 mt-2"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  Start New Chat
                </Link>
              )}
            </div>
          </Reveal>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-4"
          >
            {filteredSessions.map((session) => {
              const stats = getSessionStats(session);
              const domain = session.url ? extractDomain(session.url) : null;
              const preview = getLastAssistantPreview(session);
              const isConfirmingDelete = deleteConfirm === session.id;

              return (
                <motion.div
                  key={session.id}
                  variants={fadeInUp}
                  className={cn(
                    "glass rounded-xl p-5 border transition-all duration-200 cursor-pointer group",
                    isConfirmingDelete
                      ? "border-[var(--destructive)]/40"
                      : "border-[var(--border)] hover:border-[var(--primary)]/40"
                  )}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center shrink-0">
                        <Globe
                          className="w-4 h-4 text-[var(--primary-light)]"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                          {session.title || domain || "Untitled Session"}
                        </p>
                        {domain && session.title !== domain && (
                          <p className="text-xs text-[var(--muted-foreground)] truncate">
                            {domain}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Calendar
                        className="w-3.5 h-3.5 text-[var(--muted-foreground)]"
                        aria-hidden="true"
                      />
                      <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                        {formatRelativeTime(session.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Framework Badges */}
                  {(session.frameworks ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(session.frameworks ?? []).map((fw) => (
                        <span
                          key={fw}
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide",
                            FRAMEWORK_COLORS[fw.toLowerCase()] ??
                              "bg-white/5 text-[var(--muted-foreground)] border border-white/10"
                          )}
                        >
                          {fw}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare
                        className="w-3.5 h-3.5 text-[var(--muted-foreground)]"
                        aria-hidden="true"
                      />
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {stats.messageCount} messages
                      </span>
                    </div>
                    {stats.testCaseCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <CheckSquare
                          className="w-3.5 h-3.5 text-[var(--accent)]"
                          aria-hidden="true"
                        />
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {stats.testCaseCount} test cases
                        </span>
                      </div>
                    )}
                    {stats.excelExported && (
                      <div className="flex items-center gap-1.5">
                        <FileText
                          className="w-3.5 h-3.5 text-emerald-400"
                          aria-hidden="true"
                        />
                        <span className="text-xs text-emerald-400">Excel exported</span>
                      </div>
                    )}
                  </div>

                  {/* Last Message Preview */}
                  {preview && (
                    <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 mb-4 leading-relaxed">
                      {preview}
                    </p>
                  )}

                  {/* Actions Row */}
                  <AnimatePresence mode="wait">
                    {isConfirmingDelete ? (
                      <motion.div
                        key="confirm"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-3"
                      >
                        <div className="flex items-center gap-1.5 text-[var(--destructive)] text-xs">
                          <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Are you sure? This cannot be undone.</span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/10 transition-all duration-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(session.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--destructive)]/20 text-[var(--destructive)] hover:bg-[var(--destructive)]/30 border border-[var(--destructive)]/30 transition-all duration-200"
                          >
                            Confirm Delete
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="actions"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-2"
                      >
                        <Link
                          href="/chat-home-main-agent-chat-interface"
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[var(--primary)]/20 text-[var(--primary-light)] hover:bg-[var(--primary)]/30 border border-[var(--primary)]/30 transition-all duration-200"
                        >
                          <Play className="w-3.5 h-3.5" aria-hidden="true" />
                          Resume
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm(session.id)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[var(--destructive)]/10 text-[var(--destructive)] hover:bg-[var(--destructive)]/20 border border-[var(--destructive)]/20 transition-all duration-200 ml-auto"
                          aria-label={`Delete session ${session.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Delete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* ── Clear All ── */}
        {sessions.length > 0 && (
          <Reveal delay={0.12}>
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleClearAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10 border border-[var(--border)] hover:border-[var(--destructive)]/30 transition-all duration-200"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Clear All Sessions
              </button>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}

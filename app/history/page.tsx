"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Trash2, Play, Search, FileText, AlertCircle, X, ChevronRight, Calendar, MessageSquare, Globe, CheckSquare, Plus, Bot } from 'lucide-react';
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/motion";
import type { ChatSession } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import { getCurrentUser, getUserSessions, deleteSession, deleteAllSessions } from "@/lib/supabase/db";

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
  const [user, setUser] = useState<User | null>(null);

  // Load sessions — merge Supabase (if logged in) with localStorage
  useEffect(() => {
    setMounted(true);

    async function loadSessions() {
      // 1. Always load localStorage sessions first as a baseline
      let localSessions: ChatSession[] = [];
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
        if (raw) {
          localSessions = JSON.parse(raw) as ChatSession[];
        }
      } catch {
        localSessions = [];
      }

      // 2. Try to get the current Supabase user
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          // 3. Fetch sessions from Supabase
          const supabaseSessions = await getUserSessions(currentUser.id);

          // 4. Merge: Supabase takes precedence; deduplicate by id
          const supabaseMap = new Map<string, ChatSession>();
          for (const s of supabaseSessions) {
            supabaseMap.set(s.id, s);
          }
          // Add local sessions that aren't already in Supabase
          for (const s of localSessions) {
            if (!supabaseMap.has(s.id)) {
              supabaseMap.set(s.id, s);
            }
          }

          const merged = Array.from(supabaseMap.values()).sort(
            (a, b) => b.updatedAt - a.updatedAt
          );
          setSessions(merged);
          return;
        }
      } catch {
        // Supabase unavailable — fall through to localStorage only
      }

      // 5. Fallback: localStorage only
      const sorted = [...localSessions].sort((a, b) => b.updatedAt - a.updatedAt);
      setSessions(sorted);
    }

    loadSessions();
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      // Remove from local state and localStorage
      const updated = sessions.filter((s) => s.id !== id);
      setSessions(updated);
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
      setDeleteConfirm(null);

      // Also remove from Supabase if user is logged in
      if (user) {
        try {
          await deleteSession(id, user.id);
        } catch {
          // Non-fatal — local state already updated
        }
      }
    },
    [sessions, user]
  );

  const handleClearAll = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    setSessions([]);
    setDeleteConfirm(null);

    // Also clear from Supabase if user is logged in
    if (user) {
      try {
        await deleteAllSessions(user.id);
      } catch {
        // Non-fatal
      }
    }
  }, [user]);

  // Filtered + searched sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesFilter =
      filter === "all" ||
      (s.frameworks ?? []).some(
        (fw) => fw.toLowerCase() === filter || fw.toLowerCase() === "all"
      );
    if (!matchesFilter) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title?.toLowerCase().includes(q) ||
      s.url?.toLowerCase().includes(q) ||
      s.messages?.some((m) => m.content.toLowerCase().includes(q))
    );
  });

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-5xl mx-auto">
        {/* ── Header ── */}
        <Reveal>
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
                <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
                  Test History
                </h1>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Browse and resume your past QA sessions
                {user && (
                  <span className="ml-2 text-[var(--accent)] text-xs font-mono">
                    (synced with cloud)
                  </span>
                )}
              </p>
            </div>
            <Link
              href="/chat-home-main-agent-chat-interface"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white text-sm font-medium transition-all duration-200 w-fit"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              New Session
            </Link>
          </div>
        </Reveal>

        {/* ── Search + Filter bar ── */}
        <Reveal delay={0.05}>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
                placeholder="Search sessions..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg glass border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)]/60 transition-colors duration-200"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Framework filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(["all", "playwright", "cypress", "selenium"] as FilterType[]).map(
                (f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all duration-200 border",
                      filter === f
                        ? "bg-[var(--primary)]/20 text-[var(--primary-light)] border-[var(--primary)]/40"
                        : "text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--primary)]/30 hover:text-[var(--foreground)]"
                    )}
                  >
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                )
              )}
            </div>
          </div>
        </Reveal>

        {/* ── Session list ── */}
        {filteredSessions.length === 0 ? (
          <Reveal delay={0.1}>
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center border border-[var(--border)]">
                <Bot className="w-8 h-8 text-[var(--muted-foreground)]" aria-hidden="true" />
              </div>
              <p className="text-[var(--muted-foreground)] text-sm max-w-xs">
                {searchQuery || filter !== "all"
                  ? "No sessions match your search or filter."
                  : "No sessions yet. Start a new chat to begin testing."}
              </p>
              <Link
                href="/chat-home-main-agent-chat-interface"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 text-[var(--primary-light)] text-sm font-medium transition-all duration-200 border border-[var(--primary)]/30"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Start New Session
              </Link>
            </div>
          </Reveal>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-3"
          >
            {filteredSessions.map((session) => {
              const stats = getSessionStats(session);
              const preview = getLastAssistantPreview(session);
              const isConfirming = deleteConfirm === session.id;

              return (
                <motion.div
                  key={session.id}
                  variants={fadeInUp}
                  className="glass rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all duration-300 overflow-hidden group"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: session info */}
                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h2 className="text-sm font-semibold text-[var(--foreground)] truncate">
                            {session.title || "Untitled Session"}
                          </h2>
                          {(session.frameworks ?? []).map((fw) => (
                            <span
                              key={fw}
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-medium capitalize",
                                FRAMEWORK_COLORS[fw.toLowerCase()] ??
                                  "bg-white/5 text-[var(--muted-foreground)] border border-[var(--border)]"
                              )}
                            >
                              {fw}
                            </span>
                          ))}
                        </div>

                        {/* URL */}
                        {session.url && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <Globe
                              className="w-3 h-3 text-[var(--accent)] flex-shrink-0"
                              aria-hidden="true"
                            />
                            <span className="text-xs text-[var(--accent)] font-mono truncate">
                              {extractDomain(session.url)}
                            </span>
                          </div>
                        )}

                        {/* Preview */}
                        <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 leading-relaxed mb-3">
                          {preview}
                        </p>

                        {/* Stats row */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                            <MessageSquare className="w-3 h-3" aria-hidden="true" />
                            <span>{stats.messageCount} messages</span>
                          </div>
                          {stats.testCaseCount > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                              <CheckSquare className="w-3 h-3" aria-hidden="true" />
                              <span>{stats.testCaseCount} test cases</span>
                            </div>
                          )}
                          {stats.excelExported && (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                              <FileText className="w-3 h-3" aria-hidden="true" />
                              <span>Excel exported</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                            <Calendar className="w-3 h-3" aria-hidden="true" />
                            <span>{formatRelativeTime(session.updatedAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: actions */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {isConfirming ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--muted-foreground)]">
                              Delete?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(session.id)}
                              className="px-2.5 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-all duration-200 border border-red-500/30"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2.5 py-1 rounded-md glass hover:bg-white/10 text-[var(--muted-foreground)] text-xs font-medium transition-all duration-200 border border-[var(--border)]"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(session.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                            aria-label="Delete session"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}

                        <Link
                          href={`/chat-home-main-agent-chat-interface?session=${session.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)]/15 hover:bg-[var(--primary)]/25 text-[var(--primary-light)] text-xs font-medium transition-all duration-200 border border-[var(--primary)]/20"
                        >
                          <Play className="w-3 h-3" aria-hidden="true" />
                          Resume
                          <ChevronRight className="w-3 h-3" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* ── Clear all ── */}
        {sessions.length > 0 && (
          <Reveal delay={0.15}>
            <div className="mt-8 flex justify-center">
              {deleteConfirm === "__all__" ? (
                <div className="flex items-center gap-3 p-4 rounded-xl glass border border-red-500/30">
                  <AlertCircle
                    className="w-4 h-4 text-red-400 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-[var(--muted-foreground)]">
                    Delete all {sessions.length} sessions?
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-all duration-200 border border-red-500/30"
                  >
                    Delete All
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(null)}
                    className="px-3 py-1.5 rounded-lg glass hover:bg-white/10 text-[var(--muted-foreground)] text-xs font-medium transition-all duration-200 border border-[var(--border)]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm("__all__")}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  Clear All Sessions
                </button>
              )}
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}

import { supabase } from '@/lib/supabase/client';
import type { ChatSession, ChatMessage } from '@/lib/data';

// ─── Row shape returned from Supabase ────────────────────────────────────────

interface ChatSessionRow {
  id: string;
  user_id: string;
  title: string;
  url: string | null;
  messages: string; // JSON string
  frameworks: string[] | null;
  test_case_count: number | null;
  excel_exported: boolean | null;
  agent_prompt_snapshot: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Row → ChatSession mapper ─────────────────────────────────────────────────

function rowToSession(row: ChatSessionRow): ChatSession {
  let messages: ChatMessage[] = [];
  try {
    const parsed = JSON.parse(row.messages);
    if (Array.isArray(parsed)) {
      messages = parsed as ChatMessage[];
    }
  } catch {
    messages = [];
  }

  return {
    id: row.id,
    title: row.title,
    url: row.url ?? undefined,
    messages,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    frameworks: row.frameworks ?? undefined,
    testCaseCount: row.test_case_count ?? undefined,
    excelExported: row.excel_exported ?? undefined,
    agentPromptSnapshot: row.agent_prompt_snapshot ?? undefined,
  };
}

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Fetch all chat sessions for a given user, ordered newest first.
 */
export async function getUserSessions(userId: string): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch sessions: ${error.message}`);
  }

  if (!data) return [];

  return (data as ChatSessionRow[]).map(rowToSession);
}

/**
 * Upsert a single chat session for the given user.
 */
export async function saveSession(
  userId: string,
  session: ChatSession
): Promise<void> {
  const { error } = await supabase.from('chat_sessions').upsert(
    {
      id: session.id,
      user_id: userId,
      title: session.title,
      url: session.url ?? null,
      messages: JSON.stringify(session.messages),
      frameworks: session.frameworks ?? null,
      test_case_count: session.testCaseCount ?? null,
      excel_exported: session.excelExported ?? null,
      agent_prompt_snapshot: session.agentPromptSnapshot ?? null,
      created_at: new Date(session.createdAt).toISOString(),
      updated_at: new Date(session.updatedAt).toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    throw new Error(`Failed to save session: ${error.message}`);
  }
}

/**
 * Delete a single session, scoped to the owning user to prevent cross-user deletion.
 */
export async function deleteSession(
  sessionId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete session: ${error.message}`);
  }
}

/**
 * Delete all sessions belonging to a user.
 */
export async function deleteAllSessions(userId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete all sessions: ${error.message}`);
  }
}

/**
 * Return the currently authenticated Supabase user, or null if not signed in.
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

/**
 * Sign the current user out.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(`Sign-out failed: ${error.message}`);
  }
}

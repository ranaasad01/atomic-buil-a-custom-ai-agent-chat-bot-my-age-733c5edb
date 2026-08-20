import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Singleton Supabase browser client.
 * Safe to import in any Client Component — createBrowserClient handles
 * deduplication internally so only one GoTrue instance is created.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

/**
 * Factory function that returns the same singleton browser client.
 * Useful when a hook or utility prefers the factory pattern.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

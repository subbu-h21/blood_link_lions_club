import { createDbClient } from "@/lib/db/client";

/**
 * Reads one app_settings value (CLAUDE.md "Timing parameters" - tuned by
 * non-developers, never hardcoded in application logic). `value` is
 * jsonb; the caller's generic type is trusted, not validated - every key
 * in app_settings is a small, project-controlled set (Unit 02's seed),
 * not user input.
 */
export async function getAppSetting<T>(key: string): Promise<T> {
  const db = createDbClient();
  const { data, error } = await db
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .single();
  if (error) throw error;
  return data.value as T;
}

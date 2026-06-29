"use client";
import { supabase } from "./supabaseClient";

// This module gives the planner the SAME interface it used in the artifact
// (get / set / list), but backed by the Supabase cloud database instead of
// the browser. Because the shape matches, the planner UI needs almost no changes.
//
// Model: one table `entries` with (user_id, key, value JSONB).
// Row Level Security ensures a user only ever touches their own rows.

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

export const cloudStore = {
  async get(key) {
    const uid = await currentUserId();
    if (!uid) return null;
    const { data, error } = await supabase
      .from("entries")
      .select("value")
      .eq("user_id", uid)
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return null;
    return data.value ?? null;
  },

  async set(key, value) {
    const uid = await currentUserId();
    if (!uid) return;
    // upsert on the (user_id, key) unique constraint
    await supabase
      .from("entries")
      .upsert({ user_id: uid, key, value }, { onConflict: "user_id,key" });
  },

  async list(prefix) {
    const uid = await currentUserId();
    if (!uid) return [];
    const { data, error } = await supabase
      .from("entries")
      .select("key")
      .eq("user_id", uid)
      .like("key", `${prefix}%`);
    if (error || !data) return [];
    return data.map((r) => r.key);
  },

  async delete(key) {
    const uid = await currentUserId();
    if (!uid) return;
    await supabase.from("entries").delete().eq("user_id", uid).eq("key", key);
  },
};

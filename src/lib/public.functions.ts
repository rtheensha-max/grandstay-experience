import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

/** Publishable-key client for public, read-only data during SSR. Created inside handlers only. */
function publicClient() {
  const url = process.env["SUPABASE_URL"] ?? import.meta.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  return createClient<Database>(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key!.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key!);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type Room = Database["public"]["Tables"]["rooms"]["Row"];
export type FoodCategory = Database["public"]["Tables"]["food_categories"]["Row"];
export type FoodItem = Database["public"]["Tables"]["food_items"]["Row"];

export const listRooms = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("rooms")
    .select("*")
    .eq("is_active", true)
    .order("price_per_night", { ascending: true });
  if (error) {
    console.error("listRooms", error);
    return [] as Room[];
  }
  return data as Room[];
});

export const getRoomBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(100) }).parse(input))
  .handler(async ({ data }) => {
    const { data: room, error } = await publicClient()
      .from("rooms")
      .select("*")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) {
      console.error("getRoomBySlug", error);
      return null;
    }
    return (room as Room | null) ?? null;
  });

export const getFoodMenu = createServerFn({ method: "GET" }).handler(async () => {
  const client = publicClient();
  const [cats, items] = await Promise.all([
    client.from("food_categories").select("*").order("sort_order", { ascending: true }),
    client.from("food_items").select("*").eq("is_available", true).order("name"),
  ]);
  if (cats.error || items.error) {
    console.error("getFoodMenu", cats.error ?? items.error);
    return { categories: [] as FoodCategory[], items: [] as FoodItem[] };
  }
  return { categories: cats.data as FoodCategory[], items: items.data as FoodItem[] };
});

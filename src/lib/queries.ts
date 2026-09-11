import { queryOptions } from "@tanstack/react-query";
import { getFoodMenu, getRoomBySlug, listRooms } from "@/lib/public.functions";
import { supabase } from "@/integrations/supabase/client";

export const roomsQuery = queryOptions({
  queryKey: ["rooms"],
  queryFn: () => listRooms(),
  staleTime: 60_000,
});

export const roomBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["rooms", slug],
    queryFn: () => getRoomBySlug({ data: { slug } }),
    staleTime: 60_000,
  });

export const foodMenuQuery = queryOptions({
  queryKey: ["food-menu"],
  queryFn: () => getFoodMenu(),
  staleTime: 60_000,
});

/** Dates (yyyy-mm-dd) on which a room type is fully booked. Browser-side. */
export const roomUnavailableDatesQuery = (roomId: string, from: string, to: string) =>
  queryOptions({
    queryKey: ["room-unavailable", roomId, from, to],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_room_unavailable_dates", {
        _room_id: roomId,
        _from: from,
        _to: to,
      });
      if (error) throw error;
      return (data ?? []) as string[];
    },
    staleTime: 30_000,
  });

/** Number of rooms of this type available for the whole stay. Browser-side. */
export async function getRoomsAvailable(roomId: string, checkIn: string, checkOut: string) {
  const { data, error } = await supabase.rpc("get_rooms_available", {
    _room_id: roomId,
    _check_in: checkIn,
    _check_out: checkOut,
  });
  if (error) throw error;
  return (data ?? 0) as number;
}

/** Signed-in user's bookings. */
export const myBookingsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["my-bookings", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, rooms(slug, images)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

/** Signed-in user's food orders with items. */
export const myOrdersQuery = (userId: string) =>
  queryOptions({
    queryKey: ["my-orders", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

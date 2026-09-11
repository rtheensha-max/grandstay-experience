import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { FOOD_TAX_RATE, ROOM_TAX_RATE } from "@/lib/format";

export type RoomCartItem = {
  kind: "room";
  id: string; // cart line id
  roomId: string;
  slug: string;
  name: string;
  image: string;
  pricePerNight: number;
  checkIn: string; // yyyy-mm-dd
  checkOut: string; // yyyy-mm-dd
  nights: number;
  guests: number;
  quantity: number; // number of rooms
};

export type FoodCartItem = {
  kind: "food";
  id: string; // cart line id
  foodId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
};

export type CartItem = RoomCartItem | FoodCartItem;

export type Coupon = {
  code: string;
  description: string;
  discount_type: "percent" | "fixed";
  value: number;
  min_amount: number;
  max_discount: number | null;
};

type State = { items: CartItem[]; coupon: Coupon | null };

type Action =
  | { type: "hydrate"; state: State }
  | { type: "addRoom"; item: Omit<RoomCartItem, "id" | "kind"> }
  | { type: "addFood"; item: Omit<FoodCartItem, "id" | "kind"> }
  | { type: "setQuantity"; id: string; quantity: number }
  | { type: "remove"; id: string }
  | { type: "setCoupon"; coupon: Coupon | null }
  | { type: "clear" };

const STORAGE_KEY = "grandstay-cart-v1";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "addRoom": {
      const existing = state.items.find(
        (i): i is RoomCartItem =>
          i.kind === "room" &&
          i.roomId === action.item.roomId &&
          i.checkIn === action.item.checkIn &&
          i.checkOut === action.item.checkOut,
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === existing.id ? { ...i, quantity: i.quantity + action.item.quantity } : i,
          ),
        };
      }
      return { ...state, items: [...state.items, { kind: "room", id: uid(), ...action.item }] };
    }
    case "addFood": {
      const existing = state.items.find(
        (i): i is FoodCartItem => i.kind === "food" && i.foodId === action.item.foodId,
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === existing.id ? { ...i, quantity: i.quantity + action.item.quantity } : i,
          ),
        };
      }
      return { ...state, items: [...state.items, { kind: "food", id: uid(), ...action.item }] };
    }
    case "setQuantity":
      if (action.quantity <= 0) {
        return { ...state, items: state.items.filter((i) => i.id !== action.id) };
      }
      return {
        ...state,
        items: state.items.map((i) => (i.id === action.id ? { ...i, quantity: action.quantity } : i)),
      };
    case "remove":
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case "setCoupon":
      return { ...state, coupon: action.coupon };
    case "clear":
      return { items: [], coupon: null };
    default:
      return state;
  }
}

export type CartTotals = {
  roomSubtotal: number;
  foodSubtotal: number;
  subtotal: number;
  roomTax: number;
  foodTax: number;
  tax: number;
  discount: number;
  total: number;
  itemCount: number;
};

export function computeDiscount(coupon: Coupon | null, subtotal: number) {
  if (!coupon || subtotal < coupon.min_amount) return 0;
  let d = coupon.discount_type === "percent" ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.max_discount != null) d = Math.min(d, coupon.max_discount);
  return Math.min(Math.round(d), subtotal);
}

export function computeTotals(items: CartItem[], coupon: Coupon | null): CartTotals {
  const roomSubtotal = items
    .filter((i): i is RoomCartItem => i.kind === "room")
    .reduce((s, i) => s + i.pricePerNight * i.nights * i.quantity, 0);
  const foodSubtotal = items
    .filter((i): i is FoodCartItem => i.kind === "food")
    .reduce((s, i) => s + i.price * i.quantity, 0);
  const subtotal = roomSubtotal + foodSubtotal;
  const roomTax = Math.round(roomSubtotal * ROOM_TAX_RATE);
  const foodTax = Math.round(foodSubtotal * FOOD_TAX_RATE);
  const tax = roomTax + foodTax;
  const discount = computeDiscount(coupon, subtotal);
  const total = Math.max(0, subtotal + tax - discount);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  return { roomSubtotal, foodSubtotal, subtotal, roomTax, foodTax, tax, discount, total, itemCount };
}

type CartContextValue = {
  items: CartItem[];
  coupon: Coupon | null;
  totals: CartTotals;
  hydrated: boolean;
  addRoom: (item: Omit<RoomCartItem, "id" | "kind">) => void;
  addFood: (item: Omit<FoodCartItem, "id" | "kind">) => void;
  setQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  applyCoupon: (code: string) => Promise<{ ok: true; coupon: Coupon } | { ok: false; error: string }>;
  removeCoupon: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], coupon: null });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        if (parsed && Array.isArray(parsed.items)) {
          dispatch({ type: "hydrate", state: { items: parsed.items, coupon: parsed.coupon ?? null } });
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [state, hydrated]);

  const totals = useMemo(() => computeTotals(state.items, state.coupon), [state]);

  const applyCoupon = useCallback<CartContextValue["applyCoupon"]>(
    async (rawCode) => {
      const code = rawCode.trim().toUpperCase();
      if (!code) return { ok: false, error: "Enter a coupon code" };
      const { data, error } = await supabase
        .from("coupons")
        .select("code, description, discount_type, value, min_amount, max_discount")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();
      if (error || !data) return { ok: false, error: "That coupon code isn't valid" };
      const coupon: Coupon = {
        code: data.code,
        description: data.description,
        discount_type: data.discount_type as "percent" | "fixed",
        value: Number(data.value),
        min_amount: Number(data.min_amount),
        max_discount: data.max_discount == null ? null : Number(data.max_discount),
      };
      const subtotal = computeTotals(state.items, null).subtotal;
      if (subtotal < coupon.min_amount) {
        return {
          ok: false,
          error: `This coupon needs a minimum order of ₹${coupon.min_amount.toLocaleString("en-IN")}`,
        };
      }
      dispatch({ type: "setCoupon", coupon });
      return { ok: true, coupon };
    },
    [state.items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      coupon: state.coupon,
      totals,
      hydrated,
      addRoom: (item) => dispatch({ type: "addRoom", item }),
      addFood: (item) => dispatch({ type: "addFood", item }),
      setQuantity: (id, quantity) => dispatch({ type: "setQuantity", id, quantity }),
      removeItem: (id) => dispatch({ type: "remove", id }),
      clear: () => dispatch({ type: "clear" }),
      applyCoupon,
      removeCoupon: () => dispatch({ type: "setCoupon", coupon: null }),
    }),
    [state, totals, hydrated, applyCoupon],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

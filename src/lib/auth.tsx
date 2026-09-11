import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(user: User): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (data) return data;
  // First sign-in: create the profile row from sign-up metadata.
  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const insert = {
    id: user.id,
    full_name: meta["full_name"] ?? meta["name"] ?? null,
    email: user.email ?? null,
    phone: meta["phone"] ?? null,
    avatar_url: meta["avatar_url"] ?? meta["picture"] ?? null,
  };
  const { data: created } = await supabase
    .from("profiles")
    .insert(insert)
    .select("id, full_name, email, phone, avatar_url")
    .maybeSingle();
  return created ?? insert;
}

async function loadIsAdmin(userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const hydrateUser = useCallback(async (u: User | null) => {
    if (!u) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    const [p, admin] = await Promise.all([loadProfile(u), loadIsAdmin(u.id)]);
    setProfile(p);
    setIsAdmin(admin);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      // Defer data fetching out of the auth callback.
      setTimeout(() => {
        if (cancelled) return;
        void hydrateUser(s?.user ?? null);
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      }, 0);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      await hydrateUser(data.session?.user ?? null);
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [hydrateUser, router, queryClient]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await hydrateUser(session.user);
  }, [session, hydrateUser]);

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
    navigate({ to: "/", replace: true });
  }, [queryClient, navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      isAdmin,
      loading,
      refreshProfile,
      signOut,
    }),
    [session, profile, isAdmin, loading, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

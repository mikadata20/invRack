import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

export type UserRole = "admin" | "controller" | "operator";

export interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
}

export const useUserRole = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data as UserProfile | null);
    } catch (error) {
      console.error("Error fetching profile:", error);
      // Added detailed logging for debugging
      console.error("Supabase Profile Fetch Error Details:", JSON.stringify(error, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (requiredRole: UserRole | UserRole[]) => {
    if (!profile) return false;
    
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return roles.includes(profile.role);
  };

  const isAdmin = () => hasRole("admin");
  const isController = () => hasRole("controller");
  const isOperator = () => hasRole("operator");

  return {
    session,
    profile,
    loading,
    hasRole,
    isAdmin,
    isController,
    isOperator,
  };
};
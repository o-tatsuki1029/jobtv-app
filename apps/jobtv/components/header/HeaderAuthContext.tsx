"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getHeaderAuthInfo } from "@/lib/actions/auth-actions";

export type HeaderAuthInfo = {
  user: { email: string | null } | null;
  role: "recruiter" | "admin" | "candidate" | null;
  recruiterMenuInfo: {
    displayName: string;
    companyName: string | null;
    email: string | null;
  } | null;
};

const HeaderAuthContext = createContext<HeaderAuthInfo | null | undefined>(undefined);

export function useHeaderAuth(): HeaderAuthInfo | null {
  const value = useContext(HeaderAuthContext);
  if (value === undefined) {
    throw new Error("useHeaderAuth must be used within HeaderAuthProvider");
  }
  return value;
}

interface HeaderAuthProviderProps {
  initialAuthInfo: HeaderAuthInfo | null;
  children: React.ReactNode;
}

export function HeaderAuthProvider({ initialAuthInfo, children }: HeaderAuthProviderProps) {
  const [authInfo, setAuthInfo] = useState<HeaderAuthInfo | null>(initialAuthInfo);

  const refresh = useCallback(() => {
    getHeaderAuthInfo().then((result) => {
      if (result.error || !result.data) {
        setAuthInfo(null);
        return;
      }
      setAuthInfo(result.data);
    });
  }, []);

  useEffect(() => {
    setAuthInfo(initialAuthInfo);
  }, [initialAuthInfo]);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  return (
    <HeaderAuthContext.Provider value={authInfo}>{children}</HeaderAuthContext.Provider>
  );
}

"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

type AppUser = {
  userId?: number | string;
  name?: string;
  email?: string;
};

type UserContextValue = {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const value = useMemo(() => ({ user, setUser }), [user]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    return {
      user: null,
      setUser: () => undefined,
    };
  }

  return context;
}

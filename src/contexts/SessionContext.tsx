"use client";

import { createContext, useContext, ReactNode } from "react";

interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface SessionContextValue {
  user: SessionUser | null;
}

const SessionContext = createContext<SessionContextValue>({ user: null });

export function SessionProvider({
  children,
  user,
}: {
  children: ReactNode;
  user: SessionUser | null;
}) {
  return (
    <SessionContext.Provider value={{ user }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}

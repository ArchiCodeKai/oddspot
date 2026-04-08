"use client";

import { useEffect, useState } from "react";
import { useAuthSync } from "@/hooks/useAuthSync";
import { SessionProvider } from "@/contexts/SessionContext";

interface ClientAuthProviderProps {
  children: React.ReactNode;
  userId?: string;
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
}

export function ClientAuthProvider({
  children,
  userId,
  userName,
  userEmail,
  userImage,
}: ClientAuthProviderProps) {
  const [mounted, setMounted] = useState(false);

  useAuthSync(userId);

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = userId
    ? { id: userId, name: userName, email: userEmail, image: userImage }
    : null;

  if (!mounted) {
    return (
      <SessionProvider user={user}>
        {children}
      </SessionProvider>
    );
  }

  return (
    <SessionProvider user={user}>
      {children}
    </SessionProvider>
  );
}

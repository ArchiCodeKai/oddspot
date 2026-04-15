"use client";

import { useAuthSync } from "@/hooks/useAuthSync";
import { SessionProvider } from "@/contexts/SessionContext";
import { LoginPromptModal } from "@/components/auth/LoginPromptModal";

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
  useAuthSync(userId);

  const user = userId
    ? { id: userId, name: userName, email: userEmail, image: userImage }
    : null;

  return (
    <SessionProvider user={user}>
      {children}
      {/* LoginPromptModal 掛在全域，任何地方都能透過 useLoginPromptStore 觸發 */}
      <LoginPromptModal />
    </SessionProvider>
  );
}

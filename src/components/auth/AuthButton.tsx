"use client";

import { useState } from "react";
import { useSession } from "@/contexts/SessionContext";
import { signIn, signOut } from "next-auth/react";

export function AuthButton() {
  const { user } = useSession();
  const [showMenu, setShowMenu] = useState(false);

  const handleSignIn = async () => {
    await signIn("google");
  };

  const handleSignOut = () => {
    signOut();
    setShowMenu(false);
  };

  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        className="px-4 py-2 rounded-lg bg-white text-zinc-900 text-sm font-medium hover:opacity-90 transition-opacity"
      >
        登入
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-colors"
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name || "User"}
            className="w-6 h-6 rounded-full"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-white">
            {user.name?.[0] || "?"}
          </div>
        )}
        <span className="text-sm text-white">{user.name || "用戶"}</span>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-50">
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-3 text-sm text-left text-zinc-300 hover:bg-white/5 rounded-lg transition-colors"
            >
              登出
            </button>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useActionToastStore } from "@/store/useActionToastStore";

// 有入口連結時停留久一點，讓使用者來得及點
const TOAST_DURATION = 2500;
const TOAST_DURATION_WITH_LINK = 3500;

// 全域動作提示：掛在 layout，收藏 / 投稿等寫入動作完成後顯示結果入口
export function ActionToast() {
  const { message, href, linkLabel, nonce, clear } = useActionToastStore();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(
      clear,
      href ? TOAST_DURATION_WITH_LINK : TOAST_DURATION,
    );
    return () => clearTimeout(timer);
  }, [message, href, nonce, clear]);

  if (!message) return null;

  return (
    <div
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[120] pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div
        className="px-5 py-3 text-sm text-center font-content pointer-events-auto"
        style={{
          borderRadius: 2,
          background: "var(--panel-glass-strong)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid var(--line-strong)",
          color: "var(--foreground)",
          boxShadow: "var(--shadow-glow)",
        }}
      >
        {message}
        {href && linkLabel && (
          <Link
            href={href}
            onClick={clear}
            className="block mt-1.5 text-xs uppercase font-bold"
            style={{
              color: "var(--accent)",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              letterSpacing: "0.16em",
            }}
          >
            {linkLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

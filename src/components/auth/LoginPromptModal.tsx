"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";
import { useLoginPromptStore } from "@/store/useLoginPromptStore";

export function LoginPromptModal() {
  const { isOpen, close } = useLoginPromptStore();

  // ESC 關閉
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    close();
    await signIn("google");
  };

  const handleLineLogin = async () => {
    close();
    await signIn("line");
  };

  return (
    <>
      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .modal-card { animation: modal-in 0.22s ease forwards; }
        .oauth-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 20px;
          border-radius: 2px;
          font-size: 0.8rem;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #fff;
          border: none;
          color: #1f2937;
          font-weight: 600;
        }
        .oauth-btn:hover { filter: brightness(0.96); }
        .google-btn {
          background: #fff;
          color: #1f2937;
        }
        .line-btn {
          background: #06C755;
          color: #fff;
        }
      `}</style>

      {/* 背景 overlay */}
      <div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
        style={{
          background: "rgb(var(--background-rgb) / 0.82)",
          backdropFilter: "blur(6px)",
        }}
        onClick={close}
      >
        {/* Modal 卡片 */}
        <div
          className="modal-card relative w-full sm:max-w-sm mx-4 mb-6 sm:mb-0 p-7"
          style={{
            background: "var(--panel-glass-strong)",
            border: "1px solid var(--line-strong)",
            borderRadius: "4px",
            boxShadow:
              "0 0 60px rgb(var(--accent-rgb) / 0.08), 0 24px 48px rgb(var(--background-rgb) / 0.36)",
            backdropFilter: "blur(16px)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 關閉按鈕 */}
          <button
            onClick={close}
            className="absolute top-4 right-4 text-xs tracking-widest transition-colors"
            style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--accent)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--muted)")}
          >
            ✕
          </button>

          {/* OddSpot 眼睛 icon */}
          <div className="flex justify-center mb-5">
            <svg
              width="44"
              height="53"
              viewBox="0 0 110 130"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ filter: "drop-shadow(0 0 8px rgb(var(--accent-rgb) / 0.5))" }}
            >
              <path
                d="M55 8 C70 4,90 18,92 40 C94 56,90 72,82 86 C78 94,76 104,78 112 C79 117,82 120,84 116 C86 112,84 106,80 102 C74 98,60 110,48 116 C38 122,24 118,18 106 C12 94,14 76,18 62 C22 48,30 18,55 8Z"
                stroke="var(--accent)"
                strokeWidth="3"
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <path
                d="M33 50 C32 40,44 30,58 30 C69 30,78 36,76 43 C74 52,62 59,50 58 C39 58,33 56,33 50Z"
                stroke="var(--accent)"
                strokeWidth="2"
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <path
                d="M57 36 C62 36,66 40,65 45 C64 51,59 55,54 54 C49 54,47 50,48 45 C49 41,52 36,57 36Z"
                fill="var(--accent)"
              />
              <path
                d="M55 42 C58 42,60 44,59 47 C58 50,55 51,53 50 C51 49,50 47,51 45 C52 43,53 42,55 42Z"
                fill="rgb(var(--background-rgb) / 0.78)"
              />
              <ellipse cx="61" cy="40" rx="1.4" ry="1.1" fill="#fff" opacity="0.82" />
            </svg>
          </div>

          {/* 文字 */}
          <p
            className="text-[10px] tracking-[0.3em] uppercase text-center mb-2"
            style={{ color: "rgb(var(--accent-rgb) / 0.55)" }}
          >
            需要登入
          </p>
          <h2
            className="text-base font-bold text-center mb-2"
            style={{ color: "var(--foreground)" }}
          >
            收藏景點需要帳號
          </h2>
          <p
            className="text-xs text-center leading-relaxed mb-7"
            style={{ color: "var(--muted)" }}
          >
            使用 Google 或 LINE 登入，即可收藏景點、規劃行程。
            <br />
            無須另外註冊。
          </p>

          {/* OAuth 登入按鈕 */}
          <button className="oauth-btn google-btn" onClick={handleGoogleLogin}>
            {/* Google G logo */}
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.174 0 7.548 0 9s.348 2.826.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            使用 Google 帳號登入
          </button>
          <button className="oauth-btn line-btn mt-3" onClick={handleLineLogin}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <rect width="24" height="24" rx="4" fill="#06C755" />
              <path
                d="M6 7.8h1.6v5.1h2.8v1.4H6V7.8Zm5.2 0h1.6v6.5h-1.6V7.8Zm2.8 0h1.5l2.4 3.6V7.8h1.5v6.5h-1.5l-2.4-3.6v3.6H14V7.8Z"
                fill="#fff"
              />
            </svg>
            使用 LINE 帳號登入
          </button>

          {/* 取消 */}
          <button
            onClick={close}
            className="w-full mt-3 py-2.5 text-xs tracking-widest uppercase transition-colors"
            style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--muted)")}
          >
            繼續瀏覽（不登入）
          </button>
        </div>
      </div>
    </>
  );
}

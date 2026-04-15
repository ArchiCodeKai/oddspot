"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const LS_KEY = "oddspot-onboarded";

export function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const t = useTranslations("onboarding");

  useEffect(() => {
    const done = localStorage.getItem(LS_KEY);
    if (!done) {
      const timer = setTimeout(() => setVisible(true), 350);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setLeaving(true);
    localStorage.setItem(LS_KEY, "1");
    setTimeout(() => setVisible(false), 480);
  };

  if (!visible) return null;

  return (
    <div
      aria-modal="true"
      role="dialog"
      aria-label="OddSpot 歡迎畫面"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgb(var(--background-rgb) / 0.97)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        animation: leaving
          ? "ob-out 0.48s ease forwards"
          : "ob-in 0.55s ease forwards",
      }}
    >
      <style>{`
        @keyframes ob-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ob-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes ob-eye-pulse {
          0%, 100% { filter: drop-shadow(0 0 10px var(--accent)) drop-shadow(0 0 30px rgb(var(--accent-rgb) / 0.5)); }
          50%       { filter: drop-shadow(0 0 20px var(--accent)) drop-shadow(0 0 55px rgb(var(--accent-rgb) / 0.75)); }
        }
        @keyframes ob-eye-blink {
          0%, 90%, 100% { transform: scaleY(1); }
          93%, 97%      { transform: scaleY(0.05); }
        }
        @keyframes ob-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ob-eye   { animation: ob-eye-pulse 2.8s ease-in-out infinite; }
        .ob-blink { animation: ob-eye-blink 6s ease-in-out infinite; transform-origin: 55px 44px; }
        .ob-t1 { animation: ob-up 0.6s ease 0.25s both; }
        .ob-t2 { animation: ob-up 0.6s ease 0.45s both; }
        .ob-t3 { animation: ob-up 0.6s ease 0.65s both; }
        .ob-t4 { animation: ob-up 0.6s ease 0.85s both; }
        .ob-t5 { animation: ob-up 0.6s ease 1.05s both; }
        .ob-cta {
          display: flex; align-items: center; gap: 10px;
          padding: 15px 44px; min-height: 52px;
          background: rgb(var(--accent-rgb) / 0.08);
          border: 1px solid rgb(var(--accent-rgb) / 0.45); border-radius: 2px;
          font-size: 0.8rem; letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--accent); cursor: pointer;
          box-shadow: 0 0 28px rgb(var(--accent-rgb) / 0.14), inset 0 0 24px rgb(var(--accent-rgb) / 0.04);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          font-family: var(--font-space-mono), monospace;
        }
        .ob-cta:hover {
          border-color: rgb(var(--accent-rgb) / 0.7);
          background: rgb(var(--accent-rgb) / 0.13);
          box-shadow: 0 0 40px rgb(var(--accent-rgb) / 0.22), inset 0 0 32px rgb(var(--accent-rgb) / 0.07);
        }
        .ob-skip {
          font-size: 0.68rem; letter-spacing: 0.22em; text-transform: uppercase;
          color: rgb(var(--accent-rgb) / 0.28); cursor: pointer;
          background: none; border: none; padding: 12px 20px; min-height: 44px;
          transition: color 0.2s ease;
          font-family: var(--font-space-mono), monospace;
        }
        .ob-skip:hover { color: rgb(var(--accent-rgb) / 0.55); }
        @media (prefers-reduced-motion: reduce) {
          .ob-eye, .ob-blink { animation: none; }
          .ob-t1, .ob-t2, .ob-t3, .ob-t4, .ob-t5 { animation: none; opacity: 1; transform: none; }
        }
      `}</style>

      {/* CRT 掃描線 */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgb(var(--accent-rgb) / 0.007) 3px, rgb(var(--accent-rgb) / 0.007) 4px)",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex", flexDirection: "column", alignItems: "center",
          textAlign: "center", padding: "0 32px", maxWidth: 420, width: "100%",
        }}
      >
        {/* 吉祥物眼睛 */}
        <div className="ob-eye" style={{ marginBottom: 36 }}>
          <svg width="120" height="145" viewBox="0 0 110 130" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g className="ob-blink">
              <path d="M55 8 C70 4,90 18,92 40 C94 56,90 72,82 86 C78 94,76 104,78 112 C79 117,82 120,84 116 C86 112,84 106,80 102 C74 98,60 110,48 116 C38 122,24 118,18 106 C12 94,14 76,18 62 C22 48,30 18,55 8Z"
                stroke="var(--accent)" strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
              <path d="M33 50 C32 40,44 30,58 30 C69 30,78 36,76 43 C74 52,62 59,50 58 C39 58,33 56,33 50Z"
                stroke="var(--accent)" strokeWidth="1.8" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
              <path d="M57 36 C62 36,66 40,65 45 C64 51,59 55,54 54 C49 54,47 50,48 45 C49 41,52 36,57 36Z" fill="var(--accent)"/>
              <path d="M55 42 C58 42,60 44,59 47 C58 50,55 51,53 50 C51 49,50 47,51 45 C52 43,53 42,55 42Z" fill="rgb(var(--background-rgb) / 0.78)"/>
              <ellipse cx="61" cy="40" rx="1.6" ry="1.2" fill="#fff" opacity="0.82"/>
            </g>
          </svg>
        </div>

        {/* 品牌標記（Space Mono） */}
        <p className="ob-t1" style={{
          fontSize: "0.6rem", letterSpacing: "0.4em", textTransform: "uppercase",
          color: "rgb(var(--accent-rgb) / 0.55)", marginBottom: 14,
          fontFamily: "var(--font-space-mono), monospace",
        }}>
          {t("badge")}
        </p>

        {/* 品牌名稱（Space Mono） */}
        <h1 className="ob-t2" style={{
          fontSize: "clamp(3.2rem, 12vw, 5rem)", fontWeight: 700,
          letterSpacing: "-0.04em", color: "var(--foreground)",
          textShadow: "0 0 64px rgb(var(--accent-rgb) / 0.3)",
          marginBottom: 14, lineHeight: 1,
          fontFamily: "var(--font-space-mono), monospace",
        }}>
          OddSpot
        </h1>

        {/* 標語（Noto Sans TC：中文閱讀最佳化） */}
        <p className="ob-t3 font-content" style={{
          fontSize: "0.88rem", letterSpacing: "0.04em",
          color: "var(--muted)", marginBottom: 44, lineHeight: 1.8,
          whiteSpace: "pre-line",
        }}>
          {t("tagline")}
        </p>

        {/* 主要 CTA */}
        <button className="ob-cta ob-t4" onClick={dismiss}>
          {t("cta")}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>

        {/* 跳過 */}
        <button className="ob-skip ob-t5" onClick={dismiss}>
          {t("skip")}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useLoginPromptStore } from "@/store/useLoginPromptStore";

// 縮小版 Google G logo（14×14，保留品牌色當辨識點）
function GoogleMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853" />
      <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.174 0 7.548 0 9s.348 2.826.957 4.039l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

// 縮小版 LINE logo（14×14，保留 LINE 品牌綠當辨識點）
function LineMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="#06C755" />
      <path
        d="M6 7.8h1.6v5.1h2.8v1.4H6V7.8Zm5.2 0h1.6v6.5h-1.6V7.8Zm2.8 0h1.5l2.4 3.6V7.8h1.5v6.5h-1.5l-2.4-3.6v3.6H14V7.8Z"
        fill="#fff"
      />
    </svg>
  );
}

// SpotPopup 用同一條 cubic-bezier，跨 modal 動畫一致
const ACID_EASE = [0.32, 0.72, 0, 1] as const;

export function LoginPromptModal() {
  const { isOpen, close } = useLoginPromptStore();
  const t = useTranslations("auth.prompt");
  // 尊重系統 prefers-reduced-motion 偏好（accessibility）
  const shouldReduceMotion = useReducedMotion();

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
    <motion.div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{
        background: "rgb(var(--background-rgb) / 0.82)",
        backdropFilter: "blur(6px)",
      }}
      onClick={close}
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: ACID_EASE }}
    >
      {/* Modal 卡片 — 跟 SpotPopup 同一條 ease 曲線 */}
      <motion.div
        className="relative w-full sm:max-w-sm mx-4 mb-6 sm:mb-0 p-7"
        style={{
          background: "var(--panel-glass-strong)",
          border: "1px solid var(--line-strong)",
          borderRadius: 2,
          boxShadow:
            "0 0 60px rgb(var(--accent-rgb) / 0.08), 0 24px 48px rgb(var(--background-rgb) / 0.36)",
          backdropFilter: "blur(16px)",
        }}
        onClick={(e) => e.stopPropagation()}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: ACID_EASE }}
      >
        {/* 關閉按鈕（acid X 框） */}
        <button
          onClick={close}
          aria-label={t("close")}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center transition-colors"
          style={{
            background: "rgb(var(--accent-rgb) / 0.06)",
            border: "1px solid var(--line)",
            borderRadius: 2,
            color: "var(--muted)",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgb(var(--accent-rgb) / 0.4)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line)";
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* OddSpot 眼睛 icon */}
        <div className="flex justify-center mb-5">
          <svg
            width="44"
            height="53"
            viewBox="0 0 110 130"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
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

        {/* 文案 — acid B-grade 風（i18n） */}
        <p
          className="text-[10px] text-center mb-2"
          style={{
            color: "rgb(var(--accent-rgb) / 0.65)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          {t("badge")}
        </p>
        <h2
          className="text-base text-center mb-2"
          style={{
            color: "var(--foreground)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {t("title")}
        </h2>
        <p
          className="text-xs text-center leading-relaxed mb-6 font-content"
          style={{ color: "var(--muted)" }}
        >
          {t("description")}
          <br />
          {t("descriptionLine2")}
        </p>

        {/* OAuth 按鈕區 — acid wireframe 風 */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 transition-all"
            style={{
              minHeight: 48,
              padding: "12px 16px",
              background: "transparent",
              border: "1px solid var(--line-strong)",
              borderRadius: 2,
              color: "var(--foreground)",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.18em",
              fontWeight: 700,
              textTransform: "uppercase",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgb(var(--accent-rgb) / 0.08)";
              e.currentTarget.style.borderColor = "rgb(var(--accent-rgb) / 0.55)";
              e.currentTarget.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "var(--line-strong)";
              e.currentTarget.style.color = "var(--foreground)";
            }}
          >
            <GoogleMark />
            {t("googleAction")}
          </button>

          <button
            onClick={handleLineLogin}
            className="w-full flex items-center justify-center gap-3 transition-all"
            style={{
              minHeight: 48,
              padding: "12px 16px",
              background: "transparent",
              border: "1px solid var(--line-strong)",
              borderRadius: 2,
              color: "var(--foreground)",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.18em",
              fontWeight: 700,
              textTransform: "uppercase",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgb(var(--accent-rgb) / 0.08)";
              e.currentTarget.style.borderColor = "rgb(var(--accent-rgb) / 0.55)";
              e.currentTarget.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "var(--line-strong)";
              e.currentTarget.style.color = "var(--foreground)";
            }}
          >
            <LineMark />
            {t("lineAction")}
          </button>
        </div>

        {/* 繼續匿名 — dashed border 弱按鈕（acid 「次要選項」視覺暗示） */}
        <button
          onClick={close}
          className="w-full mt-4 transition-all"
          style={{
            minHeight: 40,
            padding: "10px 16px",
            background: "transparent",
            border: "1px dashed var(--line)",
            borderRadius: 2,
            color: "var(--muted)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 10,
            letterSpacing: "0.22em",
            fontWeight: 700,
            textTransform: "uppercase",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--foreground)";
            e.currentTarget.style.borderStyle = "solid";
            e.currentTarget.style.borderColor = "var(--line-strong)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--muted)";
            e.currentTarget.style.borderStyle = "dashed";
            e.currentTarget.style.borderColor = "var(--line)";
          }}
        >
          {t("skip")}
        </button>
      </motion.div>
    </motion.div>
  );
}

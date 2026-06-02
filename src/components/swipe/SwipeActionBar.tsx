"use client";

import { useTranslations } from "next-intl";
import { useSession } from "@/contexts/SessionContext";
import { useLoginPromptStore } from "@/store/useLoginPromptStore";

interface SwipeActionBarProps {
  onSkip: () => void;
  onSave: () => void;
  onSaveAndAddToTrip: () => void;
  tripCount: number;
  showTripFlash: boolean;
}

export function SwipeActionBar({
  onSkip,
  onSave,
  onSaveAndAddToTrip,
  tripCount,
  showTripFlash,
}: SwipeActionBarProps) {
  const t = useTranslations("swipe");
  const { user } = useSession();
  const openLoginPrompt = useLoginPromptStore((s) => s.open);

  const handleSaveClick = () => {
    // 未登入 → 彈出 lazy auth modal
    if (!user) {
      openLoginPrompt();
      return;
    }
    onSave();
  };

  const btnBase: React.CSSProperties = {
    width: 64,
    height: 64,
    borderRadius: "999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--panel-glass-strong)",
    border: "1px solid var(--line-strong)",
    color: "var(--muted)",
    transition:
      "transform 0.14s ease, color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease",
    cursor: "pointer",
    position: "relative",
    backdropFilter: "blur(14px)",
    boxShadow:
      "0 14px 30px rgb(var(--background-rgb) / 0.5), inset 0 1px 0 rgb(var(--accent-rgb) / 0.16)",
  };

  return (
    <div className="flex items-center justify-center gap-6">
      <style>{`
        .swipe-action-button:hover,
        .swipe-action-button:focus-visible {
          color: var(--accent);
          border-color: rgb(var(--accent-rgb) / 0.56);
          box-shadow:
            0 14px 30px rgb(var(--background-rgb) / 0.52),
            inset 0 1px 0 rgb(var(--accent-rgb) / 0.24);
        }
        .swipe-action-button:active {
          transform: translateY(2px);
          box-shadow:
            0 8px 18px rgb(var(--background-rgb) / 0.48),
            inset 0 3px 10px rgb(var(--background-rgb) / 0.34);
        }
        .swipe-action-tooltip {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          bottom: calc(100% + 9px);
          padding: 4px 8px;
          border: 1px solid var(--line);
          border-radius: 2px;
          background: var(--panel-glass-strong);
          color: var(--foreground);
          font-family: var(--font-jetbrains-mono), monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.16s ease, transform 0.16s ease;
        }
        .swipe-action-button:hover .swipe-action-tooltip,
        .swipe-action-button:focus-visible .swipe-action-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(-2px);
        }
        .swipe-action-main {
          width: 76px;
          height: 76px;
          color: var(--accent);
          background:
            linear-gradient(180deg, rgb(var(--accent-rgb) / 0.16), rgb(var(--background-rgb) / 0.34)),
            var(--panel-glass-strong);
          box-shadow:
            0 18px 40px rgb(var(--background-rgb) / 0.6),
            inset 0 1px 0 rgb(var(--accent-rgb) / 0.26);
        }
        .acid-plus {
          position: relative;
          width: 36px;
          height: 36px;
          display: block;
        }
        .acid-plus span {
          position: absolute;
          left: 50%;
          top: 50%;
          display: block;
          background: currentColor;
          border-radius: 999px;
          transform: translate(-50%, -50%);
        }
        .acid-plus span:first-child {
          width: 34px;
          height: 10px;
        }
        .acid-plus span:last-child {
          width: 10px;
          height: 34px;
        }
        @media (prefers-reduced-motion: reduce) {
          .swipe-action-button {
            transform: none;
          }
        }
      `}</style>
      {/* 跳過 */}
      <button
        onClick={onSkip}
        className="swipe-action-button"
        style={btnBase}
        aria-label={t("skip")}
        title={t("skip")}
      >
        <span className="swipe-action-tooltip">{t("skip")}</span>
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* 收藏（未登入時 → lazy auth） */}
      <button
        onClick={handleSaveClick}
        className="swipe-action-button swipe-action-main"
        style={{
          ...btnBase,
          width: 76,
          height: 76,
          ...(showTripFlash
            ? {
                background: "rgb(var(--accent-rgb) / 0.15)",
                borderColor: "var(--line-strong)",
                color: "var(--accent)",
                boxShadow:
                  "0 16px 34px rgb(var(--background-rgb) / 0.62), inset 0 1px 0 rgb(var(--accent-rgb) / 0.3)",
              }
            : {}),
        }}
        aria-label={t("save")}
        title={!user ? t("loginToSave") : t("save")}
      >
        <span className="swipe-action-tooltip">{!user ? t("loginToSave") : t("save")}</span>
        <span className="acid-plus" aria-hidden="true">
          <span />
          <span />
        </span>
        {tripCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{
              background: "var(--accent)",
              color: "var(--background)",
              border: "1px solid var(--background)",
              boxShadow: "0 0 12px rgb(var(--accent-rgb) / 0.5)",
            }}
          >
            {tripCount}
          </span>
        )}
      </button>

      {/* 收藏 + 加入今日行程 */}
      <button
        onClick={onSaveAndAddToTrip}
        className="swipe-action-button"
        style={btnBase}
        aria-label={t("addToTrip")}
        title={t("addToTrip")}
      >
        <span className="swipe-action-tooltip">{t("addToTrip")}</span>
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
    </div>
  );
}

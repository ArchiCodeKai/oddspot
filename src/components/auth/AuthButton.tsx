"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/contexts/SessionContext";
import { signIn, signOut } from "next-auth/react";
import { useSavedStore } from "@/store/useSavedStore";
import { useSwipeStore } from "@/store/useSwipeStore";
import { useTranslations } from "next-intl";

export function AuthButton() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("auth");

  const savedCount = useSavedStore((s) => s.savedSpotIds.length);
  const tripCount = useSwipeStore((s) => s.tripSpotIds.length);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // 未登入 → 登入按鈕
  if (!user) {
    return (
      <button
        onClick={() => signIn("google")}
        className="flex items-center gap-2 px-4 py-2 text-xs tracking-widest uppercase transition-all"
        style={{
          color: "var(--accent)",
          border: "1px solid var(--line-strong)",
          borderRadius: "2px",
          background: "rgb(var(--accent-rgb) / 0.04)",
          boxShadow: "var(--shadow-glow)",
          cursor: "pointer",
          minHeight: 44,
          backdropFilter: "blur(10px)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgb(var(--accent-rgb) / 0.6)";
          e.currentTarget.style.boxShadow = "0 0 18px rgb(var(--accent-rgb) / 0.18)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--line-strong)";
          e.currentTarget.style.boxShadow = "var(--shadow-glow)";
        }}
      >
        {/* Google G 圖示 */}
        <svg width="13" height="13" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
          <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.174 0 7.548 0 9s.348 2.826.957 4.039l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        {t("login")}
      </button>
    );
  }

  // 已登入 → avatar + dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 transition-all backdrop-blur-sm"
        style={{
          border: "1px solid var(--line)",
          borderRadius: "2px",
          background: open ? "rgb(var(--accent-rgb) / 0.06)" : "var(--panel-glass)",
          cursor: "pointer",
          minHeight: 44,
          boxShadow: "var(--shadow-glow)",
        }}
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name || t("user")}
            className="w-6 h-6 rounded-sm object-cover"
          />
        ) : (
          <div
            className="w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold"
            style={{ background: "rgb(var(--accent-rgb) / 0.15)", color: "var(--accent)" }}
          >
            {user.name?.[0]?.toUpperCase() || "?"}
          </div>
        )}
        {/* 使用者名稱：Noto Sans TC 讓中文名字好看 */}
        <span
          className="text-xs tracking-wider max-w-[80px] truncate font-content"
          style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
        >
          {user.name || t("user")}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"
          style={{
            color: "var(--muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-1.5 w-56 z-50 overflow-hidden"
          style={{
            background: "var(--panel-glass-strong)",
            border: "1px solid var(--line)",
            borderRadius: "2px",
            boxShadow:
              "0 16px 48px rgb(var(--background-rgb) / 0.24), 0 0 32px rgb(var(--accent-rgb) / 0.06)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* User header */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
            {/* 名字用 Noto Sans TC */}
            <p className="text-xs font-bold truncate font-content" style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}>
              {user.name || t("user")}
            </p>
            {user.email && (
              <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--muted)" }}>
                {user.email}
              </p>
            )}
          </div>

          <DropdownItem
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            }
            label={t("saved")}
            badge={savedCount}
            onClick={() => setOpen(false)}
          />

          <DropdownItem
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            }
            label={t("trip")}
            badge={tripCount}
            onClick={() => setOpen(false)}
          />

          <div style={{ height: "1px", background: "var(--line)", margin: "4px 0" }} />

          <button
            onClick={() => { signOut(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-xs tracking-wider transition-colors"
            style={{ color: "var(--muted)", cursor: "pointer", minHeight: 44 }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#f87171";
              e.currentTarget.style.background = "rgba(239,68,68,0.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--muted)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  icon, label, badge, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 text-xs tracking-wider transition-colors"
      style={{ color: "var(--foreground)", cursor: "pointer", minHeight: 44 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--accent-rgb) / 0.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span className="flex items-center gap-2.5" style={{ color: "var(--muted)" }}>
        {icon}
        {label}
      </span>
      <span
        className="text-[10px] px-1.5 py-0.5 rounded-sm font-bold"
        style={{
          background: badge > 0 ? "rgb(var(--accent-rgb) / 0.12)" : "rgb(var(--foreground-rgb) / 0.04)",
          color: badge > 0 ? "var(--accent)" : "var(--muted)",
        }}
      >
        {badge}
      </span>
    </button>
  );
}

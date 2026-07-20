"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/contexts/SessionContext";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSavedStore } from "@/store/useSavedStore";
import { useRoutePlannerStore } from "@/store/useRoutePlannerStore";
import { useTranslations } from "next-intl";

// 右上角登入相關元件群：
// - GuestLoginButton：未登入時 cluster 旁的登入按鈕（展開 OAuth provider 選單）
// - UserMenuIdentity：頭像選單頂部的身分列
// - AccountShortcutLinks：帳號捷徑（已收藏/今日行程只在手機顯示，桌機頂列已有入口）
// - LogoutMenuItem：選單底部的登出列

export function GuestLoginButton() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("auth");

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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 text-xs tracking-widest uppercase transition-all"
        style={{
          color: "var(--accent)",
          border: "1px solid var(--line-strong)",
          borderRadius: "2px",
          background: "rgb(var(--accent-rgb) / 0.04)",
          boxShadow: "var(--shadow-glow)",
          cursor: "pointer",
          height: 44,
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
        {t("login")}
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

      {open && (
        <div
          className="absolute right-0 mt-1.5 w-52 z-50 overflow-hidden"
          style={{
            background: "var(--panel-glass-strong)",
            border: "1px solid var(--line)",
            borderRadius: "2px",
            boxShadow:
              "0 16px 48px rgb(var(--background-rgb) / 0.24), 0 0 32px rgb(var(--accent-rgb) / 0.06)",
            backdropFilter: "blur(12px)",
          }}
        >
          <SignInItem provider="google" label={t("loginWithGoogle")} icon={<GoogleIcon />} />
          <SignInItem provider="line" label={t("loginWithLine")} icon={<LineIcon />} />
        </div>
      )}
    </div>
  );
}

// 頭像選單頂部的身分列（純顯示）
export function UserMenuIdentity() {
  const { user } = useSession();
  const t = useTranslations("auth");

  if (!user) return null;

  return (
    <div className="flex w-full min-w-0 items-center gap-2.5 px-1 py-1">
      <UserAvatar size={28} />
      <span
        className="min-w-0 flex-1 truncate text-xs font-content"
        style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
      >
        {user.name || t("user")}
      </span>
    </div>
  );
}

// 44px 方形頭像（cluster trigger 用）或選單內小頭像
export function UserAvatar({ size = 28 }: { size?: number }) {
  const { user } = useSession();
  const t = useTranslations("auth");

  if (!user) return null;

  return user.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.image}
      alt={user.name || t("user")}
      style={{ width: size, height: size, borderRadius: 2, objectFit: "cover" }}
    />
  ) : (
    <div
      className="flex items-center justify-center font-bold"
      style={{
        width: size,
        height: size,
        borderRadius: 2,
        fontSize: Math.max(10, Math.round(size * 0.4)),
        background: "rgb(var(--accent-rgb) / 0.15)",
        color: "var(--accent)",
      }}
    >
      {user.name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

export function LogoutMenuItem() {
  const t = useTranslations("auth");

  return (
    <button
      onClick={() => signOut()}
      className="w-full flex items-center gap-2.5 px-4 py-3 text-xs tracking-wider transition-colors"
      style={{ color: "var(--muted)", cursor: "pointer", minHeight: 44 }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#f87171";
        e.currentTarget.style.background = "rgba(239,68,68,0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--muted)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      {t("logout")}
    </button>
  );
}

export function AccountShortcutLinks() {
  const router = useRouter();
  const { user } = useSession();
  const t = useTranslations("auth");
  const savedCount = useSavedStore((s) => s.savedSpotIds.length);
  const tripCount = useRoutePlannerStore((s) => s.selectedSpots.length);
  const openRouteSheet = useRoutePlannerStore((s) => s.openSheet);

  if (!user) return null;

  return (
    <div className="flex w-full flex-col gap-1">
      {/* 已收藏 / 今日行程：桌機頂列已有入口，只在手機顯示避免重複 */}
      <div className="md:hidden">
        <AccountShortcutItem
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          }
          label={t("saved")}
          badge={savedCount}
          onClick={() => router.push("/saved")}
        />
        <AccountShortcutItem
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
          onClick={() => {
            router.push("/map");
            openRouteSheet();
          }}
        />
      </div>
      <AccountShortcutItem
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16v16H4z"/>
            <path d="M8 8h8"/>
            <path d="M8 12h8"/>
            <path d="M8 16h5"/>
          </svg>
        }
        label={t("submissions")}
        onClick={() => router.push("/submissions")}
      />
    </div>
  );
}

function SignInItem({
  provider, label, icon,
}: {
  provider: "google" | "line";
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={() => signIn(provider)}
      className="w-full flex items-center gap-3 px-4 py-3 text-xs tracking-wider transition-colors"
      style={{ color: "var(--foreground)", cursor: "pointer", minHeight: 44 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--accent-rgb) / 0.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
      {label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.174 0 7.548 0 9s.348 2.826.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function LineIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#06C755" />
      <path
        d="M6 7.8h1.6v5.1h2.8v1.4H6V7.8Zm5.2 0h1.6v6.5h-1.6V7.8Zm2.8 0h1.5l2.4 3.6V7.8h1.5v6.5h-1.5l-2.4-3.6v3.6H14V7.8Z"
        fill="#fff"
      />
    </svg>
  );
}

function AccountShortcutItem({
  icon, label, badge, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
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
      {badge !== undefined && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-sm font-bold"
          style={{
            background: badge > 0 ? "rgb(var(--accent-rgb) / 0.12)" : "rgb(var(--foreground-rgb) / 0.04)",
            color: badge > 0 ? "var(--accent)" : "var(--muted)",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

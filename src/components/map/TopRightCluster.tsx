"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LangToggle } from "@/components/ui/LangToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AuthButton } from "@/components/auth/AuthButton";

// 右上角收合 cluster：globe button + 向下彈出 popover
// 內部直接 reuse LangToggle / ThemeToggle / AuthButton，不重寫邏輯
// AuthButton 自己內部還有一個 dropdown（已登入時的選單），雙層 dropdown 共存

export function TopRightCluster() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 點外面關閉
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Esc 關閉（a11y）
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={ref} className="absolute top-4 right-4 z-10">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="開啟設定選單"
        aria-expanded={open}
        style={{
          width: 44,
          height: 44,
          background: "var(--panel-glass)",
          border: "1px solid var(--line-strong)",
          borderRadius: 2,
          backdropFilter: "blur(18px)",
          boxShadow: "var(--shadow-glow)",
          color: open ? "var(--accent)" : "var(--muted)",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          transition: "color 0.2s, border-color 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--accent)";
          e.currentTarget.style.borderColor = "var(--accent)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = open ? "var(--accent)" : "var(--muted)";
          e.currentTarget.style.borderColor = "var(--line-strong)";
        }}
      >
        <WireframeGlobe />
        {/* 開合指示三角 */}
        <svg
          width="6"
          height="4"
          viewBox="0 0 6 4"
          fill="currentColor"
          style={{
            opacity: 0.55,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
          aria-hidden="true"
        >
          <path d="M0 0 L3 4 L6 0 Z" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            style={{
              position: "absolute",
              top: 52,
              right: 0,
              width: 220,
              background: "var(--panel-glass-strong)",
              border: "1px solid var(--line)",
              borderRadius: 2,
              backdropFilter: "blur(20px)",
              boxShadow: "0 16px 48px rgb(var(--background-rgb) / 0.4)",
              transformOrigin: "top right",
              // overflow visible 讓內部 AuthButton 的 dropdown 能往左外露
              overflow: "visible",
            }}
          >
            <PopoverItem delay={0.04}>
              <LangToggle />
            </PopoverItem>
            <PopoverDivider />
            <PopoverItem delay={0.08}>
              <ThemeToggle />
            </PopoverItem>
            <PopoverDivider />
            <PopoverItem delay={0.12}>
              <AuthButton />
            </PopoverItem>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 單項目容器，水平置中 + stagger 入場
function PopoverItem({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.18, ease: "easeOut" }}
      style={{
        padding: "8px 12px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {children}
    </motion.div>
  );
}

function PopoverDivider() {
  return <div style={{ height: 1, background: "var(--line)", margin: "0 8px" }} />;
}

// 純 SVG wireframe globe，44×44 button 內 22×22 視覺
// 經線群用 framer-motion 連續 rotateY 模擬自轉（SVG 內 rotateY 視覺等同 scaleX 來回壓扁）
// 20 秒一圈
function WireframeGlobe() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="-12 -12 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.6"
      aria-hidden="true"
    >
      {/* 靜態：外圓 + 緯線 */}
      <circle r="10" />
      <ellipse cx="0" cy="0" rx="10" ry="3.5" />
      <ellipse cx="0" cy="-5" rx="8.5" ry="2" />
      <ellipse cx="0" cy="5" rx="8.5" ry="2" />

      {/* 動態：經線群（自轉） */}
      <motion.g
        animate={{ rotateY: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "0 0", transformBox: "fill-box" }}
      >
        <ellipse cx="0" cy="0" rx="10" ry="10" />
        <ellipse cx="0" cy="0" rx="6" ry="10" />
        <ellipse cx="0" cy="0" rx="2" ry="10" />
      </motion.g>
    </svg>
  );
}

"use client";

import { useMemo } from "react";
import { motion, AnimatePresence, useDragControls, useReducedMotion } from "framer-motion";
import { useRoutePlannerStore } from "@/store/useRoutePlannerStore";
import {
  REDUCED_SHEET_MOTION,
  SHEET_BACKDROP_TRANSITION,
  SHEET_DRAG_CLOSE_OFFSET,
  SHEET_DRAG_CLOSE_VELOCITY,
  SHEET_MOTION,
} from "@/lib/motion/sheetMotion";
import {
  buildExternalNavLinks,
  tryAppSchemeWithFallback,
  type ExternalNavOption,
  type NavWaypoint,
} from "@/lib/mapbox/deep-link";

// 外部導航選擇 sheet（START 按下後彈出）。
// 依當下平台列出可用 nav app，使用者點一個就跳出去。
// - iOS：Google Maps app；單點時才加 Apple Maps
// - Android：Google Maps web + 系統 geo: picker
// - Desktop：Google Maps 新分頁

interface ExternalNavSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
}

const MONO_LABEL: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains-mono), monospace",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
};

export function ExternalNavSheet({
  isOpen,
  onClose,
  userLocation,
}: ExternalNavSheetProps) {
  const selectedSpots = useRoutePlannerStore((s) => s.selectedSpots);
  const dragControls = useDragControls();
  const shouldReduceMotion = useReducedMotion();

  const navLinks = useMemo(() => {
    // 關閉狀態不算（省效能 + 確保 platform detect 在使用者實際開啟時觸發）
    if (!isOpen) return null;
    const points: NavWaypoint[] = [
      ...(userLocation
        ? [{ lat: userLocation.lat, lng: userLocation.lng, label: "我的位置" }]
        : []),
      ...selectedSpots.map((s) => ({
        lat: s.lat,
        lng: s.lng,
        label: s.name,
      })),
    ];
    return buildExternalNavLinks(points);
  }, [isOpen, userLocation, selectedSpots]);

  const handlePick = (opt: ExternalNavOption) => {
    // 分三條路：
    // - web URL（桌機）：開新分頁不離開 oddspot
    // - 有 fallbackUrl（iOS Google Maps）：app scheme 失敗 2.5s 後跳 web fallback
    // - 純 app scheme（Apple Maps / Android geo）：直接 location.href
    if (opt.app === "google-web") {
      window.open(opt.url, "_blank", "noopener,noreferrer");
    } else if (opt.fallbackUrl) {
      tryAppSchemeWithFallback(opt.url, opt.fallbackUrl);
    } else {
      window.location.href = opt.url;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && navLinks && (
        <>
          {/* backdrop（點擊關閉） */}
          <motion.div
            key="ext-nav-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SHEET_BACKDROP_TRANSITION}
            onClick={onClose}
            className="absolute inset-0 z-40"
            style={{
              background: "rgb(var(--background-rgb) / 0.6)",
              backdropFilter: "blur(4px)",
            }}
          />
          {/* sheet 本體 */}
          <motion.div
            key="ext-nav-sheet"
            variants={shouldReduceMotion ? REDUCED_SHEET_MOTION : SHEET_MOTION}
            initial="initial"
            animate="animate"
            exit="exit"
            drag={shouldReduceMotion ? false : "y"}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.32 }}
            onDragEnd={(_, info) => {
              if (
                info.offset.y > SHEET_DRAG_CLOSE_OFFSET ||
                info.velocity.y > SHEET_DRAG_CLOSE_VELOCITY
              ) {
                onClose();
              }
            }}
            className="absolute left-0 right-0 bottom-0 z-50"
            style={{
              background: "var(--panel-glass-strong)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderTop: "1px solid var(--line-strong)",
              borderTopLeftRadius: 2,
              borderTopRightRadius: 2,
              boxShadow: "0 -16px 48px rgb(var(--background-rgb) / 0.5)",
            }}
          >
            {/* drag handle */}
            <div
              className="flex justify-center pt-2 pb-1"
              onPointerDown={(event) => dragControls.start(event)}
              style={{ cursor: "grab", touchAction: "none" }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  background: "var(--muted)",
                  opacity: 0.45,
                  borderRadius: 2,
                }}
              />
            </div>

            {/* header */}
            <div
              className="px-4 py-2 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--line)" }}
            >
              <div
                style={{
                  ...MONO_LABEL,
                  fontSize: 10,
                  color: "var(--muted)",
                }}
              >
                archive://nav · 開始導航
              </div>
              <div
                style={{
                  ...MONO_LABEL,
                  fontSize: 9,
                  color: "var(--muted)",
                  opacity: 0.6,
                  letterSpacing: "0.12em",
                }}
              >
                platform: {navLinks.platform}
              </div>
            </div>

            {/* options */}
            <div className="px-4 py-3">
              {navLinks.options.length === 0 ? (
                <div
                  className="py-4 text-center"
                  style={{
                    ...MONO_LABEL,
                    fontSize: 11,
                    color: "var(--muted)",
                    opacity: 0.6,
                  }}
                >
                  err_no_app · 此平台無可用導航
                </div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {navLinks.options.map((opt) => {
                    return (
                      <li key={opt.app} style={{ marginTop: 4 }}>
                        <button
                          onClick={() => handlePick(opt)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 14px",
                            background: "transparent",
                            border: "1px solid var(--line-strong)",
                            borderRadius: 2,
                            color: "var(--foreground)",
                            cursor: "pointer",
                            textAlign: "left",
                            ...MONO_LABEL,
                            fontSize: 11,
                            letterSpacing: "0.16em",
                            transition: "background 0.15s, border-color 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            const el = e.currentTarget;
                            el.style.background =
                              "rgb(var(--accent-rgb) / 0.08)";
                            el.style.borderColor = "var(--accent)";
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget;
                            el.style.background = "transparent";
                            el.style.borderColor = "var(--line-strong)";
                          }}
                        >
                          <span>{opt.label}</span>
                          <span
                            style={{ color: "var(--accent)", fontSize: 14 }}
                          >
                            →
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* 取消 */}
              <button
                onClick={onClose}
                style={{
                  marginTop: 12,
                  width: "100%",
                  padding: "10px 14px",
                  background: "transparent",
                  border: "1px solid var(--line)",
                  borderRadius: 2,
                  color: "var(--muted)",
                  cursor: "pointer",
                  ...MONO_LABEL,
                  fontSize: 10,
                  letterSpacing: "0.18em",
                }}
              >
                取消
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

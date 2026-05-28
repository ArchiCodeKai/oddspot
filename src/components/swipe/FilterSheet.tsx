"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { CATEGORY_VALUES, CATEGORY_CODES } from "@/lib/constants/categories";
import { CATEGORY_GLYPHS } from "@/lib/constants/categoryGlyphs";
import { getCategoryLabel, getDifficultyLabel, getStatusOptions } from "@/lib/i18n/spotMeta";
import { useMapStore } from "@/store/useMapStore";
import {
  REDUCED_SHEET_MOTION,
  SHEET_BACKDROP_TRANSITION,
  SHEET_DRAG_CLOSE_OFFSET,
  SHEET_DRAG_CLOSE_VELOCITY,
  SHEET_MOTION,
} from "@/lib/motion/sheetMotion";
import type { SpotCategory } from "@/lib/constants/categories";
import type { SpotStatus } from "@/lib/constants/status";

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

type Difficulty = "easy" | "medium" | "hard";

export function FilterSheet({ isOpen, onClose }: FilterSheetProps) {
  const t = useTranslations("filter");
  const tMeta = useTranslations("spotMeta");
  const dragControls = useDragControls();
  const shouldReduceMotion = useReducedMotion();

  // 連 useMapStore.filters：探索頁 / 地圖頁兩處 trigger 共用同一份篩選狀態
  const filters = useMapStore((s) => s.filters);
  const setFilters = useMapStore((s) => s.setFilters);

  // 本地 staging state — 打開時從 store 同步，按 Apply 才寫回（取消 = 不變動）
  const [selectedCategories, setSelectedCategories] = useState<SpotCategory[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [status, setStatus] = useState<SpotStatus | null>(null);
  const [ignitingKeys, setIgnitingKeys] = useState<string[]>([]);
  const ignitionTimersRef = useRef<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedCategories(filters.categories ?? []);
      setDifficulty((filters.difficulty?.[0] as Difficulty) ?? null);
      setStatus((filters.status?.[0] as SpotStatus) ?? null);
    }
  }, [isOpen, filters.categories, filters.difficulty, filters.status]);

  useEffect(() => {
    return () => {
      ignitionTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      ignitionTimersRef.current = [];
    };
  }, []);

  const triggerIgnition = (key: string) => {
    setIgnitingKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    const timer = window.setTimeout(() => {
      setIgnitingKeys((prev) => prev.filter((item) => item !== key));
    }, 900);
    ignitionTimersRef.current.push(timer);
  };

  const toggleCategory = (cat: SpotCategory) => {
    triggerIgnition(`category:${cat}`);
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleReset = () => {
    setSelectedCategories([]);
    setDifficulty(null);
    setStatus(null);
    setFilters({});
  };

  const handleApply = () => {
    setFilters({
      ...filters,
      categories: selectedCategories.length ? selectedCategories : undefined,
      difficulty: difficulty ? [difficulty] : undefined,
      status: status ? [status] : undefined,
    });
    onClose();
  };

  const categoryOptions = CATEGORY_VALUES.map((value) => ({
    value,
    label: getCategoryLabel(tMeta, value),
  }));
  const difficultyOptions = (["easy", "medium", "hard"] as const).map((value) => ({
    value,
    label: getDifficultyLabel(tMeta, value),
  }));
  const statusOptions = getStatusOptions(tMeta);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
      <style>{`
        @keyframes acid-chip-hover {
          0%, 100% { filter: brightness(1); }
          8% { filter: brightness(1.95); }
          13% { filter: brightness(0.48); }
          17% { filter: brightness(1.75); }
          24% { filter: brightness(0.7); }
          31% { filter: brightness(1.38); }
          48% { filter: brightness(0.9); }
          64% { filter: brightness(1.14); }
        }
        @keyframes acid-chip-ignite {
          0% {
            filter: brightness(0.42);
            box-shadow: 0 0 2px rgb(var(--accent-rgb) / 0.08);
          }
          6% {
            filter: brightness(2.05);
            box-shadow: 0 0 34px rgb(var(--accent-rgb) / 0.62), inset 0 0 20px rgb(var(--accent-rgb) / 0.12);
          }
          10% {
            filter: brightness(0.3);
            box-shadow: 0 0 2px rgb(var(--accent-rgb) / 0.08);
          }
          15% {
            filter: brightness(1.85);
            box-shadow: 0 0 26px rgb(var(--accent-rgb) / 0.52), inset 0 0 16px rgb(var(--accent-rgb) / 0.1);
          }
          22% {
            filter: brightness(0.58);
            box-shadow: 0 0 5px rgb(var(--accent-rgb) / 0.12);
          }
          30% {
            filter: brightness(1.55);
            box-shadow: 0 0 20px rgb(var(--accent-rgb) / 0.42), inset 0 0 12px rgb(var(--accent-rgb) / 0.08);
          }
          46% {
            filter: brightness(0.82);
            box-shadow: 0 0 8px rgb(var(--accent-rgb) / 0.16);
          }
          62% {
            filter: brightness(1.2);
            box-shadow: 0 0 16px rgb(var(--accent-rgb) / 0.28);
          }
          100% {
            filter: brightness(1);
            box-shadow: 0 0 13px rgb(var(--accent-rgb) / 0.2), inset 0 0 10px rgb(var(--accent-rgb) / 0.04);
          }
        }
        @keyframes acid-chip-idle-flicker {
          0%, 100% {
            filter: brightness(1);
            box-shadow: 0 0 11px rgb(var(--accent-rgb) / 0.16), inset 0 0 0 1px rgb(var(--accent-rgb) / 0.1);
          }
          17% {
            filter: brightness(1.025);
            box-shadow: 0 0 13px rgb(var(--accent-rgb) / 0.18), inset 0 0 12px rgb(var(--accent-rgb) / 0.035);
          }
          18% {
            filter: brightness(0.975);
            box-shadow: 0 0 9px rgb(var(--accent-rgb) / 0.13), inset 0 0 0 1px rgb(var(--accent-rgb) / 0.08);
          }
          49% {
            filter: brightness(1.015);
          }
          51% {
            filter: brightness(0.988);
          }
          76% {
            filter: brightness(1.03);
            box-shadow: 0 0 14px rgb(var(--accent-rgb) / 0.2), inset 0 0 14px rgb(var(--accent-rgb) / 0.04);
          }
          78% {
            filter: brightness(0.99);
          }
        }
        @keyframes acid-chip-scan {
          0% { transform: translateX(-130%) skewX(-18deg); opacity: 0; }
          18% { opacity: 0.82; }
          52% { opacity: 0.28; }
          100% { transform: translateX(130%) skewX(-18deg); opacity: 0; }
        }
        .acid-filter-chip {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          min-height: 44px;
          transform: translateZ(0);
          transition:
            transform 0.18s ease,
            color 0.18s ease,
            border-color 0.18s ease,
            background 0.18s ease,
            box-shadow 0.18s ease;
        }
        .acid-filter-chip::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background:
            repeating-linear-gradient(
              0deg,
              transparent 0,
              transparent 4px,
              rgb(var(--accent-rgb) / 0.055) 4px,
              rgb(var(--accent-rgb) / 0.055) 5px
            );
          opacity: 0;
          pointer-events: none;
        }
        .acid-filter-chip::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: -34%;
          width: 34%;
          z-index: -1;
          background: linear-gradient(90deg, transparent, rgb(var(--accent-rgb) / 0.34), transparent);
          opacity: 0;
          pointer-events: none;
        }
        .acid-filter-chip:hover,
        .acid-filter-chip:focus-visible {
          color: var(--accent) !important;
          border-color: rgb(var(--accent-rgb) / 0.78) !important;
          background: rgb(var(--accent-rgb) / 0.1) !important;
          transform: translateY(-2px) skewX(-1.5deg);
          box-shadow: 0 0 20px rgb(var(--accent-rgb) / 0.28), inset 0 0 18px rgb(var(--accent-rgb) / 0.05) !important;
          animation: acid-chip-hover 0.72s steps(1, end);
        }
        .acid-filter-chip:hover::before,
        .acid-filter-chip:focus-visible::before,
        .acid-filter-chip.is-selected::before {
          opacity: 1;
        }
        .acid-filter-chip:hover::after,
        .acid-filter-chip:focus-visible::after {
          animation: acid-chip-scan 0.72s ease-out;
        }
        .acid-filter-chip:active {
          transform: translateY(0) skewX(2deg) scale(0.99);
          filter: brightness(1.55);
        }
        .acid-filter-chip.is-selected {
          color: var(--accent) !important;
          border-color: rgb(var(--accent-rgb) / 0.7) !important;
          background: rgb(var(--accent-rgb) / 0.16) !important;
          animation: acid-chip-idle-flicker 5.8s steps(1, end) infinite;
        }
        .acid-filter-chip.is-igniting {
          color: var(--accent) !important;
          border-color: rgb(var(--accent-rgb) / 0.85) !important;
          background: rgb(var(--accent-rgb) / 0.18) !important;
          animation: acid-chip-ignite 0.9s steps(1, end);
        }
        .acid-filter-chip.is-igniting::before {
          opacity: 1;
        }
        .acid-filter-chip.is-igniting::after {
          animation: acid-chip-scan 0.42s ease-out 2;
        }
        .acid-filter-wide {
          justify-content: center;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        @media (hover: none) {
          .acid-filter-chip:active,
          .acid-filter-chip.is-selected {
            filter: brightness(1.25) contrast(1.06);
            box-shadow: 0 0 28px rgb(var(--accent-rgb) / 0.38), inset 0 0 18px rgb(var(--accent-rgb) / 0.1) !important;
          }
          .acid-filter-chip:active::after {
            animation: acid-chip-scan 0.48s ease-out;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .acid-filter-chip,
          .acid-filter-chip:hover,
          .acid-filter-chip:focus-visible,
          .acid-filter-chip.is-igniting,
          .acid-filter-chip.is-selected {
            animation: none !important;
            transform: none;
          }
          .acid-filter-chip::after {
            animation: none !important;
          }
        }
      `}</style>
      {/* 背景遮罩 */}
      <motion.div
        className="fixed inset-0 z-40"
        style={{ background: "rgb(var(--background-rgb) / 0.65)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={SHEET_BACKDROP_TRANSITION}
      />

      {/* Bottom sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 px-5 pt-5 pb-10"
        style={{
          background: "var(--panel-glass-strong)",
          borderTop: "1px solid var(--line-strong)",
          borderRadius: "12px 12px 0 0",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 -8px 40px rgb(var(--background-rgb) / 0.3)",
        }}
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
      >
        {/* 拖曳把手 */}
        <div
          className="w-10 h-1 mx-auto mb-5"
          onPointerDown={(event) => dragControls.start(event)}
          style={{
            background: "var(--muted)",
            opacity: 0.35,
            borderRadius: 2,
            cursor: "grab",
            touchAction: "none",
          }}
        />

        <div className="mb-5 flex items-center justify-between gap-4">
          <h3
            className="text-base font-semibold font-content"
            style={{ color: "var(--foreground)" }}
          >
            {t("title")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            title={t("close")}
            className="flex items-center justify-center transition-colors"
            style={{
              width: 36,
              height: 36,
              borderRadius: 2,
              border: "1px solid var(--line)",
              background: "rgb(var(--accent-rgb) / 0.04)",
              color: "var(--muted)",
              cursor: "pointer",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--accent)";
              e.currentTarget.style.borderColor = "rgb(var(--accent-rgb) / 0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--muted)";
              e.currentTarget.style.borderColor = "var(--line)";
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 景點類型 — v3 monochrome：glyph + 2-letter code 識別 */}
        <SectionLabel>{t("category")}</SectionLabel>
        <div className="flex flex-wrap gap-2 mb-6">
          {categoryOptions.map((cat) => {
            const Glyph = CATEGORY_GLYPHS[cat.value];
            const code = CATEGORY_CODES[cat.value];
            const isSelected = selectedCategories.includes(cat.value);
            const isIgniting = ignitingKeys.includes(`category:${cat.value}`);
            return (
              <button
                key={cat.value}
                onClick={() => toggleCategory(cat.value)}
                className={`acid-filter-chip text-xs font-content ${isSelected ? "is-selected" : ""} ${isIgniting ? "is-igniting" : ""}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px 6px 8px",
                  borderRadius: 2,
                  background: isSelected
                    ? "rgb(var(--accent-rgb) / 0.18)"
                    : "rgb(var(--accent-rgb) / 0.04)",
                  color: isSelected ? "var(--accent)" : "var(--muted)",
                  border: isSelected
                    ? "1px solid rgb(var(--accent-rgb) / 0.6)"
                    : "1px solid var(--line)",
                  cursor: "pointer",
                  minHeight: 44,
                  letterSpacing: "0.04em",
                  fontWeight: 500,
                  boxShadow: isSelected
                    ? "0 0 12px rgb(var(--accent-rgb) / 0.18)"
                    : "none",
                }}
              >
                <Glyph size={12} />
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: 9,
                    letterSpacing: "0.08em",
                    opacity: 0.85,
                  }}
                >
                  {code}
                </span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* 難度 */}
        <SectionLabel>{t("difficulty")}</SectionLabel>
        <div className="flex gap-2 mb-6">
          {difficultyOptions.map((opt) => {
            const isSelected = difficulty === opt.value;
            return (
              <ToggleButton
                key={opt.value}
                selected={isSelected}
                isIgniting={ignitingKeys.includes(`difficulty:${opt.value}`)}
                onClick={() => {
                  triggerIgnition(`difficulty:${opt.value}`);
                  setDifficulty(isSelected ? null : opt.value);
                }}
              >
                {opt.label}
              </ToggleButton>
            );
          })}
        </div>

        {/* 狀態 */}
        <SectionLabel>{t("status")}</SectionLabel>
        <div className="flex gap-2 mb-8">
          {statusOptions.map((opt) => {
            const isSelected = status === opt.value;
            return (
              <ToggleButton
                key={opt.value}
                selected={isSelected}
                isIgniting={ignitingKeys.includes(`status:${opt.value}`)}
                onClick={() => {
                  triggerIgnition(`status:${opt.value}`);
                  setStatus(isSelected ? null : (opt.value as SpotStatus));
                }}
              >
                {opt.label}
              </ToggleButton>
            );
          })}
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 py-3 text-sm font-medium transition-colors font-content uppercase"
            style={{
              borderRadius: 2,
              border: "1px solid var(--line-strong)",
              color: "var(--foreground)",
              background: "transparent",
              cursor: "pointer",
              letterSpacing: "0.12em",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-light)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {t("reset")}
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 text-sm font-semibold font-content uppercase"
            style={{
              borderRadius: 2,
              background: "var(--foreground)",
              color: "var(--background)",
              cursor: "pointer",
              letterSpacing: "0.12em",
            }}
          >
            {t("apply")}
          </button>
        </div>
      </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// 小工具元件
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs uppercase tracking-widest mb-3"
      style={{
        color: "var(--muted)",
        fontFamily: "var(--font-jetbrains-mono), monospace",
        letterSpacing: "0.18em",
      }}
    >
      {children}
    </p>
  );
}

function ToggleButton({
  selected,
  isIgniting,
  onClick,
  children,
}: {
  selected: boolean;
  isIgniting?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`acid-filter-chip acid-filter-wide flex-1 py-2 text-sm font-content ${selected ? "is-selected" : ""} ${isIgniting ? "is-igniting" : ""}`}
      style={{
        borderRadius: 2,
        background: selected ? "rgb(var(--accent-rgb) / 0.16)" : "var(--panel-light)",
        color: selected ? "var(--accent)" : "var(--muted)",
        border: selected
          ? "1px solid rgb(var(--accent-rgb) / 0.7)"
          : "1px solid var(--line)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CATEGORY_VALUES } from "@/lib/constants/categories";
import { getCategoryLabel, getDifficultyLabel, getStatusOptions } from "@/lib/i18n/spotMeta";
import type { SpotCategory } from "@/lib/constants/categories";

const CATEGORY_COLORS: Record<SpotCategory, string> = {
  "weird-temple": "#f97316",
  "abandoned": "#6b7280",
  "giant-object": "#3b82f6",
  "kitsch": "#ec4899",
  "marginal-architecture": "#14b8a6",
  "urban-legend": "#8b5cf6",
  "absurd-landscape": "#22c55e",
  "odd-shopfront": "#eab308",
};

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  // TODO Step 4: 接 useMapStore.filters 實際過濾
}

export function FilterSheet({ isOpen, onClose }: FilterSheetProps) {
  const t = useTranslations("filter");
  const tMeta = useTranslations("spotMeta");
  const [selectedCategories, setSelectedCategories] = useState<SpotCategory[]>([]);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const toggleCategory = (cat: SpotCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleReset = () => {
    setSelectedCategories([]);
    setDifficulty(null);
    setStatus(null);
  };

  const handleApply = () => {
    // TODO Step 4: 套用篩選至 useMapStore.setFilters(...)
    onClose();
  };

  if (!isOpen) return null;

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
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgb(var(--background-rgb) / 0.65)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 px-5 pt-5 pb-10"
        style={{
          background: "var(--panel-glass-strong)",
          borderTop: "1px solid var(--line)",
          borderRadius: "20px 20px 0 0",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 -8px 40px rgb(var(--background-rgb) / 0.3)",
        }}
      >
        {/* 拖曳把手 */}
        <div
          className="w-10 h-1 rounded-full mx-auto mb-5"
          style={{ background: "var(--muted)", opacity: 0.35 }}
        />

        <h3
          className="text-base font-semibold mb-5 font-content"
          style={{ color: "var(--foreground)" }}
        >
          {t("title")}
        </h3>

        {/* 景點類型 */}
        <SectionLabel>{t("category")}</SectionLabel>
        <div className="flex flex-wrap gap-2 mb-6">
          {categoryOptions.map((cat) => {
            const color = CATEGORY_COLORS[cat.value];
            const isSelected = selectedCategories.includes(cat.value);
            return (
              <button
                key={cat.value}
                onClick={() => toggleCategory(cat.value)}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-all font-content"
                style={{
                  background: isSelected ? color : `${color}1a`,
                  color: isSelected ? "#fff" : color,
                  border: `1px solid ${color}40`,
                  cursor: "pointer",
                }}
              >
                {cat.label}
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
                onClick={() => setDifficulty(isSelected ? null : opt.value)}
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
                onClick={() => setStatus(isSelected ? null : opt.value)}
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
            className="flex-1 py-3 text-sm font-medium transition-colors font-content"
            style={{
              borderRadius: "10px",
              border: "1px solid var(--line-strong)",
              color: "var(--foreground)",
              background: "transparent",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-light)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {t("reset")}
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 text-sm font-semibold font-content"
            style={{
              borderRadius: "10px",
              background: "var(--foreground)",
              color: "var(--background)",
              cursor: "pointer",
            }}
          >
            {t("apply")}
          </button>
        </div>
      </div>
    </>
  );
}

// 小工具元件
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs uppercase tracking-widest mb-3"
      style={{ color: "var(--muted)", fontFamily: "var(--font-space-mono), monospace" }}
    >
      {children}
    </p>
  );
}

function ToggleButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2 text-sm font-medium transition-all font-content"
      style={{
        borderRadius: "10px",
        background: selected ? "var(--foreground)" : "var(--panel-light)",
        color: selected ? "var(--background)" : "var(--muted)",
        border: selected ? "1px solid transparent" : "1px solid var(--line)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

"use client";

import { useState } from "react";
import { CATEGORY_OPTIONS } from "@/lib/constants/categories";
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

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-white/5 px-5 pt-5 pb-10">
        {/* 拖曳把手 */}
        <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-5" />

        <h3 className="text-white font-semibold text-base mb-5">篩選景點</h3>

        {/* 景點類型 */}
        <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3">景點類型</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORY_OPTIONS.map((cat) => {
            const color = CATEGORY_COLORS[cat.value];
            const isSelected = selectedCategories.includes(cat.value);
            return (
              <button
                key={cat.value}
                onClick={() => toggleCategory(cat.value)}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                style={
                  isSelected
                    ? { backgroundColor: color, color: "#fff" }
                    : { backgroundColor: `${color}20`, color: color }
                }
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* 難度 */}
        <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3">難度</p>
        <div className="flex gap-2 mb-6">
          {[
            { value: "easy", label: "容易" },
            { value: "medium", label: "普通" },
            { value: "hard", label: "困難" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDifficulty(difficulty === opt.value ? null : opt.value)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                difficulty === opt.value
                  ? "bg-white text-zinc-900"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 狀態 */}
        <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3">狀態</p>
        <div className="flex gap-2 mb-8">
          {[
            { value: "active", label: "可探索" },
            { value: "uncertain", label: "狀況不明" },
            { value: "disappeared", label: "已消失" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatus(status === opt.value ? null : opt.value)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                status === opt.value
                  ? "bg-white text-zinc-900"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 按鈕 */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-300 text-sm font-medium"
          >
            重設
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 rounded-xl bg-white text-zinc-900 text-sm font-semibold"
          >
            套用篩選
          </button>
        </div>
      </div>
    </>
  );
}

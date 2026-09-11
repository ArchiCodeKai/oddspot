"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { CATEGORY_CODES, CATEGORY_VALUES } from "@/lib/constants/categories";
import { CATEGORY_GLYPHS } from "@/lib/constants/categoryGlyphs";

// 地圖圖例：8 個分類線框圖示排成兩行四個。
// 用的是 app 自己的圖示系統（CATEGORY_GLYPHS），不是新畫的插畫——
// 它填補原本 2D 眼睛 mascot 的位置，但它不是裝飾，是使用者即將進入那張地圖的圖例。
interface CategoryLegendProps {
  style?: CSSProperties;
  className?: string;
  delay?: number;
}

export function CategoryLegend({ style, className, delay = 0.35 }: CategoryLegendProps) {
  return (
    <motion.div
      className={className}
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay }}
      style={{
        position: "absolute",
        display: "grid",
        gridTemplateColumns: "repeat(4, auto)",
        columnGap: 18,
        rowGap: 10,
        color: "var(--muted)",
        pointerEvents: "none",
        ...style,
      }}
    >
      {CATEGORY_VALUES.map((category, index) => {
        const Glyph = CATEGORY_GLYPHS[category];
        return (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: delay + index * 0.04 }}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Glyph size={16} />
            <span
              style={{
                fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                fontSize: 8,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              {CATEGORY_CODES[category]}
            </span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

import { CATEGORY_CODES, CATEGORY_LABELS, type SpotCategory } from "@/lib/constants/categories";
import { CATEGORY_GLYPHS } from "@/lib/constants/categoryGlyphs";

interface CategoryBadgeProps {
  category: SpotCategory;
  // compact: 只顯示 glyph + code，不顯示文字標籤（給小卡片用）
  compact?: boolean;
  size?: "sm" | "md";
  // 顯示用標籤覆寫（i18n 場景傳入 useTranslations 的翻譯）
  label?: string;
}

// v3 monochrome 識別：glyph + 兩字母代號 + 標籤
// 識別靠形狀 + 代號，不靠顏色
export function CategoryBadge({ category, compact = false, size = "sm", label }: CategoryBadgeProps) {
  const Glyph = CATEGORY_GLYPHS[category];
  const code = CATEGORY_CODES[category];
  const displayLabel = label ?? CATEGORY_LABELS[category];

  const sizes = {
    sm: { fontSize: 10, padding: "3px 7px 3px 6px", glyph: 10, codeSize: 9 },
    md: { fontSize: 12, padding: "5px 10px 5px 8px", glyph: 12, codeSize: 10 },
  }[size];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-noto-sans-tc), 'Noto Sans TC', sans-serif",
        fontSize: sizes.fontSize,
        padding: sizes.padding,
        borderRadius: 2,
        background: "rgb(var(--accent-rgb) / 0.08)",
        color: "var(--accent)",
        border: "1px solid rgb(var(--accent-rgb) / 0.3)",
        letterSpacing: "0.06em",
        fontWeight: 500,
        lineHeight: 1,
      }}
    >
      <Glyph size={sizes.glyph} />
      <span
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
          fontSize: sizes.codeSize,
          opacity: 0.85,
          letterSpacing: "0.08em",
        }}
      >
        {code}
      </span>
      {!compact && <span>{displayLabel}</span>}
    </span>
  );
}

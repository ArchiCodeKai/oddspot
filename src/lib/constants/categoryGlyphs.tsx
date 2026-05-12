import type { ComponentType, SVGProps } from "react";
import type { SpotCategory } from "./categories";

// v3 monochrome glyph 系統 — 每類一個獨特線條圖示
// 所有 render 在 currentColor，讓 CategoryBadge / pin 動態吃 accent 色
// 刻意保留 B-grade 低像素感：1.6px stroke、20x20 viewBox、square linecap
type GlyphProps = SVGProps<SVGSVGElement> & { size?: number };

const Glyph = ({ size = 14, children, ...rest }: GlyphProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="square"
    {...rest}
  >
    {children}
  </svg>
);

// RS · 宗教建築（屋頂 + 柱廊 + 中間神龕）
const ReligiousSite = (p: GlyphProps) => (
  <Glyph {...p}>
    <path d="M3 8 L10 3 L17 8" />
    <path d="M5 8 V17 H15 V8" />
    <path d="M9 17 V12 H11 V17" />
    <path d="M2 8 H18" />
  </Glyph>
);

// PP · 特殊場域（階梯狀殘破輪廓 — 「不易說明」的場所感）
const PeculiarPlace = (p: GlyphProps) => (
  <Glyph {...p}>
    <path d="M3 17 V6 L7 3 V17 M7 8 L13 3 V17 M13 6 L17 8 V17" />
    <path d="M2 17 H18" />
  </Glyph>
);

// GO · 巨型物體（三角錐）
const GiantObject = (p: GlyphProps) => (
  <Glyph {...p}>
    <path d="M10 2 L14 17 H6 Z" />
    <path d="M7 13 H13" />
    <path d="M8 9 H12" />
  </Glyph>
);

// MR · 現代廢墟（兩棟窄樓房）
const ModernRuins = (p: GlyphProps) => (
  <Glyph {...p}>
    <rect x="3" y="4" width="5" height="13" />
    <rect x="10" y="7" width="7" height="10" />
    <path d="M5 7 H6 M5 10 H6 M5 13 H6 M12 10 H15 M12 13 H15" />
  </Glyph>
);

// UL · 都市傳說（鬼面 + 雙眼）
const UrbanLegend = (p: GlyphProps) => (
  <Glyph {...p}>
    <path d="M4 15 C4 7,7 3,10 3 C13 3,16 7,16 15 L14 14 L12 16 L10 14 L8 16 L6 14 Z" />
    <circle cx="8" cy="9" r="0.8" fill="currentColor" />
    <circle cx="12" cy="9" r="0.8" fill="currentColor" />
  </Glyph>
);

// CS · 珍奇商家（遮雨棚 + 門窗）
const CuriosityShop = (p: GlyphProps) => (
  <Glyph {...p}>
    <path d="M3 7 L5 4 H15 L17 7" />
    <rect x="3" y="7" width="14" height="10" />
    <path d="M8 17 V12 H12 V17" />
  </Glyph>
);

// GR · 塗鴉標記（蠟筆斜放 — 筆桿 + 筆尖 + 短墨痕）
const Graffiti = (p: GlyphProps) => (
  <Glyph {...p}>
    {/* 筆桿（45° 傾斜矩形） */}
    <path d="M5 13 L13 5 L16 8 L8 16 Z" />
    {/* 筆頭分隔 */}
    <path d="M11 7 L14 10" />
    {/* 筆尖墨痕 */}
    <path d="M5 13 L3 17" />
    <path d="M5.5 14.5 L4 17" />
  </Glyph>
);

// LL · 活體地標（小貓頭：三角耳 + 圓臉 + 圓眼）
const LivingLandmark = (p: GlyphProps) => (
  <Glyph {...p}>
    {/* 兩個耳朵 */}
    <path d="M5 9 L7 4 L9 9 Z" />
    <path d="M11 9 L13 4 L15 9 Z" />
    {/* 臉橢圓 */}
    <path d="M4 12 C4 9,16 9,16 12 V14 C16 17,4 17,4 14 Z" />
    {/* 兩眼 */}
    <circle cx="8" cy="13" r="0.7" fill="currentColor" />
    <circle cx="12" cy="13" r="0.7" fill="currentColor" />
    {/* 嘴 */}
    <path d="M9 15.2 Q 10 16 11 15.2" />
  </Glyph>
);

export const CATEGORY_GLYPHS: Record<SpotCategory, ComponentType<GlyphProps>> = {
  "religious-site":   ReligiousSite,
  "peculiar-place":   PeculiarPlace,
  "giant-object":     GiantObject,
  "modern-ruins":     ModernRuins,
  "urban-legend":     UrbanLegend,
  "curiosity-shop":   CuriosityShop,
  "graffiti":         Graffiti,
  "living-landmark":  LivingLandmark,
};

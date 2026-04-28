import type { ComponentType, SVGProps } from "react";
import type { SpotCategory } from "./categories";

// v2 monochrome glyph system — 每類一個獨特線條圖示
// 所有 render 在 currentColor，讓 CategoryBadge / pin 動態吃 accent 色
// 刻意保留 B-grade 低像素感：2px stroke、20x20 viewBox、square linecap
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

// TM · 詭異廟宇（屋頂 + 柱廊 + 中間神龕）
const WeirdTemple = (p: GlyphProps) => (
  <Glyph {...p}>
    <path d="M3 8 L10 3 L17 8" />
    <path d="M5 8 V17 H15 V8" />
    <path d="M9 17 V12 H11 V17" />
    <path d="M2 8 H18" />
  </Glyph>
);

// AB · 廢棄場所（階梯狀殘破輪廓）
const Abandoned = (p: GlyphProps) => (
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

// KT · 俗豔裝置（愛心加橫線）
const Kitsch = (p: GlyphProps) => (
  <Glyph {...p}>
    <path d="M10 16 L4 10 C2 7,6 3,10 7 C14 3,18 7,16 10 Z" />
    <path d="M10 7 V13" />
  </Glyph>
);

// MA · 邊緣建築（兩棟窄樓房）
const MarginalArchitecture = (p: GlyphProps) => (
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

// AL · 荒謬景觀（山丘 + 飄浮球體）
const AbsurdLandscape = (p: GlyphProps) => (
  <Glyph {...p}>
    <path d="M2 15 L7 8 L10 12 L14 6 L18 15 Z" />
    <circle cx="15" cy="5" r="1.4" />
  </Glyph>
);

// OS · 奇異店面（遮雨棚 + 門窗）
const OddShopfront = (p: GlyphProps) => (
  <Glyph {...p}>
    <path d="M3 7 L5 4 H15 L17 7" />
    <rect x="3" y="7" width="14" height="10" />
    <path d="M8 17 V12 H12 V17" />
  </Glyph>
);

export const CATEGORY_GLYPHS: Record<SpotCategory, ComponentType<GlyphProps>> = {
  "weird-temple":          WeirdTemple,
  "abandoned":             Abandoned,
  "giant-object":          GiantObject,
  "kitsch":                Kitsch,
  "marginal-architecture": MarginalArchitecture,
  "urban-legend":          UrbanLegend,
  "absurd-landscape":      AbsurdLandscape,
  "odd-shopfront":         OddShopfront,
};

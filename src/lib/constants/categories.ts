export type SpotCategory =
  | "weird-temple"
  | "abandoned"
  | "giant-object"
  | "kitsch"
  | "marginal-architecture"
  | "urban-legend"
  | "absurd-landscape"
  | "odd-shopfront";

export const CATEGORY_VALUES: SpotCategory[] = [
  "weird-temple",
  "abandoned",
  "giant-object",
  "kitsch",
  "marginal-architecture",
  "urban-legend",
  "absurd-landscape",
  "odd-shopfront",
];

// 中文標籤
export const CATEGORY_LABELS: Record<SpotCategory, string> = {
  "weird-temple":          "詭異廟宇",
  "abandoned":             "廢棄場所",
  "giant-object":          "巨型物體",
  "kitsch":                "俗豔裝置",
  "marginal-architecture": "邊緣建築",
  "urban-legend":          "都市傳說",
  "absurd-landscape":      "荒謬景觀",
  "odd-shopfront":         "奇異店面",
};

// 兩字母代號（v2 monochrome 識別系統）
export const CATEGORY_CODES: Record<SpotCategory, string> = {
  "weird-temple":          "TM",
  "abandoned":             "AB",
  "giant-object":          "GO",
  "kitsch":                "KT",
  "marginal-architecture": "MA",
  "urban-legend":          "UL",
  "absurd-landscape":      "AL",
  "odd-shopfront":         "OS",
};

// 景點分類的品牌色（v1 legacy, 保留給既有 UI 不破壞）
// v2 方向已改 monochrome + glyph 識別，新元件請走 CategoryBadge
export const CATEGORY_COLORS: Record<SpotCategory, string> = {
  "weird-temple":          "#f97316",
  "abandoned":             "#6b7280",
  "giant-object":          "#3b82f6",
  "kitsch":                "#ec4899",
  "marginal-architecture": "#14b8a6",
  "urban-legend":          "#8b5cf6",
  "absurd-landscape":      "#22c55e",
  "odd-shopfront":         "#eab308",
};

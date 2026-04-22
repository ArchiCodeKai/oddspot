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

// 景點分類的品牌色（用於 badge、marker 等 UI）
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

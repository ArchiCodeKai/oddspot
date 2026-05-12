export type SpotCategory =
  | "religious-site"
  | "peculiar-place"
  | "giant-object"
  | "modern-ruins"
  | "urban-legend"
  | "curiosity-shop"
  | "graffiti"
  | "living-landmark";

export const CATEGORY_VALUES: SpotCategory[] = [
  "religious-site",
  "peculiar-place",
  "giant-object",
  "modern-ruins",
  "urban-legend",
  "curiosity-shop",
  "graffiti",
  "living-landmark",
];

// 中文標籤（user-facing 預設語言；其他語言走 i18n 字典）
export const CATEGORY_LABELS: Record<SpotCategory, string> = {
  "religious-site":   "宗教建築",
  "peculiar-place":   "特殊場域",
  "giant-object":     "巨型物體",
  "modern-ruins":     "現代廢墟",
  "urban-legend":     "都市傳說",
  "curiosity-shop":   "珍奇商家",
  "graffiti":         "塗鴉標記",
  "living-landmark":  "活體地標",
};

// 兩字母代號（acid monochrome 識別系統，搭配 glyph 顯示）
export const CATEGORY_CODES: Record<SpotCategory, string> = {
  "religious-site":   "RS",
  "peculiar-place":   "PP",
  "giant-object":     "GO",
  "modern-ruins":     "MR",
  "urban-legend":     "UL",
  "curiosity-shop":   "CS",
  "graffiti":         "GR",
  "living-landmark":  "LL",
};

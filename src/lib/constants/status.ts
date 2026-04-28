export type SpotStatus = "active" | "uncertain" | "disappeared" | "pending";

export const STATUS_VALUES: SpotStatus[] = [
  "active",
  "uncertain",
  "disappeared",
  "pending",
];

export const STATUS_LABELS: Record<SpotStatus, string> = {
  active:      "可探索",
  uncertain:   "狀況不明",
  disappeared: "已消失",
  pending:     "審核中",
};

// Admin badge 用（Tailwind bg + text class，legacy）
export const STATUS_COLORS: Record<SpotStatus, string> = {
  active: "bg-green-100 text-green-800",
  uncertain: "bg-yellow-100 text-yellow-800",
  disappeared: "bg-gray-100 text-gray-600",
  pending: "bg-blue-100 text-blue-800",
};

// SwipeCard / 卡片 UI 用（純文字顏色 class，legacy）
export const STATUS_TEXT_COLORS: Record<SpotStatus, string> = {
  active:      "text-[var(--accent)]",
  uncertain:   "text-yellow-400",
  disappeared: "text-[var(--muted)]",
  pending:     "text-blue-400",
};

// v2 monochrome dot 形態：只用 accent 一色，靠 fill / ring / pulse / dim 區分
export interface StatusDotConfig {
  fill: boolean;        // 實心 or 空心環
  dim: number;          // 整體透明度
  animate: "pulse" | null;
}

export const STATUS_DOT: Record<SpotStatus, StatusDotConfig> = {
  active:      { fill: true,  dim: 1.0,  animate: null },
  uncertain:   { fill: false, dim: 0.7,  animate: null },
  disappeared: { fill: false, dim: 0.35, animate: null },
  pending:     { fill: true,  dim: 0.9,  animate: "pulse" },
};

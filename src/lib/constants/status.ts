export type SpotStatus = "active" | "uncertain" | "disappeared" | "pending";

export const STATUS_VALUES: SpotStatus[] = [
  "active",
  "uncertain",
  "disappeared",
  "pending",
];

// Admin badge 用（Tailwind bg + text class）
export const STATUS_COLORS: Record<SpotStatus, string> = {
  active: "bg-green-100 text-green-800",
  uncertain: "bg-yellow-100 text-yellow-800",
  disappeared: "bg-gray-100 text-gray-600",
  pending: "bg-blue-100 text-blue-800",
};

// SwipeCard / 卡片 UI 用（純文字顏色 class）
export const STATUS_TEXT_COLORS: Record<SpotStatus, string> = {
  active:      "text-[var(--accent)]",
  uncertain:   "text-yellow-400",
  disappeared: "text-[var(--muted)]",
  pending:     "text-blue-400",
};

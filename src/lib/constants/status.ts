export type SpotStatus = "active" | "uncertain" | "disappeared" | "pending";

export const STATUS_LABELS: Record<SpotStatus, string> = {
  active: "可探索",
  uncertain: "狀況不明",
  disappeared: "已消失",
  pending: "審核中",
};

export const STATUS_COLORS: Record<SpotStatus, string> = {
  active: "bg-green-100 text-green-800",
  uncertain: "bg-yellow-100 text-yellow-800",
  disappeared: "bg-gray-100 text-gray-600",
  pending: "bg-blue-100 text-blue-800",
};

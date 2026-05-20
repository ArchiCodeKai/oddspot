// 路線規劃載入文案池（B-grade，OPTIMIZE 計算期間顯示）
// 參考 design-direction-v2 第 119 行 B-grade cracks 段落

export const ROUTE_LOADING_COPY = [
  "打聽中...",
  "有人知道但不肯說",
  "有點複雜，等一下",
  "重排地圖中",
  "正在問附近的怪人",
  "系統在思考要不要告訴你",
  "仍在拼湊路線中",
] as const;

// 隨機抽一條（按下 OPTIMIZE 時的起手）
export function pickRandomLoadingCopy(): string {
  const i = Math.floor(Math.random() * ROUTE_LOADING_COPY.length);
  return ROUTE_LOADING_COPY[i];
}

// 從目前文案抽下一條（不重複自己，避免連續兩次相同）
export function pickNextLoadingCopy(current: string): string {
  const candidates = ROUTE_LOADING_COPY.filter((c) => c !== current);
  const i = Math.floor(Math.random() * candidates.length);
  return candidates[i];
}

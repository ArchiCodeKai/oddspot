// 視窗（bbox）查詢的節流設定。
//
// 背景：地圖每次停止移動都會用當下視窗範圍去查景點，而 React Query 是用「查詢條件」
// 當快取的鑰匙。若直接丟未處理的浮點座標（121.34385573694931…），手指動一點點
// 小數點後十幾位就變了 → 每次都是全新的鑰匙 → 快取永遠對不上 → 一定發新請求。
//
// 兩個對策：
//   1. quantizeBbox：把座標對齊固定網格，讓相近視窗產生「完全相同」的查詢條件
//   2. VIEWPORT_QUERY_DEBOUNCE_MS：連續拖曳時只送最後一次

export interface BboxLike {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

// 網格精度：小數第 3 位 ≈ 111 公尺。
// 視窗動輒橫跨數公里、單次最多回 50 筆，這個誤差在畫面上看不出來。
export const BBOX_GRID_PRECISION = 3;

// 連續拖曳/縮放時只送最後一次；300ms 低於一般感知門檻
export const VIEWPORT_QUERY_DEBOUNCE_MS = 300;

// 把 bbox 對齊網格，且**只向外擴不向內縮**（min 無條件捨去、max 無條件進位）。
// 向外擴保證查詢範圍一定完整覆蓋視窗，不會漏掉邊緣的點；
// 對齊網格則讓微小移動落在同一格 → 查詢條件不變 → 命中快取、不發請求。
export function quantizeBbox(bbox: BboxLike, precision = BBOX_GRID_PRECISION): BboxLike {
  const step = 10 ** precision;
  return {
    minLng: Math.floor(bbox.minLng * step) / step,
    minLat: Math.floor(bbox.minLat * step) / step,
    maxLng: Math.ceil(bbox.maxLng * step) / step,
    maxLat: Math.ceil(bbox.maxLat * step) / step,
  };
}

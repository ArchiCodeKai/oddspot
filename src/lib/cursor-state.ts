// 跨元件共享的游標狀態（模組單例，避免 Context 傳遞）
// MagneticCursor 負責寫入，MapClickEffect / SpotMarker 負責讀取

export interface TrailDot {
  x: number;
  y: number;
  born: number;
  angle: number; // 移動方向（radians），用於矩形 dash 旋轉
}

export const cursorState = {
  /** 當前游標位置（螢幕座標） */
  pos: { x: -300, y: -300 },
  /** 最後一次移動的方向（radians），靜止後依然保留，供箭頭效果使用 */
  lastAngle: 0,
  /** 最近的軌跡點（FIFO，由 MagneticCursor RAF 維護） */
  trail: [] as TrailDot[],
};

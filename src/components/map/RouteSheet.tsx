"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRoutePlannerStore } from "@/store/useRoutePlannerStore";
import { useSavedStore } from "@/store/useSavedStore";
import {
  ROUTE_LOADING_COPY,
  pickRandomLoadingCopy,
  pickNextLoadingCopy,
} from "@/lib/copy/route-loading";
import type { SpotMapPoint } from "@/types/spots";

// 路線規劃底部 sheet。
// 結構：drag handle → header → 可捲清單 → 錯誤條 → footer 摘要 + 按鈕
//
// 「從收藏選」inline picker：
// - 讀 useSavedStore.savedSpotIds
// - 跟父層傳進來的 spots 取交集（只能加進現在地圖上看得到的）
// - 已在 selectedSpots 內的不重複出現

interface RouteSheetProps {
  userLocation: { lat: number; lng: number } | null;
  spots: SpotMapPoint[];
  // 按 START 時觸發外部導航 sheet
  onStart?: () => void;
}

function formatDistanceKm(meters: number): string {
  return (meters / 1000).toFixed(1);
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds / 60);
  if (total < 60) return `${total}min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function isReordered(order: number[]): boolean {
  return order.some((v, i) => v !== i);
}

const MAX_WAYPOINTS = 5;

const MONO_LABEL: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains-mono), monospace",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

export function RouteSheet({ userLocation, spots, onStart }: RouteSheetProps) {
  const isOpen = useRoutePlannerStore((s) => s.isOpen);
  const selectedSpots = useRoutePlannerStore((s) => s.selectedSpots);
  const route = useRoutePlannerStore((s) => s.route);
  const isOptimizing = useRoutePlannerStore((s) => s.isOptimizing);
  const error = useRoutePlannerStore((s) => s.error);
  const addSpot = useRoutePlannerStore((s) => s.addSpot);
  const removeSpot = useRoutePlannerStore((s) => s.removeSpot);
  const clear = useRoutePlannerStore((s) => s.clear);
  const closeSheet = useRoutePlannerStore((s) => s.closeSheet);
  const optimize = useRoutePlannerStore((s) => s.optimize);

  const savedIds = useSavedStore((s) => s.savedSpotIds);
  const [pickerOpen, setPickerOpen] = useState(false);

  // OPTIMIZE 載入文案：每次按下時隨機抽，3s 換下一條
  const [loadingCopy, setLoadingCopy] = useState<string>(ROUTE_LOADING_COPY[0]);
  useEffect(() => {
    if (!isOptimizing) return;
    setLoadingCopy(pickRandomLoadingCopy());
    const interval = window.setInterval(() => {
      setLoadingCopy((curr) => pickNextLoadingCopy(curr));
    }, 3000);
    return () => window.clearInterval(interval);
  }, [isOptimizing]);

  // ≥5 點上限：用於控制「+ 從收藏選」按鈕與 picker 自動收起
  const atLimit = selectedSpots.length >= MAX_WAYPOINTS;

  // 可加入的收藏 spots：savedIds ∩ spots − selectedSpots
  const availableSaved = useMemo(() => {
    const selectedSet = new Set(selectedSpots.map((s) => s.id));
    return spots.filter(
      (s) => savedIds.includes(s.id) && !selectedSet.has(s.id)
    );
  }, [spots, savedIds, selectedSpots]);

  // 可規劃條件：
  // - 有 userLocation：至少 1 個 spot（origin + spot ≥ 2 點）
  // - 沒 userLocation：至少 2 個 spot
  const canOptimize = userLocation
    ? selectedSpots.length >= 1
    : selectedSpots.length >= 2;

  const handleOptimize = () => {
    void optimize(userLocation);
  };

  const handleStart = () => {
    onStart?.();
  };

  const reordered = route ? isReordered(route.optimizedOrder) : false;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="route-sheet"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="absolute left-0 right-0 bottom-0 z-30 flex flex-col"
          style={{
            background: "var(--panel-glass-strong)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid var(--line-strong)",
            borderTopLeftRadius: 2,
            borderTopRightRadius: 2,
            maxHeight: "60vh",
            boxShadow: "0 -16px 48px rgb(var(--background-rgb) / 0.5)",
          }}
        >
          {/* drag handle */}
          <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
            <div
              style={{
                width: 40,
                height: 4,
                background: "var(--muted)",
                opacity: 0.45,
                borderRadius: 2,
              }}
            />
          </div>

          {/* header */}
          <div
            className="flex items-center justify-between px-4 py-2 flex-shrink-0"
            style={{ borderBottom: "1px solid var(--line)" }}
          >
            <div
              style={{
                ...MONO_LABEL,
                fontSize: 10,
                letterSpacing: "0.18em",
                color: "var(--muted)",
              }}
            >
              archive://route · 歸檔行程
            </div>
            <button
              onClick={closeSheet}
              aria-label="關閉"
              style={{
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "1px solid var(--line)",
                borderRadius: 2,
                color: "var(--muted)",
                cursor: "pointer",
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* scrollable list */}
          <div
            className="px-4 py-2 flex-1"
            style={{ overflowY: "auto", minHeight: 0 }}
          >
            {/* user location 起點固定列 */}
            {userLocation && (
              <div
                className="flex items-center gap-2 py-2"
                style={{
                  borderBottom: "1px solid var(--line)",
                  ...MONO_LABEL,
                  fontSize: 11,
                  color: "var(--muted)",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      background: "var(--accent)",
                    }}
                  />
                </span>
                <span>pin · 我的位置</span>
                <span style={{ marginLeft: "auto", opacity: 0.6, fontSize: 10 }}>
                  {userLocation.lat.toFixed(3)}, {userLocation.lng.toFixed(3)}
                </span>
              </div>
            )}

            {/* selected spots */}
            {selectedSpots.length === 0 ? (
              <div
                className="py-4 text-center"
                style={{
                  ...MONO_LABEL,
                  fontSize: 11,
                  color: "var(--muted)",
                  opacity: 0.6,
                }}
              >
                點地圖 marker 或從收藏選擇
              </div>
            ) : (
              <ul className="py-2" style={{ listStyle: "none", padding: 0 }}>
                {selectedSpots.map((spot, i) => {
                  const isLast = i === selectedSpots.length - 1;
                  const isEnd = isLast && selectedSpots.length > 1;
                  let role: "start" | "waypoint" | "end";
                  let num = 0;
                  if (!userLocation && i === 0) {
                    role = "start";
                  } else if (isEnd) {
                    role = "end";
                  } else {
                    role = "waypoint";
                    num = userLocation ? i + 1 : i;
                  }

                  return (
                    <li
                      key={spot.id}
                      className="flex items-center gap-2 py-1.5"
                    >
                      {/* role icon */}
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {role === "start" && (
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              background: "var(--accent)",
                            }}
                          />
                        )}
                        {role === "end" && (
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              background: "var(--foreground)",
                            }}
                          />
                        )}
                        {role === "waypoint" && (
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              border: "1px solid var(--accent)",
                              background: "var(--background)",
                              color: "var(--accent)",
                              fontFamily:
                                "var(--font-jetbrains-mono), monospace",
                              fontSize: 9,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              lineHeight: 1,
                            }}
                          >
                            {String(num).padStart(2, "0")}
                          </span>
                        )}
                      </span>

                      {/* name */}
                      <span
                        className="font-content flex-1"
                        style={{
                          fontSize: 13,
                          color: "var(--foreground)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {spot.name}
                      </span>

                      {/* remove */}
                      <button
                        onClick={() => removeSpot(spot.id)}
                        aria-label="移除"
                        style={{
                          width: 22,
                          height: 22,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "transparent",
                          border: "1px solid var(--line)",
                          borderRadius: 2,
                          color: "var(--muted)",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* + 從收藏選 toggle（到上限改 disabled 提示） */}
            <button
              onClick={atLimit ? undefined : () => setPickerOpen(!pickerOpen)}
              disabled={atLimit}
              style={{
                marginTop: 4,
                width: "100%",
                padding: "8px 0",
                background: "transparent",
                border: "1px dashed var(--line-strong)",
                borderRadius: 2,
                color: "var(--muted)",
                ...MONO_LABEL,
                fontSize: 10,
                letterSpacing: "0.18em",
                cursor: atLimit ? "not-allowed" : "pointer",
                opacity: atLimit ? 0.4 : 1,
              }}
            >
              {atLimit
                ? `已達 ${MAX_WAYPOINTS} 點上限`
                : pickerOpen
                  ? "− 收起收藏"
                  : "+ 從收藏選"}
            </button>

            {/* saved picker panel（到上限自動收起） */}
            {pickerOpen && !atLimit && (
              <div style={{ marginTop: 6 }}>
                {availableSaved.length === 0 ? (
                  <div
                    className="py-3 text-center"
                    style={{
                      ...MONO_LABEL,
                      fontSize: 10,
                      color: "var(--muted)",
                      opacity: 0.5,
                    }}
                  >
                    {savedIds.length === 0
                      ? "尚未收藏景點 · 試試在景點頁面按收藏"
                      : "本區無已收藏景點 · 試試拖動地圖或擴大搜尋範圍"}
                  </div>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0 }}>
                    {availableSaved.map((spot) => (
                      <li key={spot.id} style={{ marginTop: 4 }}>
                        <button
                          onClick={() => addSpot(spot)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 10px",
                            background: "transparent",
                            border: "1px solid var(--line)",
                            borderRadius: 2,
                            color: "var(--foreground)",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span
                            style={{
                              color: "var(--accent)",
                              fontSize: 13,
                              lineHeight: 1,
                            }}
                          >
                            +
                          </span>
                          <span
                            className="font-content"
                            style={{
                              fontSize: 12,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {spot.name}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* error bar */}
          {error && (
            <div
              style={{
                padding: "6px 16px",
                background: "rgb(255 80 80 / 0.08)",
                borderTop: "1px solid rgb(255 80 80 / 0.3)",
                ...MONO_LABEL,
                fontSize: 10,
                color: "#ff8080",
              }}
            >
              err · {error}
            </div>
          )}

          {/* footer */}
          <div
            className="px-4 py-3 flex-shrink-0"
            style={{ borderTop: "1px solid var(--line-strong)" }}
          >
            {/* summary line */}
            <div
              style={{
                ...MONO_LABEL,
                fontSize: 10,
                color: "var(--muted)",
                marginBottom: 8,
                opacity: route ? 1 : 0.5,
              }}
            >
              {route ? (
                <>
                  total dist: {formatDistanceKm(route.distanceMeters)} km · est:{" "}
                  {formatDuration(route.durationSeconds)}
                  {reordered && (
                    <span style={{ color: "var(--accent)" }}>
                      {" · optimized ✓"}
                    </span>
                  )}
                </>
              ) : canOptimize ? (
                "ready · 按下 optimize 計算最佳順序"
              ) : (
                "尚需更多點 · 至少 2 點"
              )}
            </div>

            {/* actions */}
            <div className="flex gap-2">
              {selectedSpots.length > 0 && (
                <button
                  onClick={clear}
                  style={{
                    padding: "10px 14px",
                    background: "transparent",
                    border: "1px solid var(--line)",
                    borderRadius: 2,
                    color: "var(--muted)",
                    ...MONO_LABEL,
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    cursor: "pointer",
                  }}
                >
                  清空
                </button>
              )}
              {canOptimize && !route && (
                <button
                  onClick={handleOptimize}
                  disabled={isOptimizing}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    background: "rgb(var(--accent-rgb) / 0.15)",
                    border: "1px solid var(--accent)",
                    borderRadius: 2,
                    color: "var(--accent)",
                    ...MONO_LABEL,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    cursor: isOptimizing ? "wait" : "pointer",
                    opacity: isOptimizing ? 0.6 : 1,
                  }}
                >
                  {isOptimizing ? loadingCopy : "optimize / 規劃路線"}
                </button>
              )}
              {route && (
                <button
                  onClick={handleStart}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    background: "var(--accent)",
                    border: "1px solid var(--accent)",
                    borderRadius: 2,
                    color: "var(--background)",
                    ...MONO_LABEL,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    cursor: "pointer",
                    boxShadow: "0 0 16px rgb(var(--accent-rgb) / 0.4)",
                  }}
                >
                  start / 開始導航
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

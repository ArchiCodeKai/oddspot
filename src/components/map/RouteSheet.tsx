"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence, Reorder, useDragControls, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRoutePlannerStore } from "@/store/useRoutePlannerStore";
import { useSavedStore } from "@/store/useSavedStore";
import {
  REDUCED_SHEET_MOTION,
  SHEET_DRAG_CLOSE_OFFSET,
  SHEET_DRAG_CLOSE_VELOCITY,
  SHEET_MOTION,
} from "@/lib/motion/sheetMotion";
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

// sheet 高度由內容決定，只設上下限：
// 上限 86dvh（超過就由中段 list 捲動）、下限避免空狀態太扁。
// 不用選點數估算——footer 會因為「開始導航」按鈕在規劃後才出現而長高，
// 任何靜態估算都會少算，導致底部操作被擠出畫面。
const ROUTE_SHEET_MIN_HEIGHT = "min(360px, 86dvh)";
const ROUTE_SHEET_MAX_HEIGHT = "86dvh";

export function RouteSheet({ userLocation, spots, onStart }: RouteSheetProps) {
  const t = useTranslations("routeSheet");
  const dragControls = useDragControls();
  const shouldReduceMotion = useReducedMotion();
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
  const planInOrder = useRoutePlannerStore((s) => s.planInOrder);
  const reorder = useRoutePlannerStore((s) => s.reorder);

  const savedIds = useSavedStore((s) => s.savedSpotIds);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

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

  const handlePlanInOrder = () => {
    void planInOrder(userLocation);
  };

  const handleStart = () => {
    onStart?.();
  };

  const handleReorder = (nextOrder: SpotMapPoint[]) => {
    const changedIndex = nextOrder.findIndex(
      (spot, index) => selectedSpots[index]?.id !== spot.id
    );
    if (changedIndex === -1) return;

    const movedSpot = nextOrder[changedIndex];
    const oldIndex = selectedSpots.findIndex((spot) => spot.id === movedSpot.id);
    if (oldIndex === -1) return;
    reorder(oldIndex, changedIndex);
  };

  const reordered = route ? isReordered(route.optimizedOrder) : false;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="route-sheet"
          variants={shouldReduceMotion ? REDUCED_SHEET_MOTION : SHEET_MOTION}
          initial="initial"
          animate="animate"
          exit="exit"
          drag={shouldReduceMotion ? false : "y"}
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.32 }}
          onDragEnd={(_, info) => {
            if (
              info.offset.y > SHEET_DRAG_CLOSE_OFFSET ||
              info.velocity.y > SHEET_DRAG_CLOSE_VELOCITY
            ) {
              closeSheet();
            }
          }}
          className="absolute left-0 right-0 bottom-0 z-40 flex flex-col"
          style={{
            background: "var(--panel-glass-strong)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid var(--line-strong)",
            borderTopLeftRadius: 2,
            borderTopRightRadius: 2,
            height: "auto",
            minHeight: ROUTE_SHEET_MIN_HEIGHT,
            maxHeight: ROUTE_SHEET_MAX_HEIGHT,
            boxShadow: "0 -16px 48px rgb(var(--background-rgb) / 0.5)",
          }}
        >
          {/* drag handle */}
          <div
            className="flex justify-center pt-2 pb-1 flex-shrink-0"
            onPointerDown={(event) => dragControls.start(event)}
            style={{ cursor: "grab", touchAction: "none" }}
            aria-label={t("swipeDownToClose")}
            role="button"
            tabIndex={0}
          >
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
            onPointerDown={(event) => dragControls.start(event)}
            style={{ borderBottom: "1px solid var(--line)", touchAction: "none" }}
          >
            <div
              style={{
                ...MONO_LABEL,
                fontSize: 10,
                letterSpacing: "0.18em",
                color: "var(--muted)",
              }}
            >
              {t("title")}
            </div>
            <button
              onClick={closeSheet}
              onPointerDown={(event) => event.stopPropagation()}
              aria-label={t("close")}
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

          {/* route list — 唯一可捲動區，讓 footer 永遠釘在底部不被擠出畫面。
              用 flex-auto（basis:auto）而非 flex-1（basis:0）：sheet 是 auto 高度，
              basis:0 會讓這段塌陷成 0；auto 才會撐開內容、碰到 max-height 再收縮捲動。 */}
          <div
            className="px-4 py-3 flex-auto min-h-0"
            style={{
              overflowY: "auto",
              overflowX: "hidden",
              // 不把捲動傳遞給底下的地圖/頁面（維持一頁式）
              overscrollBehavior: "contain",
            }}
          >
            {/* user location 起點固定列 */}
            {userLocation && (
              <div
                className="flex items-center gap-3 py-3 px-2"
                style={{
                  borderBottom: "1px solid var(--line)",
                  background: "rgb(var(--background-rgb) / 0.12)",
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
                <span>{t("origin")}</span>
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
                {t("empty")}
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={selectedSpots}
                onReorder={handleReorder}
                className="py-2"
                style={{
                  listStyle: "none",
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                  gap: 8,
                  width: "100%",
                  minWidth: 0,
                }}
              >
                {selectedSpots.map((spot, i) => {
                  return (
                    <Reorder.Item
                      key={spot.id}
                      value={spot}
                      onDragStart={() => setDraggingIndex(i)}
                      onDragEnd={() => setDraggingIndex(null)}
                      className="flex items-center gap-3 transition-opacity"
                      layout="position"
                      style={{
                        width: "100%",
                        maxWidth: "100%",
                        boxSizing: "border-box",
                        flex: "0 0 auto",
                        minHeight: 48,
                        padding: "7px 10px",
                        background:
                          draggingIndex === i
                            ? "rgb(var(--accent-rgb) / 0.1)"
                            : "rgb(var(--background-rgb) / 0.16)",
                        border: `1px solid ${
                          draggingIndex === i
                            ? "rgb(var(--accent-rgb) / 0.42)"
                            : "var(--line)"
                        }`,
                        borderRadius: 2,
                        opacity: draggingIndex === i ? 0.45 : 1,
                        cursor: "grab",
                        transformOrigin: "center",
                        boxShadow:
                          draggingIndex === i
                            ? "0 0 20px rgb(var(--accent-rgb) / 0.14)"
                            : "none",
                      }}
                    >
                      <span
                        aria-label={t("dragHandle")}
                        title={t("dragHandle")}
                        style={{
                          width: 20,
                          minHeight: 34,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--muted)",
                          opacity: 0.65,
                          fontFamily: "var(--font-jetbrains-mono), monospace",
                          fontSize: 12,
                          lineHeight: 1,
                          cursor: "grab",
                          touchAction: "none",
                        }}
                      >
                        ⋮
                      </span>
                      {/* role icon */}
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            border: "1px solid var(--accent)",
                            background: "rgb(var(--accent-rgb) / 0.08)",
                            color: "var(--accent)",
                            fontFamily:
                              "var(--font-jetbrains-mono), monospace",
                            fontSize: 10,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 1,
                          }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
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

                      <button
                        onClick={() => removeSpot(spot.id)}
                        aria-label={t("remove")}
                        style={{
                          width: 36,
                          height: 36,
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
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            )}

            {/* + 從收藏選 toggle（到上限改 disabled 提示） */}
            <button
              onClick={atLimit ? undefined : () => setPickerOpen(!pickerOpen)}
              disabled={atLimit}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "11px 0",
                background: "transparent",
                border: "1px dashed var(--line-strong)",
                borderRadius: 2,
                // 滿點時提高文字對比（--muted × 0.4 在四個 theme 都太淡），
                // disabled 感交給虛線框 + not-allowed 游標
                color: atLimit ? "var(--foreground)" : "var(--muted)",
                ...MONO_LABEL,
                fontSize: 10,
                letterSpacing: "0.18em",
                cursor: atLimit ? "not-allowed" : "pointer",
                opacity: atLimit ? 0.75 : 1,
              }}
            >
              {atLimit
                ? t("limitReached", { max: MAX_WAYPOINTS })
                : pickerOpen
                  ? t("collapseSaved")
                  : t("addSaved")}
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
                      ? t("noSaved")
                      : t("noSavedInArea")}
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

          {/* footer — 固定不縮，並保留 iOS home indicator 的安全區 */}
          <div
            className="px-4 pt-3 flex-shrink-0"
            style={{
              borderTop: "1px solid var(--line-strong)",
              paddingBottom: "max(12px, env(safe-area-inset-bottom))",
            }}
          >
            {/* summary line */}
            <div
              style={{
                ...MONO_LABEL,
                fontSize: 11,
                color: "var(--muted)",
                marginBottom: 10,
                opacity: route ? 1 : 0.72,
              }}
            >
              {route ? (
                <>
                  {t("totalDist")}: {formatDistanceKm(route.distanceMeters)} km · {t("est")}:{" "}
                  {formatDuration(route.durationSeconds)}
                  {reordered && (
                    <span style={{ color: "var(--accent)" }}>
                      {" · "}
                      {t("optimized")}
                    </span>
                  )}
                </>
              ) : canOptimize ? (
                t("ready")
              ) : (
                t("needMorePoints")
              )}
            </div>

            {/* actions */}
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns:
                  selectedSpots.length > 0
                    ? "repeat(3, minmax(0, 1fr))"
                    : "repeat(2, minmax(0, 1fr))",
              }}
            >
              {selectedSpots.length > 0 && (
                <button
                  onClick={clear}
                  style={{
                    minHeight: 44,
                    padding: "12px 14px",
                    minWidth: 0,
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
                  {t("clear")}
                </button>
              )}
              {canOptimize && (
                <button
                  onClick={handlePlanInOrder}
                  disabled={isOptimizing}
                  style={{
                    minHeight: 44,
                    padding: "12px 12px",
                    minWidth: 0,
                    background: "transparent",
                    border: "1px solid var(--line-strong)",
                    borderRadius: 2,
                    color: "var(--foreground)",
                    ...MONO_LABEL,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    cursor: isOptimizing ? "wait" : "pointer",
                    opacity: isOptimizing ? 0.6 : 1,
                  }}
                >
                  {t("planInOrder")}
                </button>
              )}
              {canOptimize && (
                <button
                  onClick={handleOptimize}
                  disabled={isOptimizing}
                  style={{
                    minHeight: 44,
                    padding: "12px 12px",
                    minWidth: 0,
                    background: "rgb(var(--accent-rgb) / 0.15)",
                    border: "1px solid var(--accent)",
                    borderRadius: 2,
                    color: "var(--accent)",
                    ...MONO_LABEL,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    cursor: isOptimizing ? "wait" : "pointer",
                    opacity: isOptimizing ? 0.6 : 1,
                  }}
                  aria-label={isOptimizing ? t("optimizing") : t("optimize")}
                >
                  {isOptimizing ? <LoadingDots /> : t("optimize")}
                </button>
              )}
              {route && (
                <button
                  onClick={handleStart}
                  style={{
                    gridColumn: "1 / -1",
                    padding: "12px 14px",
                    minHeight: 46,
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
                  {t("start")}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LoadingDots() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        minHeight: 12,
      }}
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="route-loading-dot"
          style={{
            width: 4,
            height: 4,
            background: "currentColor",
            borderRadius: 1,
            animation: "route-dots 0.9s ease-in-out infinite",
            animationDelay: `${index * 120}ms`,
          }}
        />
      ))}
      <style>{`
        @keyframes route-dots {
          0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .route-loading-dot { animation: none !important; opacity: 1; }
        }
      `}</style>
    </span>
  );
}

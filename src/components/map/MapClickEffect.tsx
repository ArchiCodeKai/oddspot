"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { cursorState } from "@/lib/cursor-state";

gsap.registerPlugin(MotionPathPlugin);

// 地圖點擊箭頭效果
//
// 長軌跡（路徑長 ≥ 50px）：
//   - 箭頭從 160px 外沿真實軌跡曲線飛入（power3.out：先快後慢）
//   - 抵達後：落針動畫（箭頭縮小消失）+ 2 層漣漪擴散
//
// 短軌跡（< 50px，例如游標靜止後點擊）：
//   - 直接跳過箭頭，只在點擊點播放 3 層漣漪擴散
//
// 必須在 layout.tsx 渲染（position:fixed 不可在任何 transform 祖先內）

type Point = { x: number; y: number };

interface ImpactState {
  x: number;
  y: number;
  id: number;
  rings: 2 | 3;    // 2 = 箭頭抵達後，3 = 短軌跡直接衝擊
}

const SPAWN_DIST = 160;  // px：箭頭起跳距離（改為 2x）

// 箭頭旋轉角度（0° = 朝上，SVG 箭頭尖端朝上設計）
function angleDeg(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI) + 90;
}

// 從 cursorState.trail 取最近 700ms 的軌跡，走回 SPAWN_DIST，回傳完整路徑陣列
function buildWaypoints(targetX: number, targetY: number): { pts: Point[]; pathLen: number } {
  const now    = Date.now();
  const recent = cursorState.trail.filter((d) => now - d.born < 700);

  let pts: Point[];

  if (recent.length >= 3) {
    let accumulated = 0;
    let startIdx    = 0;
    for (let i = recent.length - 1; i > 0; i--) {
      accumulated += Math.hypot(recent[i].x - recent[i - 1].x, recent[i].y - recent[i - 1].y);
      if (accumulated >= SPAWN_DIST) {
        startIdx = i;
        break;
      }
    }
    pts = recent.slice(startIdx).map((d) => ({ x: d.x, y: d.y }));
    pts.push({ x: targetX, y: targetY });
  } else {
    // 後備：以 lastAngle 反方向直線出發
    pts = [
      {
        x: targetX - Math.cos(cursorState.lastAngle) * SPAWN_DIST,
        y: targetY - Math.sin(cursorState.lastAngle) * SPAWN_DIST,
      },
      { x: targetX, y: targetY },
    ];
  }

  // 計算路徑總長（用於判斷是否播放箭頭動畫）
  let pathLen = 0;
  for (let i = 1; i < pts.length; i++) {
    pathLen += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }

  return { pts, pathLen };
}

export function MapClickEffect() {
  const arrowRef = useRef<HTMLDivElement>(null);
  const [impact, setImpact] = useState<ImpactState>({
    x: 0, y: 0, id: 0, rings: 2,
  });
  const [impactActive, setImpactActive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    // Mobile / tablet viewport（含 DevTools 模擬手機）
    if (window.matchMedia("(max-width: 1023px)").matches) return;

    const arrowEl = arrowRef.current;
    if (!arrowEl) return;

    gsap.set(arrowEl, {
      xPercent: -50,
      yPercent: -50,
      x: -400,
      y: -400,
      opacity: 0,
      scale: 0.8,
    });

    const onMarkerClick = (e: Event) => {
      const { targetX, targetY } =
        (e as CustomEvent<{ targetX: number; targetY: number }>).detail;

      const { pts, pathLen } = buildWaypoints(targetX, targetY);

      // ── 短軌跡：直接播放漣漪，不出現箭頭 ──
      if (pathLen < 50) {
        setImpact({ x: targetX, y: targetY, id: Date.now(), rings: 3 });
        setImpactActive(true);
        return;
      }

      // ── 長軌跡：箭頭沿曲線飛入 ──
      if (pts.length < 2) return;

      // 飛行時間（依路徑長線性估算）
      const flyTime = Math.min(0.8, Math.max(0.35, pathLen / 280));

      // 初始旋轉：面向第一段移動方向
      const initRot = angleDeg(pts[0], pts[1]);

      gsap.killTweensOf(arrowEl);
      gsap.set(arrowEl, {
        x: pts[0].x,
        y: pts[0].y,
        rotation: initRot,
        opacity: 1,
        scale: 1,
      });

      // MotionPath 沿軌跡飛行（power3.out = 先快後慢，緩緩降落）
      gsap.to(arrowEl, {
        duration:   flyTime,
        ease:       "power3.out",
        motionPath: {
          path:       pts.slice(1),    // 從當前位置（pts[0]）起飛
          autoRotate: 90,              // +90° 讓箭頭尖端（SVG 朝上）對齊移動方向
          curviness:  0.5,             // 輕微曲線平滑，保留軌跡形狀
        },
        onComplete: () => {
          // 落針動畫：箭頭縮小消失
          gsap.timeline()
            .to(arrowEl, {
              scaleY:   0.25,
              scaleX:   1.2,
              y:        `+=${6}`,
              duration: 0.12,
              ease:     "power2.in",
            })
            .to(arrowEl, {
              scale:    0,
              opacity:  0,
              duration: 0.1,
              ease:     "power1.in",
              onComplete: () => {
                gsap.set(arrowEl, { x: -400, y: -400, opacity: 0, scale: 1 });
              },
            });

          // 漣漪擴散（2 層）
          setImpact({ x: targetX, y: targetY, id: Date.now(), rings: 2 });
          setImpactActive(true);
        },
      });
    };

    window.addEventListener("oddspot:markerclick", onMarkerClick);
    return () => window.removeEventListener("oddspot:markerclick", onMarkerClick);
  }, []);

  // 最後一個 ring 動畫結束後清除
  const handleLastRingEnd = () => setImpactActive(false);

  // ring 樣式基底
  const ringBase: React.CSSProperties = {
    position:      "fixed",
    top:           impact.y,
    left:          impact.x,
    borderRadius:  "50%",
    border:        "1.5px solid var(--accent)",
    pointerEvents: "none",
    zIndex:        99998,
  };

  return (
    <>
      {/* 飛行箭頭 */}
      <div
        ref={arrowRef}
        aria-hidden="true"
        style={{
          position:      "fixed",
          top:           0,
          left:          0,
          pointerEvents: "none",
          zIndex:        99998,
          willChange:    "transform",
        }}
      >
        <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
          <polyline
            points="1.5,8 7,1.5 12.5,8"
            stroke="var(--accent)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="7" y1="1.5" x2="7" y2="18.5"
            stroke="var(--accent)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="2 3.5"
          />
        </svg>
      </div>

      {/* 漣漪擴散（2 層：箭頭抵達，或 3 層：短軌跡直接衝擊） */}
      {impactActive && (
        <>
          {/* 層 1：主要漣漪（較慢、較大） */}
          <div
            key={`r1-${impact.id}`}
            aria-hidden="true"
            style={{
              ...ringBase,
              width:  20,
              height: 20,
              marginLeft: -10,
              marginTop:  -10,
              animation: "impactRing1 0.55s cubic-bezier(0.2,0,0.8,1) forwards",
            }}
          />
          {/* 層 2：次要漣漪（稍快、稍小，輕微延遲） */}
          <div
            key={`r2-${impact.id}`}
            aria-hidden="true"
            onAnimationEnd={impact.rings <= 2 ? handleLastRingEnd : undefined}
            style={{
              ...ringBase,
              width:  20,
              height: 20,
              marginLeft: -10,
              marginTop:  -10,
              animation: "impactRing2 0.38s cubic-bezier(0.2,0,0.6,1) 0.06s forwards",
            }}
          />
          {/* 層 3：短軌跡衝擊才出現（第三層，最快最小） */}
          {impact.rings >= 3 && (
            <div
              key={`r3-${impact.id}`}
              aria-hidden="true"
              onAnimationEnd={handleLastRingEnd}
              style={{
                ...ringBase,
                width:  20,
                height: 20,
                marginLeft: -10,
                marginTop:  -10,
                animation: "impactRing3 0.28s cubic-bezier(0.1,0,0.5,1) 0.03s forwards",
              }}
            />
          )}
        </>
      )}

      <style>{`
        /* 主漣漪：大範圍擴散 */
        @keyframes impactRing1 {
          0%   { transform: scale(0.3); opacity: 0.85; }
          100% { transform: scale(3.2); opacity: 0;    }
        }
        /* 次漣漪：中範圍 */
        @keyframes impactRing2 {
          0%   { transform: scale(0.3); opacity: 0.6; }
          100% { transform: scale(2.0); opacity: 0;   }
        }
        /* 第三層漣漪（短軌跡限定）：小範圍、最快 */
        @keyframes impactRing3 {
          0%   { transform: scale(0.2); opacity: 0.5; }
          100% { transform: scale(1.4); opacity: 0;   }
        }
      `}</style>
    </>
  );
}

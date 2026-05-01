"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { cursorState } from "@/lib/cursor-state";

// v3 Acid 游標軌跡：
//   - SVG <line> 線段陣列（不是 Canvas、不是 polyline）
//   - 40-point ring buffer：FIFO，最舊的會被擠出
//   - 線性 opacity 衰減（i/N）：新端最亮、舊端淡出
//   - 1px stroke、無 gradient、無 glow、無 smoothing
//   - 設計檔哲學："raw pixel path is more Acid"
//   - 觸控設備完全跳過
//
// 同時維護 cursorState.trail 供 MapClickEffect 讀取（保持向後相容）

const TRAIL_LENGTH    = 40;   // ring buffer 大小
const DOT_SPACING     = 10;   // px：路徑取樣點間距
const STROKE_WIDTH    = 1;    // px：v3 規格 1px raw line
const CURSOR_GAP      = 14;   // px：游標尖端附近不畫
const IDLE_DRAIN_MS   = 120;  // 停止移動超過此時間後，每幀 drain 一個點
const TRAIL_LIFE_MS   = 700;  // 給 cursorState.trail 用（MapClickEffect 仍依時間清理）

const LIGHT_TRAIL_RGB     = "80,80,80";
const LIGHT_CURSOR_STROKE = "#2a2a2a";
const LIGHT_CURSOR_FILL   = "#f0f0f0";

export function MagneticCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const svgRef    = useRef<SVGSVGElement>(null);
  const lineRefs  = useRef<SVGLineElement[]>([]);
  // 是否啟用 cursor — 依 viewport 跟 pointer 類型決定
  // 用 state 控制 return JSX，避免「div 仍渲染 + listener 沒掛」的鬼影 cursor
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      // 觸控裝置（真實手機/平板的 pointer 是 coarse）
      if (window.matchMedia("(pointer: coarse)").matches) return false;
      // Mobile / tablet viewport（含 DevTools 模擬手機）
      if (window.matchMedia("(max-width: 1023px)").matches) return false;
      return true;
    };
    setEnabled(check());
    // 視窗 resize 跨閾值 → 重新評估（DevTools 切 viewport 即時生效）
    const onResize = () => setEnabled(check());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!enabled) return;

    const cursorEl = cursorRef.current;
    if (!cursorEl) return;

    // 強制隱藏 OS 游標
    const hideCursorStyle = document.createElement("style");
    hideCursorStyle.textContent = "* { cursor: none !important; }";
    document.head.appendChild(hideCursorStyle);

    gsap.set(cursorEl, { x: -300, y: -300, opacity: 0 });

    // ─── Ring buffer：本地 40 點 ───────────────────────────────
    const points: Array<{ x: number; y: number }> = [];
    const lastDot = { x: -300, y: -300 };
    let firstMove = true;
    let lastMoveTime = 0;

    const pushPoint = (x: number, y: number, born: number, angle: number) => {
      points.push({ x, y });
      while (points.length > TRAIL_LENGTH) points.shift();
      // 同步寫入共享 trail（MapClickEffect 用）
      cursorState.trail.push({ x, y, born, angle });
    };

    const onMove = (e: MouseEvent) => {
      const cx = e.clientX;
      const cy = e.clientY;
      lastMoveTime = performance.now();

      cursorState.pos.x = cx;
      cursorState.pos.y = cy;
      gsap.set(cursorEl, { x: cx - 1, y: cy - 1 });

      if (firstMove) {
        firstMove = false;
        lastDot.x = cx;
        lastDot.y = cy;
        gsap.to(cursorEl, { opacity: 1, duration: 0.15 });
        return;
      }

      const dx = cx - lastDot.x;
      const dy = cy - lastDot.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) cursorState.lastAngle = Math.atan2(dy, dx);
      if (dist < DOT_SPACING) return;

      const angle = Math.atan2(dy, dx);
      const now = Date.now();

      let d = DOT_SPACING;
      let placed = 0;
      while (d <= dist) {
        const t = d / dist;
        pushPoint(lastDot.x + dx * t, lastDot.y + dy * t, now, angle);
        d += DOT_SPACING;
        placed++;
      }
      if (placed > 0) {
        const lastD = d - DOT_SPACING;
        lastDot.x += (dx / dist) * lastD;
        lastDot.y += (dy / dist) * lastD;
      }
    };

    const onOver = (e: MouseEvent) => {
      const isInteractive = !!(e.target as HTMLElement).closest(
        "a, button, [role=button], [data-interactive]"
      );
      gsap.to(cursorEl, { scale: isInteractive ? 1.25 : 1, duration: 0.16, ease: "power2.out" });
    };
    const onLeave = () => gsap.to(cursorEl, { opacity: 0, duration: 0.15 });
    const onEnter = () => gsap.to(cursorEl, { opacity: 1, duration: 0.15 });

    // ─── rAF：寫入每條 line 的 x1/y1/x2/y2/stroke-opacity ───────
    let raf = 0;
    const draw = () => {
      const now = performance.now();
      const epoch = Date.now();

      // 清理過期 cursorState.trail（給 MapClickEffect 用，本地 ring buffer 不需要）
      while (cursorState.trail.length && epoch - cursorState.trail[0].born > TRAIL_LIFE_MS) {
        cursorState.trail.shift();
      }

      // 停止移動超過閾值 → 每幀 drain 一個本地 ring buffer 點
      if (now - lastMoveTime > IDLE_DRAIN_MS && points.length > 0) {
        points.shift();
      }

      // 主題色（每幀讀，支援即時切換）
      const isLight = document.documentElement.classList.contains("light");
      const accentRgb = isLight
        ? LIGHT_TRAIL_RGB
        : getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim() || "95,217,192";

      const cx = cursorState.pos.x;
      const cy = cursorState.pos.y;

      // 從新到舊掃 N-1 條線（i=0 連接最新兩點，i=TRAIL_LENGTH-2 連接最舊兩點）
      for (let i = 0; i < TRAIL_LENGTH - 1; i++) {
        const line = lineRefs.current[i];
        if (!line) continue;

        const newerIdx = points.length - 1 - i;
        const olderIdx = newerIdx - 1;
        if (newerIdx < 0 || olderIdx < 0) {
          // 軌跡不夠長，這條 line 隱藏
          line.setAttribute("stroke-opacity", "0");
          continue;
        }

        const p0 = points[newerIdx];
        const p1 = points[olderIdx];

        // 游標尖端附近的點不畫
        const distToCursor = Math.hypot(p0.x - cx, p0.y - cy);
        if (distToCursor < CURSOR_GAP) {
          line.setAttribute("stroke-opacity", "0");
          continue;
        }

        // 線性 opacity：i=0（最新）≈ 1，i=N-2（最舊）≈ 0
        const opacity = 1 - i / (TRAIL_LENGTH - 1);

        line.setAttribute("x1", String(p0.x));
        line.setAttribute("y1", String(p0.y));
        line.setAttribute("x2", String(p1.x));
        line.setAttribute("y2", String(p1.y));
        line.setAttribute("stroke", `rgba(${accentRgb.replace(/\s+/g, ",")},${opacity})`);
        line.setAttribute("stroke-opacity", "1");
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    document.addEventListener("mousemove",  onMove);
    document.addEventListener("mouseover",  onOver, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    return () => {
      cancelAnimationFrame(raf);
      hideCursorStyle.remove();
      document.removeEventListener("mousemove",  onMove);
      document.removeEventListener("mouseover",  onOver);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, [enabled]);

  // 手機/平板 viewport 完全不渲染 cursor（DOM 內也沒有殘影）
  if (!enabled) return null;

  return (
    <>
      {/* 游標主題色 */}
      <style>{`
        .mc-cursor-path {
          stroke: var(--accent);
          fill: var(--background);
        }
        :root.light .mc-cursor-path {
          stroke: ${LIGHT_CURSOR_STROKE};
          fill: ${LIGHT_CURSOR_FILL};
        }
        .mc-cursor-wrapper {
          filter: drop-shadow(0 0 3px rgb(var(--accent-rgb) / 0.55));
        }
        :root.light .mc-cursor-wrapper {
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.22));
        }
      `}</style>

      {/* SVG ring buffer 軌跡 — N-1 條 <line>，每條獨立 stroke-opacity */}
      <svg
        ref={svgRef}
        aria-hidden="true"
        style={{
          position:      "fixed",
          top:           0,
          left:          0,
          width:         "100vw",
          height:        "100vh",
          pointerEvents: "none",
          zIndex:        99997,
        }}
      >
        {Array.from({ length: TRAIL_LENGTH - 1 }).map((_, i) => (
          <line
            key={i}
            ref={(el) => {
              if (el) lineRefs.current[i] = el;
            }}
            x1="0"
            y1="0"
            x2="0"
            y2="0"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="square"
            strokeOpacity="0"
          />
        ))}
      </svg>

      {/* 自定義箭頭游標 */}
      <div
        ref={cursorRef}
        aria-hidden="true"
        className="mc-cursor-wrapper"
        style={{
          position:      "fixed",
          top:           0,
          left:          0,
          pointerEvents: "none",
          zIndex:        99999,
          willChange:    "transform",
        }}
      >
        <svg
          width="15"
          height="19"
          viewBox="0 0 15 19"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="mc-cursor-path"
            d="M 1.5 1.5 L 1.5 14 L 4.8 10.8 L 7.2 16.5 L 9.3 15.5 L 6.9 9.8 L 12.5 9.8 Z"
            strokeWidth="1.3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </>
  );
}

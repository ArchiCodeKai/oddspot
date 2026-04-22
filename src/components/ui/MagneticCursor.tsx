"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { cursorState } from "@/lib/cursor-state";

// 游標系統：
//   - 自定義箭頭游標 SVG（深色模式：螢光綠；淺色模式：深灰黑）
//   - Canvas 虛線軌跡：quadraticCurveTo 平滑貝茲曲線 + setLineDash
//     → 靜態虛線，忠實跟隨游標路徑，無流動/延遲動畫
//     → 深色模式：accent 色（螢光綠）；淺色模式：鐵灰色
//   - 觸控設備完全跳過

const TRAIL_LIFE  = 650;   // ms：軌跡存活時間
const DOT_SPACING = 10;    // px：路徑取樣點間距
const DASH_W      = 9;     // px：每節虛線長度
const GAP_W       = 5;     // px：虛線間距
const LINE_W      = 2.4;   // px：線段寬度
const ALPHA_PEAK  = 0.78;  // 軌跡峰值透明度
const CURSOR_GAP  = 16;    // px：游標尖端附近不畫

// 淺色模式顏色（hardcoded）
const LIGHT_TRAIL_RGB  = { r: 80,  g: 80,  b: 80  }; // 鐵灰色軌跡
const LIGHT_CURSOR_STROKE = "#2a2a2a";                 // 深灰黑游標描邊
const LIGHT_CURSOR_FILL   = "#f0f0f0";                 // 淺灰游標填色

export function MagneticCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const canvas   = canvasRef.current;
    const cursorEl = cursorRef.current;
    if (!canvas || !cursorEl) return;

    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // 深色模式軌跡顏色：讀取 --accent（螢光綠）
    const accentHex = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent").trim() || "#00e5cc";
    const parseRGB = (h: string) => ({
      r: parseInt(h.slice(1, 3), 16),
      g: parseInt(h.slice(3, 5), 16),
      b: parseInt(h.slice(5, 7), 16),
    });
    const darkTrailRGB = parseRGB(accentHex);

    const resize = () => {
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width  = window.innerWidth  + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // 全域強制隱藏 OS 游標（含 cursor:pointer 的子元素）
    const hideCursorStyle = document.createElement("style");
    hideCursorStyle.textContent = "* { cursor: none !important; }";
    document.head.appendChild(hideCursorStyle);

    gsap.set(cursorEl, { x: -300, y: -300, opacity: 0 });

    // 攜帶餘量演算法：lastDotPos → 均勻間距，不受速度影響
    const lastDotPos = { x: -300, y: -300 };
    let firstMove = true;

    const onMove = (e: MouseEvent) => {
      const cx = e.clientX;
      const cy = e.clientY;

      cursorState.pos.x = cx;
      cursorState.pos.y = cy;

      // 游標 SVG 即時跟隨（tip 對齊，偏移 1px）
      gsap.set(cursorEl, { x: cx - 1, y: cy - 1 });

      if (firstMove) {
        firstMove = false;
        lastDotPos.x = cx;
        lastDotPos.y = cy;
        gsap.to(cursorEl, { opacity: 1, duration: 0.15 });
        return;
      }

      const dx   = cx - lastDotPos.x;
      const dy   = cy - lastDotPos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 1) {
        cursorState.lastAngle = Math.atan2(dy, dx);
      }

      if (dist < DOT_SPACING) return;

      const angle = Math.atan2(dy, dx);
      const now   = Date.now();

      let d = DOT_SPACING;
      let placedCount = 0;
      while (d <= dist) {
        const t = d / dist;
        cursorState.trail.push({
          x:     lastDotPos.x + dx * t,
          y:     lastDotPos.y + dy * t,
          born:  now,
          angle,
        });
        d += DOT_SPACING;
        placedCount++;
      }

      if (placedCount > 0) {
        const lastD = d - DOT_SPACING;
        lastDotPos.x = lastDotPos.x + (dx / dist) * lastD;
        lastDotPos.y = lastDotPos.y + (dy / dist) * lastD;
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

    // ─── Canvas RAF：平滑貝茲曲線虛線軌跡（靜態，無流動動畫）─────
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const now = Date.now();

      while (cursorState.trail.length && now - cursorState.trail[0].born > TRAIL_LIFE) {
        cursorState.trail.shift();
      }

      const visible = cursorState.trail.filter(
        (d) => Math.hypot(d.x - cursorState.pos.x, d.y - cursorState.pos.y) >= CURSOR_GAP
      );

      if (visible.length >= 2) {
        // 依主題選擇軌跡顏色（每幀讀取，支援即時主題切換）
        const isLight = document.documentElement.classList.contains("light");
        const { r, g, b } = isLight ? LIGHT_TRAIL_RGB : darkTrailRGB;

        // 平滑二次貝茲曲線（轉角不再生硬）
        ctx.beginPath();
        ctx.moveTo(visible[0].x, visible[0].y);

        for (let i = 1; i < visible.length - 1; i++) {
          const mx = (visible[i].x + visible[i + 1].x) / 2;
          const my = (visible[i].y + visible[i + 1].y) / 2;
          ctx.quadraticCurveTo(visible[i].x, visible[i].y, mx, my);
        }
        ctx.lineTo(visible[visible.length - 1].x, visible[visible.length - 1].y);

        // 漸層：舊端淡入 → 峰值 → 近游標端微淡
        const x0 = visible[0].x;
        const y0 = visible[0].y;
        const x1 = visible[visible.length - 1].x;
        const y1 = visible[visible.length - 1].y;
        const gradDist = Math.hypot(x1 - x0, y1 - y0);

        let strokeStyle: string | CanvasGradient;
        if (gradDist < 4) {
          strokeStyle = `rgba(${r},${g},${b},${ALPHA_PEAK})`;
        } else {
          const grad = ctx.createLinearGradient(x0, y0, x1, y1);
          grad.addColorStop(0.00, `rgba(${r},${g},${b},0.04)`);
          grad.addColorStop(0.15, `rgba(${r},${g},${b},${ALPHA_PEAK})`);
          grad.addColorStop(0.80, `rgba(${r},${g},${b},${ALPHA_PEAK})`);
          grad.addColorStop(1.00, `rgba(${r},${g},${b},0.22)`);
          strokeStyle = grad;
        }

        // 靜態虛線：lineDashOffset 固定為 0，不做流動動畫
        ctx.setLineDash([DASH_W, GAP_W]);
        ctx.lineDashOffset = 0;
        ctx.lineWidth      = LINE_W;
        ctx.lineCap        = "round";
        ctx.strokeStyle    = strokeStyle;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    document.addEventListener("mousemove",  onMove);
    document.addEventListener("mouseover",  onOver, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      hideCursorStyle.remove();
      document.removeEventListener("mousemove",  onMove);
      document.removeEventListener("mouseover",  onOver);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      {/* 游標主題色：深色模式用 --accent，淺色模式用深灰黑 */}
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

      {/* Canvas：平滑貝茲虛線軌跡 */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position:      "fixed",
          top:           0,
          left:          0,
          pointerEvents: "none",
          zIndex:        99997,
        }}
      />

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

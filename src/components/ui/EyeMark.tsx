"use client";

import { useEffect, useRef, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";

type EyeMood = "blinking" | "scanning" | "static";

interface EyeMarkProps {
  size?: number;
  mood?: EyeMood;
  /** 點擊事件（給切主題用） */
  onClick?: () => void;
  /** 標題 / aria-label：當有 onClick 時使用 */
  ariaLabel?: string;
  /** 標題（提示） */
  title?: string;
  // scanning 模式：眼球跟著滑鼠移動（全螢幕範圍內）
}

// 精簡版眼睛 mascot — 給 Landing / 頁面 chrome 用
// 悲傷 mood 走 ErrorIcon（有 GSAP 流淚動畫），這個只做基本版
//
// 若提供 onClick，整個 SVG 變成 button（hover scale + cursor pointer）
// 用於 landing 右上角點擊切主題
export function EyeMark({
  size = 80,
  mood = "blinking",
  onClick,
  ariaLabel,
  title,
}: EyeMarkProps) {
  const eyeballRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (mood !== "scanning") return;
    const eyeball = eyeballRef.current;
    if (!eyeball) return;

    const handler = (e: MouseEvent) => {
      const rect = eyeball.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.min(5, Math.hypot(dx, dy) / 60);
      const ang = Math.atan2(dy, dx);
      const ox = Math.cos(ang) * dist;
      const oy = Math.sin(ang) * dist;
      eyeball.style.transform = `translate(${ox}px, ${oy}px)`;
      eyeball.style.transition = "transform 140ms ease-out";
    };

    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [mood]);

  const height = Math.round(size * (130 / 110));

  const interactive = typeof onClick === "function";
  const handleClick = (e: ReactMouseEvent<SVGSVGElement>) => {
    if (!onClick) return;
    e.stopPropagation();
    onClick();
  };
  const interactiveStyle: CSSProperties = interactive
    ? {
        cursor: "pointer",
        animation: "os-eye-scan 2.8s ease-in-out infinite",
        transition: "transform 200ms ease-out, filter 200ms ease-out",
        // Remove the default browser focus ring on click (the blue rectangle)
        outline: "none",
        WebkitTapHighlightColor: "transparent",
      }
    : { animation: "os-eye-scan 2.8s ease-in-out infinite" };

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 120 130"
      fill="none"
      style={interactiveStyle}
      onClick={interactive ? handleClick : undefined}
      onMouseEnter={interactive ? (e) => {
        (e.currentTarget as SVGSVGElement).style.transform = "scale(1.08)";
        (e.currentTarget as SVGSVGElement).style.filter = "drop-shadow(0 0 14px rgb(var(--accent-rgb) / 0.7))";
      } : undefined}
      onMouseLeave={interactive ? (e) => {
        (e.currentTarget as SVGSVGElement).style.transform = "scale(1)";
        (e.currentTarget as SVGSVGElement).style.filter = "";
      } : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
      aria-label={interactive ? (ariaLabel ?? "Switch theme") : undefined}
      aria-hidden={!interactive}
    >
      {title && <title>{title}</title>}
      {/* 外輪廓 */}
      <path
        d="M55 8 C70 4,90 18,92 40 C94 56,90 72,82 86 C78 94,76 104,78 112 C79 117,82 120,84 116 C86 112,84 106,80 102 C74 98,60 110,48 116 C38 122,24 118,18 106 C12 94,14 76,18 62 C22 48,30 18,55 8Z"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* 眼皮 — blink 動畫（透過 themes.css 的 @keyframes ob-blink） */}
      <g
        style={{
          transformOrigin: "58px 50px",
          animation: mood === "blinking" || mood === "scanning" ? "ob-blink 6s infinite" : "none",
        }}
      >
        <path
          d="M34 52 C33 44,45 36,58 36 C69 36,77 41,75 48 C73 56,61 62,49 62 C39 62,34 58,34 52Z"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* 眼球 — scanning 模式跟滑鼠 */}
        <g ref={eyeballRef}>
          <ellipse cx="56" cy="49" rx="7" ry="9" fill="var(--accent)" />
          <circle cx="55" cy="47" r="2" fill="var(--bg)" />
        </g>
      </g>
    </svg>
  );
}

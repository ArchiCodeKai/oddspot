"use client";

import { useEffect, useState } from "react";

// 6 種 mood，對應 v3 設計檔規格
//   scanning  · 眼球跟游標（landing/idle）
//   blinking  · 6s 一次眨眼（預設 chrome）
//   dizzy     · 瞳孔 figure-8 路徑（error 狀態）
//   sleepy    · 上眼皮下垂 50%（empty state）
//   shocked   · 瞳孔 1.3× 放大（discovery / 新成就）
//   glitched  · CRT scanline 掃過瞳孔（loading）
export type MascotMood =
  | "scanning"
  | "blinking"
  | "dizzy"
  | "sleepy"
  | "shocked"
  | "glitched";

interface MascotProps {
  mood?: MascotMood;
  size?: number;
  // 暈光強度（0 = 無，1 = 全力，預設依 mood 決定）
  glow?: number;
}

const SCAN_RADIUS = 4; // 瞳孔追游標時的最大偏移（px in viewBox）

export function Mascot({ mood = "blinking", size = 80, glow }: MascotProps) {
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });

  // scanning 模式才掛 mousemove listener
  useEffect(() => {
    if (mood !== "scanning") return;
    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / cx));
      const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / cy));
      setPupilOffset({ x: nx * SCAN_RADIUS, y: ny * SCAN_RADIUS });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mood]);

  const moodGlow = glow ?? (mood === "shocked" ? 0.85 : mood === "glitched" ? 0.7 : 0.55);

  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        lineHeight: 0,
        filter: `drop-shadow(0 0 ${size / 5}px rgb(var(--accent-rgb) / ${moodGlow}))`,
      }}
    >
      <style>{`
        @keyframes mc-blink { 0%,92%,100% { transform: scaleY(1); } 95% { transform: scaleY(0.05); } }
        @keyframes mc-dizzy {
          0%,100% { transform: translate(0,0); }
          25% { transform: translate(3px,-2px); }
          50% { transform: translate(0,3px); }
          75% { transform: translate(-3px,-2px); }
        }
        @keyframes mc-shocked { 0%,90%,100% { transform: scale(1); } 60% { transform: scale(1.3); } }
        @keyframes mc-glitch-sweep {
          0%   { transform: translateY(-12px); opacity: 0; }
          15%  { opacity: 0.95; }
          85%  { opacity: 0.95; }
          100% { transform: translateY(28px); opacity: 0; }
        }
        .mc-blinking .mc-eye-inner { animation: mc-blink 6s ease-in-out infinite; transform-origin: 55px 47px; }
        .mc-dizzy    .mc-pupil { animation: mc-dizzy 1.6s linear infinite; transform-origin: 55px 47px; transform-box: fill-box; }
        .mc-shocked  .mc-pupil { animation: mc-shocked 2.4s ease-in-out infinite; transform-origin: 55px 47px; transform-box: fill-box; }
        .mc-glitched .mc-scanline { animation: mc-glitch-sweep 1.4s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .mc-blinking .mc-eye-inner,
          .mc-dizzy .mc-pupil,
          .mc-shocked .mc-pupil,
          .mc-glitched .mc-scanline { animation: none; }
        }
      `}</style>

      <svg
        width={size}
        height={size * 1.1}
        viewBox="0 0 110 130"
        fill="none"
        className={`mc-${mood}`}
      >
        <defs>
          {/* sleepy 用：把上眼皮 clip 半截 */}
          <clipPath id="mc-sleepy-clip">
            <rect x="0" y="42" width="110" height="40" />
          </clipPath>
        </defs>

        {/* 外輪廓（不規則蛋形，永遠顯示） */}
        <path
          d="M55 8 C70 4,90 18,92 40 C94 56,90 72,82 86 C78 94,76 104,78 112 C79 117,82 120,84 116 C86 112,84 106,80 102 C74 98,60 110,48 116 C38 122,24 118,18 106 C12 94,14 76,18 62 C22 48,30 18,55 8Z"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* 內眼（含瞳孔），blinking 整組眨；其他 mood 維持開眼 */}
        <g className="mc-eye-inner" clipPath={mood === "sleepy" ? "url(#mc-sleepy-clip)" : undefined}>
          {/* 內眼輪廓 */}
          <path
            d="M33 50 C32 40,44 30,58 30 C69 30,78 36,76 43 C74 52,62 59,50 58 C39 58,33 56,33 50Z"
            stroke="var(--accent)"
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* 瞳孔（accent 填色，scanning 時 translate 跟游標） */}
          <path
            className="mc-pupil"
            d="M57 36 C62 36,66 40,65 45 C64 51,59 55,54 54 C49 54,47 50,48 45 C49 41,52 36,57 36Z"
            fill="var(--accent)"
            transform={
              mood === "scanning"
                ? `translate(${pupilOffset.x} ${pupilOffset.y})`
                : undefined
            }
          />
          {/* 瞳孔內亮點（背景色透出感）*/}
          <path
            d="M55 42 C58 42,60 44,59 47 C58 50,55 51,53 50 C51 49,50 47,51 45 C52 43,53 42,55 42Z"
            fill="rgb(var(--background-rgb) / 0.78)"
          />
          {/* 高光（小白點） */}
          <ellipse cx="61" cy="40" rx="1.6" ry="1.2" fill="#fff" opacity="0.82" />
        </g>

        {/* sleepy：用 bg 色蓋住上半，模擬眼皮下垂 */}
        {mood === "sleepy" && (
          <path
            d="M33 50 C32 40,44 30,58 30 C69 30,78 36,76 43 C76 47,72 49,68 50 L33 50Z"
            fill="var(--background)"
            stroke="var(--accent)"
            strokeWidth="1.4"
            strokeLinejoin="round"
            opacity="0.95"
          />
        )}

        {/* glitched：CRT 掃描線（Y 軸往下掃過內眼區域） */}
        {mood === "glitched" && (
          <line
            className="mc-scanline"
            x1="32"
            y1="42"
            x2="78"
            y2="42"
            stroke="var(--accent)"
            strokeWidth="1.2"
            strokeLinecap="square"
          />
        )}
      </svg>
    </span>
  );
}

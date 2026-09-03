"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";

// Acid stickers — 只保留「系統物件」類的貼紙：條碼、錯誤標籤、商標。
// 通用星芒、梗圖章（DEAL WITH IT）、GLOBAL NULL 線框球、INPUT:0 同心圓已移除：
// 它們不是系統裡「撿到」的東西，是為了裝飾而畫的，會把整頁拉向廉價貼圖感。
// 散落在 Landing 四周，-8° ~ +8° 旋轉，dissolve 完成後蓋章式進場。

interface StickerProps {
  style?: CSSProperties;
  className?: string;
  rotate?: number;
  delay?: number;
  // fromDir: 飛入方向
  fromDir?: "top" | "bottom" | "left" | "right";
}

// 蓋章式進場：先放大墜落 + scale overshoot + 旋轉到位
// fromDir 控制墜落方向，但位移幅度比之前小（蓋章感 = 從正上方/側邊壓下，不是飛入）
const stickerMotion = (rotate: number, delay: number, fromDir: StickerProps["fromDir"] = "top") => {
  const offsets: Record<NonNullable<StickerProps["fromDir"]>, { x: number; y: number }> = {
    top: { x: 0, y: -28 },
    bottom: { x: 0, y: 28 },
    left: { x: -28, y: 0 },
    right: { x: 28, y: 0 },
  };
  const { x, y } = offsets[fromDir];
  return {
    initial: {
      opacity: 0,
      x,
      y,
      rotate: rotate - 18,
      scale: 1.45,             // 起始放大 → 墜落到 1
    },
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      rotate,
      // overshoot scale: 大→中→微大→正常（蓋章彈跳）
      scale: [1.45, 0.9, 1.06, 1],
    },
    transition: {
      duration: 0.55,
      delay,
      times: [0, 0.55, 0.82, 1],
      ease: [0.32, 0.72, 0, 1] as const,
    },
  };
};

// S1 · Barcode with fake coordinates
export function BarcodeS({ style, className, rotate = -6, delay = 0.1 }: StickerProps) {
  return (
    <motion.div
      className={className}
      style={{ position: "absolute", color: "var(--fg)", ...style }}
      {...stickerMotion(rotate, delay, "right")}
    >
      <svg width="90" height="36" viewBox="0 0 90 36" aria-hidden="true">
        <g fill="currentColor">
          {[
            [0, 2], [4, 1], [7, 3], [12, 1], [15, 2], [19, 1], [22, 4], [28, 1],
            [31, 2], [35, 3], [40, 1], [43, 2], [47, 1], [50, 3], [55, 2], [59, 1], [62, 2], [66, 4],
          ].map(([x, w]) => <rect key={x} x={x} y="0" width={w} height="28" />)}
        </g>
        <text
          x="0" y="35"
          fontFamily="var(--font-jetbrains-mono), monospace"
          fontSize="7" fill="currentColor" letterSpacing="1"
        >
          N25°03&apos;13.2&quot;
        </text>
      </svg>
    </motion.div>
  );
}

// S3 · Error triangle + archive tag
export function ErrorTagS({ style, className, rotate = -3, delay = 0.35 }: StickerProps) {
  return (
    <motion.div
      className={className}
      style={{ position: "absolute", color: "var(--fg)", ...style }}
      {...stickerMotion(rotate, delay, "bottom")}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 2 L22 20 L2 20 Z" />
        <line x1="12" y1="9" x2="12" y2="14" />
        <circle cx="12" cy="17" r="0.8" fill="currentColor" />
      </svg>
      <div style={{ ...stickerLabelStyle, marginTop: 6 }}>ERR_NO_LEGEND / archive 1998-08-13</div>
    </motion.div>
  );
}

const stickerLabelStyle: CSSProperties = {
  fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--muted)",
  whiteSpace: "nowrap",
  marginTop: 4,
};

// S8 · Brand wordmark — OddSpot（EN H1 規格：VT323 + accent glow 35%）
export function WordmarkS({ style, className, rotate = -3, delay = 0.05 }: StickerProps) {
  return (
    <motion.div
      className={className}
      style={{ position: "absolute", ...style }}
      {...stickerMotion(rotate, delay, "left")}
    >
      <div
        style={{
          fontFamily: "var(--font-vt323), 'VT323', 'Courier New', monospace",
          fontSize: "clamp(88px, 12vw, 120px)",
          fontWeight: 400,
          letterSpacing: "0.01em",
          lineHeight: 0.95,
          color: "var(--fg)",
        }}
      >
        Odd
        <span
          style={{
            color: "var(--accent)",
            textShadow: "0 0 32px rgb(var(--accent-rgb) / 0.35)",
          }}
        >
          Spot
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
          fontSize: 8,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--muted)",
          whiteSpace: "nowrap",
          marginTop: 8,
        }}
      >
        B-Grade Spot Explorer
      </div>
    </motion.div>
  );
}

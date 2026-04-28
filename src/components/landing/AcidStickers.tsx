"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";

// 7 個 acid stickers — 散落在 Landing 四周，-8° ~ +8° 旋轉
// dissolve 完成後從不同角度 fly-in（各自的 delay 不同）

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
export function BarcodeS({ style, rotate = -6, delay = 0.1 }: StickerProps) {
  return (
    <motion.div
      style={{ position: "absolute", color: "var(--fg)", ...style }}
      {...stickerMotion(rotate, delay, "left")}
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

// S2 · Checkerboard wave with HARD FORM label
export function CheckboardWaveS({ style, rotate = 4, delay = 0.2 }: StickerProps) {
  return (
    <motion.div
      style={{ position: "absolute", color: "var(--accent)", ...style }}
      {...stickerMotion(rotate, delay, "top")}
    >
      <svg width="140" height="60" viewBox="0 0 140 60" aria-hidden="true">
        <defs>
          <pattern id="acid-ck" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="5" height="5" fill="currentColor" />
            <rect x="5" y="5" width="5" height="5" fill="currentColor" />
          </pattern>
        </defs>
        <path d="M0 50 Q35 10 70 30 T140 20 V60 H0 Z" fill="url(#acid-ck)" opacity="0.85" />
      </svg>
      <div style={stickerLabelStyle}>HARD FORM / 001</div>
    </motion.div>
  );
}

// S3 · Error triangle + archive tag
export function ErrorTagS({ style, rotate = -3, delay = 0.35 }: StickerProps) {
  return (
    <motion.div
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

// S4 · 4-point star burst
export function StarBurstS({ style, rotate = 2, delay = 0.45 }: StickerProps) {
  return (
    <motion.div
      style={{ position: "absolute", color: "var(--accent)", ...style }}
      {...stickerMotion(rotate, delay, "bottom")}
    >
      <svg width="44" height="44" viewBox="0 0 44 44" fill="currentColor" aria-hidden="true">
        <path d="M22 0 L25 18 L44 22 L25 26 L22 44 L19 26 L0 22 L19 18 Z" />
      </svg>
    </motion.div>
  );
}

// S5 · Wireframe sphere with GLOBAL NULL
export function SphereS({ style, rotate = -8, delay = 0.3 }: StickerProps) {
  return (
    <motion.div
      style={{ position: "absolute", color: "var(--fg)", ...style }}
      {...stickerMotion(rotate, delay, "top")}
    >
      <svg width="70" height="70" viewBox="0 0 70 70" fill="none" stroke="currentColor" strokeWidth="0.8" aria-hidden="true">
        <circle cx="35" cy="35" r="32" />
        <ellipse cx="35" cy="35" rx="32" ry="10" />
        <ellipse cx="35" cy="35" rx="32" ry="20" />
        <ellipse cx="35" cy="35" rx="10" ry="32" />
        <ellipse cx="35" cy="35" rx="20" ry="32" />
      </svg>
      <div style={{ ...stickerLabelStyle, marginTop: 6 }}>GLOBAL NULL</div>
    </motion.div>
  );
}

// S6 · DEAL WITH IT stamp
export function DealWithItS({ style, rotate = 5, delay = 0.55 }: StickerProps) {
  return (
    <motion.div
      style={{ position: "absolute", color: "var(--fg)", ...style }}
      {...stickerMotion(rotate, delay, "right")}
    >
      <div style={{ border: "2px solid currentColor", padding: "8px 14px" }}>
        <div
          style={{
            fontSize: 20,
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          DEAL WITH IT
        </div>
        <div style={{ ...stickerLabelStyle, marginTop: 4 }}>It works. Make it raw.</div>
      </div>
    </motion.div>
  );
}

// S7 · Concentric circles + INPUT:0
export function SwirlS({ style, rotate = 8, delay = 0.25 }: StickerProps) {
  return (
    <motion.div
      style={{ position: "absolute", color: "var(--accent)", ...style }}
      {...stickerMotion(rotate, delay, "top")}
    >
      <svg width="46" height="46" viewBox="0 0 46 46" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
        <circle cx="23" cy="23" r="3" />
        <circle cx="23" cy="23" r="8" />
        <circle cx="23" cy="23" r="14" />
        <circle cx="23" cy="23" r="20" />
      </svg>
      <div style={stickerLabelStyle}>INPUT:0</div>
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

import type { CSSProperties, ReactNode } from "react";

interface BrandTagProps {
  children: ReactNode;
  // glow: 亮起來（active 狀態），否則走 muted 色
  glow?: boolean;
  // 前綴小圓點（像 system status indicator）
  dot?: boolean;
  className?: string;
  style?: CSSProperties;
}

// 品牌系統標籤 — "sys://oddspot"、"phase:0 / init" 這類 meta 文字
// 走 JetBrains Mono + uppercase + tracking 0.22em
export function BrandTag({ children, glow, dot, className, style }: BrandTagProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: dot ? 10 : 0,
        fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: glow ? "var(--accent)" : "var(--muted)",
        textShadow: glow ? "0 0 10px rgb(var(--accent-rgb) / 0.5)" : "none",
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: 8,
            height: 8,
            background: "var(--accent)",
            boxShadow: "0 0 10px var(--accent)",
            animation: "os-pulse 2s infinite",
            borderRadius: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}

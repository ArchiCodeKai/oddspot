import type { CSSProperties } from "react";

interface MarqueeProps {
  items: string[];
  // 捲動速度（秒）
  duration?: number;
  style?: CSSProperties;
}

// 頁腳跑馬燈 — 系統碎語混詩意片段
// 用 translateX(-50%) + duplicate content 做無縫循環
export function Marquee({ items, duration = 30, style }: MarqueeProps) {
  const doubled = [...items, ...items];

  return (
    <div
      style={{
        overflow: "hidden",
        padding: "8px 0",
        borderTop: "1px solid var(--line)",
        borderBottom: "1px solid var(--line)",
        background: "rgb(0 0 0 / 0.3)",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 40,
          whiteSpace: "nowrap",
          animation: `os-marquee ${duration}s linear infinite`,
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: "var(--fg)",
        }}
      >
        {doubled.map((item, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 40 }}>
            <span>{item}</span>
            <span style={{ color: "var(--accent)" }}>●</span>
          </span>
        ))}
      </div>
    </div>
  );
}

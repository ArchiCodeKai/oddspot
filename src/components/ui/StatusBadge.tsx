import { STATUS_DOT, STATUS_LABELS, type SpotStatus } from "@/lib/constants/status";

interface StatusBadgeProps {
  status: SpotStatus;
  size?: "sm" | "md";
}

// v3 monochrome status：全用 accent 色，dot 形態區分
// active=實心發光 · uncertain=空心環 · disappeared=淡色 · pending=脈動
export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const cfg = STATUS_DOT[status] ?? STATUS_DOT.active;

  const sizes = {
    sm: { fontSize: 10, padding: "3px 8px", dot: 6 },
    md: { fontSize: 12, padding: "5px 10px", dot: 8 },
  }[size];

  return (
    <span
      style={{
        fontFamily: "var(--font-noto-sans-tc), 'Noto Sans TC', sans-serif",
        fontSize: sizes.fontSize,
        padding: sizes.padding,
        borderRadius: 2,
        color: "var(--accent)",
        opacity: cfg.dim,
        background: "rgb(var(--accent-rgb) / 0.06)",
        border: "1px solid rgb(var(--accent-rgb) / 0.12)",
        letterSpacing: "0.08em",
        display: "inline-flex",
        alignItems: "center",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: sizes.dot,
          height: sizes.dot,
          borderRadius: "50%",
          background: cfg.fill ? "var(--accent)" : "transparent",
          border: cfg.fill ? "none" : "1.5px solid var(--accent)",
          marginRight: 6,
          verticalAlign: "middle",
          boxShadow: cfg.fill ? "0 0 6px var(--accent)" : "none",
          animation: cfg.animate === "pulse" ? "os-pulse 1.6s ease-in-out infinite" : "none",
          flexShrink: 0,
        }}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

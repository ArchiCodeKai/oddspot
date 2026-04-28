import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type Variant = "primary" | "accent" | "ghost";
type Size = "sm" | "md" | "lg";

interface AcidButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  // iconPosition 預設在右（CTA 箭頭慣用右）
  iconPosition?: "left" | "right";
  style?: CSSProperties;
}

// OddSpot v2 通用按鈕 — 方角 2px、JetBrains Mono、uppercase、accent 發光
// primary: 填 foreground 色（醒目 CTA）
// accent:  框線 accent 色 + glow（次要 CTA / hero CTA）
// ghost:   panel 底色（淡按鈕）
export function AcidButton({
  variant = "accent",
  size = "md",
  icon,
  iconPosition = "right",
  children,
  style,
  ...rest
}: AcidButtonProps) {
  const sizes = {
    sm: { minHeight: 36, padding: "0 14px", fontSize: 11 },
    md: { minHeight: 44, padding: "0 20px", fontSize: 12 },
    lg: { minHeight: 52, padding: "0 28px", fontSize: 13 },
  }[size];

  const variantStyles: Record<Variant, CSSProperties> = {
    primary: {
      background: "var(--fg)",
      color: "var(--bg)",
      border: "1px solid transparent",
    },
    accent: {
      background: "transparent",
      color: "var(--accent)",
      border: "1px solid var(--accent)",
      boxShadow: "var(--glow)",
    },
    ghost: {
      background: "var(--panel-2)",
      color: "var(--muted)",
      border: "1px solid var(--line)",
    },
  };

  return (
    <button
      {...rest}
      style={{
        ...sizes,
        fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        borderRadius: 2,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        transition: "all 180ms cubic-bezier(0.4,0,0.2,1)",
        ...variantStyles[variant],
        ...style,
      }}
    >
      {icon && iconPosition === "left" && icon}
      {children}
      {icon && iconPosition === "right" && icon}
    </button>
  );
}

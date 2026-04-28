import type { CSSProperties } from "react";

export type SceneVariant = "onboarding" | "map" | "swipe" | "detail" | "submit";

interface SceneBgProps {
  variant: SceneVariant;
}

// 每個頁面一套專屬大氣層：噪點 / 掃描線 / 暈影 / 點陣 / 角落螢光
// 切 tab 時背景自然換頻道，但都在 monochrome accent 色系裡
// 用 position:absolute 貼滿 parent，parent 必須 position:relative
export function SceneBg({ variant }: SceneBgProps) {
  const shared: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  };

  const scanHoriz: CSSProperties = {
    ...shared,
    background:
      "repeating-linear-gradient(0deg, transparent 0, transparent 3px, rgb(var(--accent-rgb) / 0.025) 3px, rgb(var(--accent-rgb) / 0.025) 4px)",
  };

  const scanVert: CSSProperties = {
    ...shared,
    background:
      "repeating-linear-gradient(90deg, transparent 0, transparent 2px, rgb(var(--accent-rgb) / 0.02) 2px, rgb(var(--accent-rgb) / 0.02) 3px)",
  };

  const noise: CSSProperties = {
    ...shared,
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>")`,
    opacity: 0.12,
    mixBlendMode: "overlay",
  };

  const vignette: CSSProperties = {
    ...shared,
    background:
      "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
  };

  const cornerGlowTR: CSSProperties = {
    ...shared,
    background:
      "radial-gradient(circle at 85% 10%, rgb(var(--accent-rgb) / 0.16), transparent 40%), radial-gradient(circle at 15% 90%, rgb(var(--accent-rgb) / 0.08), transparent 40%)",
  };

  const cornerGlowCenter: CSSProperties = {
    ...shared,
    background:
      "radial-gradient(circle at 50% 30%, rgb(var(--accent-rgb) / 0.10), transparent 55%)",
  };

  const dottedGrid: CSSProperties = {
    ...shared,
    backgroundImage: "radial-gradient(rgb(var(--accent-rgb) / 0.14) 1px, transparent 1.2px)",
    backgroundSize: "18px 18px",
    opacity: 0.55,
  };

  const swipeTopHalo: CSSProperties = {
    ...shared,
    background:
      "radial-gradient(ellipse 80% 40% at 50% 0%, rgb(var(--accent-rgb) / 0.08), transparent 60%)",
  };

  if (variant === "onboarding") {
    return (
      <>
        <div style={cornerGlowTR} />
        <div style={scanVert} />
        <div style={noise} />
      </>
    );
  }

  if (variant === "map") {
    return (
      <>
        <div style={noise} />
        <div style={vignette} />
      </>
    );
  }

  if (variant === "swipe") {
    return (
      <>
        <div style={swipeTopHalo} />
        <div style={scanHoriz} />
        <div style={noise} />
      </>
    );
  }

  if (variant === "detail") {
    return (
      <>
        <div style={scanHoriz} />
        <div style={vignette} />
      </>
    );
  }

  if (variant === "submit") {
    return (
      <>
        <div style={dottedGrid} />
        <div style={cornerGlowCenter} />
        <div style={noise} />
      </>
    );
  }

  return null;
}

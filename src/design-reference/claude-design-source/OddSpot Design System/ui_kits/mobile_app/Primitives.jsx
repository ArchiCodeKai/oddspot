/* Shared UI primitives */

/* TOKENS now read from CSS vars so theme switching (data-theme="...") updates everything live. */
const TOKENS = {
  bg: "var(--bg)",
  fg: "var(--fg)",
  accent: "var(--accent)",
  accentRgb: "var(--accent-rgb)",
  muted: "var(--muted)",
  panel: "var(--panel)",
  panelLight: "var(--panel-2)",
  line: "var(--line)",
  lineStrong: "var(--line-strong)",
  panelGlass: "rgb(0 0 0 / 0.55)",
};

/* ------------------------------------------------------------------
   CATEGORY SYSTEM — v2 (monochrome + glyph-based recognition)
   No per-category colors. Identity comes from:
     · 2-letter mono code  (TM / AB / GO …)
     · Unique line-icon glyph
     · Chinese label
   Every category renders in --accent; differentiation is by SHAPE not COLOR.
------------------------------------------------------------------ */
const CATEGORY_CODES = {
  "weird-temple": "TM",
  "abandoned": "AB",
  "giant-object": "GO",
  "kitsch": "KT",
  "marginal-architecture": "MA",
  "urban-legend": "UL",
  "absurd-landscape": "AL",
  "odd-shopfront": "OS",
};

const CATEGORY_LABELS = {
  "weird-temple": "詭異廟宇",
  "abandoned": "廢棄場所",
  "giant-object": "巨型物體",
  "kitsch": "俗豔裝置",
  "marginal-architecture": "邊緣建築",
  "urban-legend": "都市傳說",
  "absurd-landscape": "荒謬景觀",
  "odd-shopfront": "奇異店面",
};

/* Unique line-icon glyphs, all render in currentColor (accent).
   Intentionally crude / low-res feel, 2px stroke, 20px viewbox. */
const CATEGORY_GLYPHS = {
  "weird-temple": (p) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square">
      <path d="M3 8 L10 3 L17 8" /><path d="M5 8 V17 H15 V8" /><path d="M9 17 V12 H11 V17" /><path d="M2 8 H18" />
    </svg>
  ),
  "abandoned": (p) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square">
      <path d="M3 17 V6 L7 3 V17 M7 8 L13 3 V17 M13 6 L17 8 V17" /><path d="M2 17 H18" />
    </svg>
  ),
  "giant-object": (p) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square">
      <path d="M10 2 L14 17 H6 Z" /><path d="M7 13 H13" /><path d="M8 9 H12" />
    </svg>
  ),
  "kitsch": (p) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square">
      <path d="M10 16 L4 10 C2 7,6 3,10 7 C14 3,18 7,16 10 Z" /><path d="M10 7 V13" />
    </svg>
  ),
  "marginal-architecture": (p) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square">
      <rect x="3" y="4" width="5" height="13" /><rect x="10" y="7" width="7" height="10" /><path d="M5 7 H6 M5 10 H6 M5 13 H6 M12 10 H15 M12 13 H15" />
    </svg>
  ),
  "urban-legend": (p) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square">
      <path d="M4 15 C4 7,7 3,10 3 C13 3,16 7,16 15 L14 14 L12 16 L10 14 L8 16 L6 14 Z" /><circle cx="8" cy="9" r="0.8" fill="currentColor" /><circle cx="12" cy="9" r="0.8" fill="currentColor" />
    </svg>
  ),
  "absurd-landscape": (p) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square">
      <path d="M2 15 L7 8 L10 12 L14 6 L18 15 Z" /><circle cx="15" cy="5" r="1.4" />
    </svg>
  ),
  "odd-shopfront": (p) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square">
      <path d="M3 7 L5 4 H15 L17 7" /><rect x="3" y="7" width="14" height="10" /><path d="M8 17 V12 H12 V17" />
    </svg>
  ),
};

/* ------------------------------------------------------------------
   STATUS — also monochrome. Differentiation via dot shape/animation.
------------------------------------------------------------------ */
const STATUS_LABELS = {
  active: "可探索",
  uncertain: "狀況不明",
  disappeared: "已消失",
  pending: "審核中",
};

/* active=solid glow, uncertain=hollow, disappeared=dashed/dim, pending=pulse */
const STATUS_DOT = {
  active:       { fill: true,  dim: 1.0, ring: false, animate: null },
  uncertain:    { fill: false, dim: 0.7, ring: true,  animate: null },
  disappeared:  { fill: false, dim: 0.35, ring: false, animate: null },
  pending:      { fill: true,  dim: 0.9, ring: false, animate: "pulse" },
};

const DIFFICULTY_LABELS = { easy: "輕鬆", medium: "中等", hard: "困難" };

function BrandTag({ children, glow }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-brand, 'JetBrains Mono', monospace)",
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: glow ? TOKENS.accent : TOKENS.muted,
        textShadow: glow ? `0 0 12px rgb(${TOKENS.accentRgb} / 0.6)` : "none",
      }}
    >
      {children}
    </span>
  );
}

function Button({ variant = "primary", children, onClick, icon, style }) {
  const variants = {
    primary: { background: TOKENS.fg, color: TOKENS.bg, border: "1px solid transparent" },
    accent: {
      background: "transparent", color: TOKENS.accent,
      border: `1px solid ${TOKENS.accent}`,
      boxShadow: `0 0 24px rgb(${TOKENS.accentRgb} / 0.15)`,
    },
    ghost: { background: TOKENS.panelLight, color: TOKENS.muted, border: `1px solid ${TOKENS.line}` },
  };
  return (
    <button
      onClick={onClick}
      style={{
        minHeight: 44,
        padding: "0 20px",
        fontFamily: "var(--font-brand, 'JetBrains Mono', monospace)",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        borderRadius: 2,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transition: "all 180ms cubic-bezier(0.4,0,0.2,1)",
        ...variants[variant],
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

/* Category badge — now monochrome, glyph + code + label */
function CategoryBadge({ category, compact = false }) {
  const Glyph = CATEGORY_GLYPHS[category];
  const code = CATEGORY_CODES[category];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: "var(--font-content, 'Noto Sans TC', sans-serif)",
      fontSize: 10,
      padding: "3px 7px 3px 6px",
      borderRadius: 2,
      background: `rgb(${TOKENS.accentRgb} / 0.08)`,
      color: TOKENS.accent,
      border: `1px solid rgb(${TOKENS.accentRgb} / 0.3)`,
      letterSpacing: "0.06em",
      fontWeight: 500,
      lineHeight: 1,
    }}>
      {Glyph && <Glyph size={10} />}
      <span style={{ fontFamily: "var(--font-brand, 'JetBrains Mono', monospace)", fontSize: 9, opacity: 0.85, letterSpacing: "0.08em" }}>{code}</span>
      {!compact && <span>{CATEGORY_LABELS[category]}</span>}
    </span>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_DOT[status] || STATUS_DOT.active;
  const dotSize = 6;
  return (
    <span style={{
      fontFamily: "var(--font-content, 'Noto Sans TC', sans-serif)",
      fontSize: 10,
      padding: "3px 8px",
      borderRadius: 2,
      color: TOKENS.accent,
      opacity: cfg.dim,
      background: "rgb(0 229 204 / 0.06)",
      border: `1px solid ${TOKENS.line}`,
      letterSpacing: "0.08em",
      display: "inline-flex", alignItems: "center",
    }}>
      <span style={{
        display: "inline-block", width: dotSize, height: dotSize, borderRadius: "50%",
        background: cfg.fill ? TOKENS.accent : "transparent",
        border: cfg.fill ? "none" : `1.5px solid ${TOKENS.accent}`,
        marginRight: 6, verticalAlign: "middle",
        boxShadow: cfg.fill ? `0 0 6px ${TOKENS.accent}` : "none",
        animation: cfg.animate === "pulse" ? "os-pulse 1.6s ease-in-out infinite" : "none",
      }} />
      {STATUS_LABELS[status]}
    </span>
  );
}

/* Inline SVG icon family, 1.8px stroke */
const Icon = {
  Map: (p) => <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21"/><line x1="8" y1="3" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="21"/></svg>,
  Swipe: (p) => <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="4" width="14" height="16" rx="2"/><line x1="5" y1="16" x2="19" y2="16"/></svg>,
  Plus: (p) => <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Close: (p) => <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Heart: (p) => <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill={p.filled?"currentColor":"none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.5 12 21 12 21z"/></svg>,
  Filter: (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>,
  ChevR: (p) => <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  ArrowR: (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Back: (p) => <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  External: (p) => <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 10L21 3"/><polyline points="15 3 21 3 21 9"/><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/></svg>,
};

function EyeMark({ size = 80, blinking = true }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 120 130" fill="none" style={{ filter: `drop-shadow(0 0 24px rgb(${TOKENS.accentRgb} / 0.4))` }}>
      <g>
        <path d="M55 8 C70 4,90 18,92 40 C94 56,90 72,82 86 C78 94,76 104,78 112 C79 117,82 120,84 116 C86 112,84 106,80 102 C74 98,60 110,48 116 C38 122,24 118,18 106 C12 94,14 76,18 62 C22 48,30 18,55 8Z" stroke={TOKENS.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <g style={{ transformOrigin: "58px 50px", animation: blinking ? "ob-blink 6s infinite" : "none" }}>
          <path d="M34 52 C33 44,45 36,58 36 C69 36,77 41,75 48 C73 56,61 62,49 62 C39 62,34 58,34 52Z" stroke={TOKENS.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M56 38 C62 38,66 42,65 47 C64 53,59 57,53 56 C48 56,46 52,47 47 C48 42,51 38,56 38Z" fill={TOKENS.accent} />
          <circle cx="55" cy="47" r="2" fill={TOKENS.bg} />
        </g>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------
   SceneBg — per-screen atmosphere layer.
   Each screen type gets its own signature bg treatment so the
   visual shifts subtly between tabs — but all within the same
   monochrome palette (bg, panel tints, accent at low alpha).

   variants:
     onboarding · CRT vertical scanlines + corner glow
     map        · faint hex/grid etched + vignette
     swipe      · soft noise + top halo
     detail     · horizontal scan + heavy vignette
     submit     · dotted grid + center halo
------------------------------------------------------------------ */
function SceneBg({ variant = "map" }) {
  const shared = { position: "absolute", inset: 0, pointerEvents: "none" };
  const scanHoriz = {
    ...shared,
    background: "repeating-linear-gradient(0deg, transparent 0, transparent 3px, rgba(0,229,204,0.025) 3px, rgba(0,229,204,0.025) 4px)",
  };
  const scanVert = {
    ...shared,
    background: "repeating-linear-gradient(90deg, transparent 0, transparent 2px, rgba(0,229,204,0.02) 2px, rgba(0,229,204,0.02) 3px)",
  };
  const noise = {
    ...shared,
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0.9 0 0 0 0 0.8 0 0 0 0.35 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
    opacity: 0.12,
    mixBlendMode: "screen",
  };
  const vignette = {
    ...shared,
    background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
  };
  const cornerGlow = (pos) => ({
    ...shared,
    background: pos === "tr"
      ? "radial-gradient(circle at 85% 10%, rgba(0,229,204,0.16), transparent 40%), radial-gradient(circle at 15% 90%, rgba(0,229,204,0.08), transparent 40%)"
      : "radial-gradient(circle at 50% 30%, rgba(0,229,204,0.10), transparent 55%)",
  });
  const dottedGrid = {
    ...shared,
    backgroundImage: "radial-gradient(rgba(0,229,204,0.14) 1px, transparent 1.2px)",
    backgroundSize: "18px 18px",
    opacity: 0.55,
  };

  if (variant === "onboarding") {
    return (<>
      <div style={cornerGlow("tr")} />
      <div style={scanVert} />
      <div style={noise} />
    </>);
  }
  if (variant === "map") {
    return (<>
      <div style={noise} />
      <div style={vignette} />
    </>);
  }
  if (variant === "swipe") {
    return (<>
      <div style={{ ...shared, background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(0,229,204,0.08), transparent 60%)" }} />
      <div style={scanHoriz} />
      <div style={noise} />
    </>);
  }
  if (variant === "detail") {
    return (<>
      <div style={scanHoriz} />
      <div style={vignette} />
    </>);
  }
  if (variant === "submit") {
    return (<>
      <div style={dottedGrid} />
      <div style={cornerGlow("center")} />
      <div style={noise} />
    </>);
  }
  return null;
}

Object.assign(window, {
  TOKENS,
  CATEGORY_CODES, CATEGORY_LABELS, CATEGORY_GLYPHS,
  STATUS_LABELS, STATUS_DOT,
  DIFFICULTY_LABELS,
  BrandTag, Button, CategoryBadge, StatusBadge,
  Icon, EyeMark, SceneBg,
});

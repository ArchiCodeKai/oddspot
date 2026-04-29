"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useLocaleStore } from "@/store/useLocaleStore";
import { nextLocale, type Locale } from "@/lib/i18n";

// 牙齒/下顎 R3F — 禁止 SSR
const TeethJawR3F = dynamic(
  () => import("./TeethJawR3F").then((m) => m.TeethJawR3F),
  { ssr: false },
);

// ─────────────────────────────────────────────────────
// 字符池
// ─────────────────────────────────────────────────────
const CHAR_POOLS: Record<Locale, string[]> = {
  "zh-TW": [
    "ㄅ", "ㄆ", "ㄇ", "ㄈ", "ㄉ", "ㄊ", "ㄋ", "ㄌ",
    "ㄍ", "ㄎ", "ㄏ", "ㄐ", "ㄑ", "ㄒ", "ㄓ", "ㄔ",
    "ㄕ", "ㄖ", "ㄗ", "ㄘ", "ㄙ", "ㄚ", "ㄛ", "ㄜ",
    "ㄝ", "ㄞ", "ㄟ", "ㄠ", "ㄡ", "ㄢ", "ㄣ", "ㄤ",
    "ㄥ", "ㄦ", "ㄧ", "ㄨ", "ㄩ",
  ],
  en: [
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
    "K", "L", "M", "N", "O", "P", "R", "S", "T",
    "/", "\\", "|", ">", "<", "_", "~", "*", "+", "=",
    "0", "1", "2", "3", "7", "8",
  ],
  ja: [
    "あ", "い", "う", "え", "お", "か", "き", "く", "け", "こ",
    "さ", "し", "す", "せ", "そ", "た", "ち", "つ", "て", "と",
    "な", "に", "ぬ", "ね", "の", "は", "ひ", "ふ", "へ", "ほ",
    "ま", "み", "む", "め", "も", "や", "ゆ", "よ",
    "ら", "り", "る", "れ", "ろ", "わ", "を", "ん",
    "ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ",
    "サ", "シ", "ス", "セ", "ソ", "タ", "チ", "ナ", "ニ",
    "月", "山", "川", "海", "空", "風", "火", "水", "木", "森",
    "光", "影", "夜", "星", "神", "鬼", "夢", "花",
    "(◕‿◕)", "(˘ω˘)", "(>_<)", "(·ω·)",
  ],
};

const FONT_BY_LOCALE: Record<Locale, string> = {
  "zh-TW": "var(--font-noto-sans-tc), 'Noto Sans TC', sans-serif",
  en: "var(--font-vt323), 'VT323', 'Courier New', monospace",
  ja: "'DotGothic16', var(--font-dot-gothic), monospace",
};

const LOCALE_NAMES: Record<Locale, string> = {
  "zh-TW": "中文",
  en: "English",
  ja: "日本語",
};

const LOCALE_CODES: Record<Locale, string> = {
  "zh-TW": "TW",
  en: "EN",
  ja: "JP",
};

function sampleChars(locale: Locale, n: number): string[] {
  const pool = CHAR_POOLS[locale];
  const pick: string[] = [];
  let multiUsed = 0;
  let safety = 0;
  while (pick.length < n && safety < 200) {
    safety += 1;
    const c = pool[Math.floor(Math.random() * pool.length)];
    const isMulti = c.length > 1;
    if (isMulti && multiUsed >= 1) continue;
    if (isMulti) multiUsed += 1;
    pick.push(c);
  }
  return pick;
}

// ─────────────────────────────────────────────────────
// 煙霧字符流 — 從嘴巴湧出，炊煙裊裊往上漂散
// ─────────────────────────────────────────────────────
interface SmokeTrailProps {
  chars: string[];
  font: string;
  active: boolean;
  version: number;
}

function SmokeTrail({ chars, font, active, version }: SmokeTrailProps) {
  const n = chars.length;
  const duration = active ? 3.0 : 5.5;

  return (
    <div
      style={{
        // Perspective + preserve-3d give the chars real Z depth so they can
        // start from a vanishing point deep inside the mouth (large -Z) and
        // grow toward the lips (peak scale at ~22% timeline), then drift up
        // and converge into a single vertical column before fading.
        // perspectiveOrigin set to roughly where the model's mouth shows on
        // screen after the canvas wrapper's bottom-right shift.
        position: "absolute",
        inset: 0,
        overflow: "visible",
        pointerEvents: "none",
        perspective: "550px",
        perspectiveOrigin: "70% 80%",
        transformStyle: "preserve-3d",
      }}
    >
      {chars.map((c, i) => {
        const isMulti = c.length > 1;
        const delay = -(i / n) * duration;
        // Deterministic pseudo-random per-char branch parameters. Using
        // index-based seeding keeps SSR stable (no hydration mismatch) and
        // gives every char its own unique fan-out path that still converges
        // back into a single column above the mouth.
        const angle  = (i * 1.97 + 0.7) % (Math.PI * 2);
        const radius = 14 + (i % 4) * 7;             // 14–35px branch reach
        const branchX  = Math.cos(angle) * radius;
        const branchY  = -8 - Math.abs(Math.sin(angle)) * 14; // always upward
        const branchRot = ((i * 13) % 30) - 15;       // -15° .. +15°
        const driftX = ((i * 7) % 11) - 5;            // small drift in column
        return (
          <span
            key={`${version}-${i}-${c}`}
            style={{
              // Anchor at the model's visible mouth position after canvas
              // wrapper offset (top:-25%, left:-25%, 200% size) — the mouth
              // sits at roughly 70% / 80% of the LangPortal click area.
              position: "absolute",
              left: "70%",
              top:  "80%",
              fontFamily: font,
              fontSize: isMulti ? 9 : 13,
              fontWeight: 500,
              color: "var(--accent)",
              textShadow: active
                ? "0 0 10px rgb(var(--accent-rgb) / 1.0), 0 0 22px rgb(var(--accent-rgb) / 0.55)"
                : "0 0 6px rgb(var(--accent-rgb) / 0.8)",
              whiteSpace: "nowrap",
              lineHeight: 1,
              pointerEvents: "none",
              transition: "text-shadow 300ms",
              transformStyle: "preserve-3d",
              willChange: "transform, opacity",
              animationName: "wisp-curl",
              animationDuration: `${duration}s`,
              animationTimingFunction: "cubic-bezier(0.30, 0, 0.55, 1)",
              animationDelay: `${delay}s`,
              animationIterationCount: "infinite",
              animationFillMode: "both",
              // Per-char CSS vars consumed by the keyframe to vary the path
              ["--bx"  as string]: `${branchX}px`,
              ["--by"  as string]: `${branchY}px`,
              ["--br"  as string]: `${branchRot}deg`,
              ["--dx"  as string]: `${driftX}px`,
            }}
          >
            {c}
          </span>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// 主元件
// ─────────────────────────────────────────────────────
export function LangPortalToggle({ size = 128 }: { size?: number }) {
  const { locale, setLocale } = useLocaleStore();
  const [hover,  setHover]  = useState(false);
  const [focus,  setFocus]  = useState(false);
  const [charLocale, setCharLocale] = useState<Locale>(locale);
  const [ringVersion, setRingVersion] = useState(0);
  const [chars, setChars] = useState<string[]>([]);

  const [charVisible,     setCharVisible]     = useState(true);
  const [glitching,       setGlitching]       = useState(false);
  // Beam visual is currently disabled (jaw-only feedback). State + token are
  // still threaded through TeethJawR3F so we can re-enable later by calling
  // _setBeamTrigger((n) => n + 1) inside handleClick.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [beamTrigger,     _setBeamTrigger]    = useState(0);
  const [clickJawTrigger, setClickJawTrigger] = useState(0); // fires jaw snap-open

  const active = hover || focus;

  useEffect(() => {
    setChars(sampleChars(charLocale, 20));
    setRingVersion((v) => v + 1);
  }, [charLocale]);

  useEffect(() => {
    setCharLocale(locale);
  }, [locale]);

  const handleClick = () => {
    if (glitching) return;
    // New click sequence — jaw-driven, no beam:
    //   t=0       · jaw snaps wide open, chars retract into mouth, slight glitch
    //   t=120ms   · jaw fully open
    //   t=800ms   · text/locale switches (mid-hold, mouth is wide open)
    //   t=1640ms  · jaw begins easing closed
    //   t=2000ms  · jaw fully back to rest, chars re-emerge
    setCharVisible(false);
    setGlitching(true);
    setClickJawTrigger((n) => n + 1);
    // Beam is intentionally NOT fired any more — kept the trigger for now in
    // case we want to bring it back, but no setBeamTrigger call here.
    setTimeout(() => {
      const next = nextLocale(locale);
      setLocale(next);
    }, 800);
    setTimeout(() => {
      setGlitching(false);
      setCharVisible(true);
    }, 2000);
  };

  return (
    // Outer wrapper — plain div, no transform-style/filter/perspective.
    // The WebGL canvas lives here and renders without obstruction.
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        animation: glitching ? "lang-glitch 2s linear both" : "none",
      }}
    >
      {/* 3D 上下顎牙齒 — hovered (mouse only) drives CSS drop-shadow silhouette glow;
          active (hover || focus) drives bite speed; beamTrigger fires light beam on click */}
      <TeethJawR3F
        active={active}
        hovered={hover}
        beamTrigger={beamTrigger}
        clickJawTrigger={clickJawTrigger}
      />

      {/* Interactive overlay button */}
      <button
        type="button"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onClick={handleClick}
        aria-label={`Switch language — current: ${LOCALE_NAMES[locale]}`}
        style={{
          position: "absolute",
          inset: 0,
          padding: 0,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          outline: "none",
          borderRadius: "50%",
          zIndex: 2,
          overflow: "visible",
        }}
      >
        {/* 煙霧流 — click 時縮進嘴，切換後從嘴吐出 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "visible",
            pointerEvents: "none",
            transform: charVisible ? "scale(1)" : "scale(0.08)",
            transition: charVisible
              ? "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)"
              : "transform 180ms ease-in",
          }}
        >
          <SmokeTrail
            chars={chars}
            font={FONT_BY_LOCALE[charLocale]}
            active={active}
            version={ringVersion}
          />
        </div>

        {/* Label */}
        <span
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: 6,
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 9,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: active ? "var(--accent)" : "var(--muted)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            transition: "color 250ms",
            textShadow: active ? "0 0 8px rgb(var(--accent-rgb) / 0.5)" : "none",
          }}
        >
          LANG:{LOCALE_CODES[locale]}
        </span>
      </button>

      <style>{`
        /*
         * wisp-curl — cigarette-smoke effect with per-char branching paths.
         *
         *   Phase 1 (0 – 22%)  VANISHING POINT → MOUTH OPENING
         *     Char starts deep inside the mouth at translateZ -70px (small).
         *     Pure perspective scaling: grows from 0.10 to ~1.0 as Z
         *     approaches the mouth lips (~+5px). Reaches MAX size at the
         *     opening — this is the "smoke is just leaving the lips" beat.
         *
         *   Phase 2 (22 – 45%)  BRANCH OUT
         *     Char fans outward in its own random direction (var(--bx),
         *     var(--by)) — every char takes a different path so the trail
         *     becomes a SPRAY, not a single curve.
         *
         *   Phase 3 (45 – 72%)  CONVERGE BACK INTO COLUMN
         *     Branch offset eases back to a small per-char drift (var(--dx))
         *     while Y keeps climbing — random fan tightens into a vertical
         *     column above the mouth.
         *
         *   Phase 4 (72 – 100%) RECEDE + FADE
         *     Column drifts further up, scale shrinks (smoke dissipates),
         *     opacity fades to 0. Z goes negative again so the trail tip
         *     visually pulls back into atmosphere.
         */
        @keyframes wisp-curl {
          0%   { transform: translate(-50%, -50%) translate3d(0px, 6px, -70px) scale(0.10) rotate(0deg);
                 opacity: 0; }
          8%   { transform: translate(-50%, -50%) translate3d(0px, 2px, -42px) scale(0.30);
                 opacity: 0.55; }
          15%  { transform: translate(-50%, -50%) translate3d(0px, -2px, -18px) scale(0.62);
                 opacity: 0.85; }
          22%  { /* AT THE MOUTH OPENING — peak size */
                 transform: translate(-50%, -50%) translate3d(0px, -6px, 6px) scale(1.0) rotate(var(--br, 0deg));
                 opacity: 1.0; }
          35%  { /* BRANCH OUT (random direction per char) */
                 transform: translate(-50%, -50%) translate3d(var(--bx, 0px), var(--by, -16px), 4px) scale(0.96) rotate(var(--br, 0deg));
                 opacity: 0.95; }
          55%  { /* DRIFTING UP, branch starting to relax back toward column */
                 transform: translate(-50%, -50%) translate3d(calc(var(--bx, 0px) * 0.45), -55px, -4px) scale(0.88) rotate(0deg);
                 opacity: 0.72; }
          72%  { /* CONVERGED into single column above mouth */
                 transform: translate(-50%, -50%) translate3d(var(--dx, 0px), -100px, -14px) scale(0.78);
                 opacity: 0.45; }
          88%  { /* RECEDING + thinning */
                 transform: translate(-50%, -50%) translate3d(var(--dx, 0px), -148px, -28px) scale(0.62);
                 opacity: 0.16; }
          100% { /* FADED OUT */
                 transform: translate(-50%, -50%) translate3d(var(--dx, 0px), -190px, -42px) scale(0.50);
                 opacity: 0; }
        }
        /*
         * lang-glitch now runs for the full 2s click sequence — but the
         * actual flicker is squeezed into the first ~120ms (snap-open phase),
         * then we sit clean for the 1.5s mouth-open hold.
         */
        @keyframes lang-glitch {
          0%   { filter: none; transform: none; }
          2%   { filter: brightness(1.35) saturate(1.5); transform: translateX(1px); }
          5%   { filter: brightness(0.92); transform: translateX(-1px); }
          7%   { filter: brightness(1.08); transform: translateX(0); }
          100% { filter: none; transform: none; }
        }
      `}</style>
    </div>
  );
}

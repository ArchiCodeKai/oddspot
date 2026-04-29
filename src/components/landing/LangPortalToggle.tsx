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
  const duration = active ? 3.0 : 5.0;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
      {chars.map((c, i) => {
        const isMulti = c.length > 1;
        const delay = -(i / n) * duration;
        return (
          <span
            key={`${version}-${i}-${c}`}
            style={{
              position: "absolute",
              left: "50%",
              top: "63%",
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
              animationName: "wisp-rise",
              animationDuration: `${duration}s`,
              animationTimingFunction: "cubic-bezier(0.33, 0, 0.66, 1)",
              animationDelay: `${delay}s`,
              animationIterationCount: "infinite",
              animationFillMode: "both",
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

  const [charVisible, setCharVisible] = useState(true);
  const [glitching,   setGlitching]   = useState(false);
  const [beamTrigger, setBeamTrigger] = useState(0); // increments on click → fires mouth beam

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
    setCharVisible(false);
    setGlitching(true);
    setBeamTrigger((n) => n + 1); // fire the mouth beam
    setTimeout(() => {
      const next = nextLocale(locale);
      setLocale(next);
    }, 180);
    setTimeout(() => {
      setGlitching(false);
      setCharVisible(true);
    }, 340);
  };

  return (
    // Outer wrapper — plain div, no transform-style/filter/perspective.
    // The WebGL canvas lives here and renders without obstruction.
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        animation: glitching ? "lang-glitch 0.34s steps(4) both" : "none",
      }}
    >
      {/* 3D 上下顎牙齒 — hovered (mouse only) drives CSS drop-shadow silhouette glow;
          active (hover || focus) drives bite speed; beamTrigger fires light beam on click */}
      <TeethJawR3F active={active} hovered={hover} beamTrigger={beamTrigger} />

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
        @keyframes wisp-rise {
          0%   { transform: translate(-50%, -50%) scale(0.48) rotate(-2deg);
                 opacity: 0; }
          6%   { opacity: 0.90; }
          18%  { transform: translate(calc(-50% + 4px), calc(-50% - 20px)) scale(0.68) rotate(2deg);
                 opacity: 0.88; }
          36%  { transform: translate(calc(-50% + 9px), calc(-50% - 52px)) scale(0.86) rotate(4deg);
                 opacity: 0.84; }
          54%  { transform: translate(calc(-50% + 7px), calc(-50% - 90px)) scale(1.00) rotate(1deg);
                 opacity: 0.65; }
          72%  { transform: translate(calc(-50% - 2px), calc(-50% - 128px)) scale(1.12) rotate(-2deg);
                 opacity: 0.30; }
          88%  { transform: translate(calc(-50% - 5px), calc(-50% - 158px)) scale(1.22) rotate(-3deg);
                 opacity: 0.08; }
          100% { transform: translate(calc(-50% - 3px), calc(-50% - 178px)) scale(1.30) rotate(-2deg);
                 opacity: 0; }
        }
        @keyframes lang-glitch {
          0%   { filter: none; transform: none; }
          15%  { filter: brightness(1.35) saturate(1.5);
                 transform: translateX(1px); }
          40%  { filter: brightness(0.92);
                 transform: translateX(-1px); }
          70%  { filter: brightness(1.10);
                 transform: translateX(0); }
          100% { filter: none; transform: none; }
        }
      `}</style>
    </div>
  );
}

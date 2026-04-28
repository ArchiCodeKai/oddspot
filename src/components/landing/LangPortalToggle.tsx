"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useLocaleStore } from "@/store/useLocaleStore";
import { nextLocale, type Locale } from "@/lib/i18n";

// 羅馬石膏頭像 R3F — 禁止 SSR
const RomanBustR3F = dynamic(
  () => import("./RomanBustR3F").then((m) => m.RomanBustR3F),
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
  // DotGothic16 for acid-consistent Japanese display chars
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
// 字符環 — 水平繞頭部口部飛行
// ─────────────────────────────────────────────────────
interface CharRingProps {
  chars: string[];
  font: string;
  radius: number;
  active: boolean;
  version: number;
}

function CharRing({ chars, font, radius, active, version }: CharRingProps) {
  const step = 360 / chars.length;

  return (
    <div
      style={{
        position: "absolute",
        top: "58%",
        left: "50%",
        width: 0,
        height: 0,
        transformStyle: "preserve-3d",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          transformStyle: "preserve-3d",
          animation: `ring-spin-h ${active ? 5 : 16}s linear infinite`,
        }}
      >
        {chars.map((c, i) => {
          const angle = i * step;
          const isMulti = c.length > 1;
          return (
            <span
              key={`${version}-${i}-${c}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 20,
                height: 20,
                marginLeft: -10,
                marginTop: -10,
                transformStyle: "preserve-3d",
                transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: font,
                fontSize: isMulti ? 7 : 12,
                fontWeight: 500,
                color: "var(--accent)",
                textShadow: "0 0 6px rgb(var(--accent-rgb) / 0.8)",
                whiteSpace: "nowrap",
                lineHeight: 1,
                pointerEvents: "none",
                animation: `ring-char-fade 0.5s ease both`,
                animationDelay: `${i * 0.025}s`,
                transition: "opacity 280ms",
                ...(active ? { ["--char-o" as string]: "1" } : { ["--char-o" as string]: "0.9" }),
              }}
            >
              {c}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// 主元件
// ─────────────────────────────────────────────────────
export function LangPortalToggle({ size = 128 }: { size?: number }) {
  const { locale, setLocale } = useLocaleStore();
  const [hover,  setHover]  = useState(false);
  const [focus,  setFocus]  = useState(false);    // keyboard focus state
  const [charLocale, setCharLocale] = useState<Locale>(locale);
  const [ringVersion, setRingVersion] = useState(0);
  const [chars, setChars] = useState<string[]>([]);

  // click animation states
  const [charVisible, setCharVisible] = useState(true);  // char ring opacity/scale
  const [glitching,   setGlitching]   = useState(false); // brief glitch on click

  const active = hover || focus;  // keyboard + mouse both wake the bust

  useEffect(() => {
    setChars(sampleChars(charLocale, 20));
    setRingVersion((v) => v + 1);
  }, [charLocale]);

  useEffect(() => {
    setCharLocale(locale);
  }, [locale]);

  const handleClick = () => {
    if (glitching) return;
    // Phase 1: chars shrink (sucked into mouth) + glitch
    setCharVisible(false);
    setGlitching(true);
    // Phase 2: locale switches mid-glitch
    setTimeout(() => {
      const next = nextLocale(locale);
      setLocale(next);
    }, 180);
    // Phase 3: glitch ends, new-locale chars spit out
    setTimeout(() => {
      setGlitching(false);
      setCharVisible(true);
    }, 340);
  };

  // ring radius: horizontal orbit at head width ≈ size × 0.48
  const ringRadius = size * 0.48;

  return (
    <button
      type="button"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      onClick={handleClick}
      aria-label={`Switch language — current: ${LOCALE_NAMES[locale]}`}
      style={{
        position: "relative",
        width: size,
        height: size,
        padding: 0,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        display: "block",
        perspective: size * 3.5,
        transformStyle: "preserve-3d",
        filter: active
          ? "drop-shadow(0 0 18px rgb(var(--accent-rgb) / 0.7))"
          : "drop-shadow(0 0 8px rgb(var(--accent-rgb) / 0.4))",
        transition: "filter 280ms",
        animation: glitching ? "lang-glitch 0.34s steps(4) both" : "none",
        outline: focus ? "2px solid var(--accent)" : "none",
        outlineOffset: 4,
        borderRadius: "50%",
      }}
    >
      {/* 3D 頭像 */}
      <RomanBustR3F active={active} />

      {/* 字符環 — click 時縮進嘴裡，切換後從嘴吐出 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          pointerEvents: "none",
          transform: charVisible ? "scale(1)" : "scale(0.08)",
          transition: charVisible
            ? "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)"
            : "transform 180ms ease-in",
        }}
      >
        <CharRing
          chars={chars}
          font={FONT_BY_LOCALE[charLocale]}
          radius={ringRadius}
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

      <style>{`
        @keyframes ring-spin-h {
          from { transform: rotateY(0deg); }
          to   { transform: rotateY(360deg); }
        }
        @keyframes ring-char-fade {
          from { opacity: 0; }
          to   { opacity: var(--char-o, 0.9); }
        }
        @keyframes lang-glitch {
          0%   { filter: none; transform: none; }
          20%  { filter: hue-rotate(80deg) brightness(2.0) saturate(3);
                 transform: skewX(4deg) translateX(3px); }
          45%  { filter: hue-rotate(-80deg) brightness(0.5);
                 transform: skewX(-3deg) translateX(-4px) scaleX(1.04); }
          70%  { filter: hue-rotate(40deg) brightness(1.4);
                 transform: translateX(2px); }
          100% { filter: none; transform: none; }
        }
      `}</style>
    </button>
  );
}

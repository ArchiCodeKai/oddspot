"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useLocaleStore } from "@/store/useLocaleStore";
import { nextLocale, type Locale } from "@/lib/i18n";

// 蟲洞 R3F — 禁止 SSR（Canvas + WebGL）
const WormholeR3F = dynamic(
  () => import("./WormholeR3F").then((m) => m.WormholeR3F),
  { ssr: false },
);

// ─────────────────────────────────────────────────────
// 字符池：每種 locale 一批
// zh-TW · 注音（Noto Sans TC 原生支援）
// en    · 英文字母 + system glyph
// ja    · 平假名 + 片假名 + 簡單漢字 + 顏文字（Noto Sans JP）
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
    // 平假名
    "あ", "い", "う", "え", "お", "か", "き", "く", "け", "こ",
    "さ", "し", "す", "せ", "そ", "た", "ち", "つ", "て", "と",
    "な", "に", "ぬ", "ね", "の", "は", "ひ", "ふ", "へ", "ほ",
    "ま", "み", "む", "め", "も", "や", "ゆ", "よ",
    "ら", "り", "る", "れ", "ろ", "わ", "を", "ん",
    // 片假名
    "ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ",
    "サ", "シ", "ス", "セ", "ソ", "タ", "チ", "ナ", "ニ",
    // 簡單漢字
    "月", "山", "川", "海", "空", "風", "火", "水", "木", "森",
    "光", "影", "夜", "星", "神", "鬼", "夢", "花",
    // 顏文字彩蛋（字符較多，抽到機率降低）
    "(◕‿◕)", "(˘ω˘)", "(>_<)", "(·ω·)",
  ],
};

const FONT_BY_LOCALE: Record<Locale, string> = {
  "zh-TW": "var(--font-noto-sans-tc), 'Noto Sans TC', sans-serif",
  en: "var(--font-vt323), 'VT323', 'Courier New', monospace",
  ja: "var(--font-noto-sans-jp), 'Noto Sans JP', sans-serif",
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

// 抽 N 個字符，顏文字最多 1 個
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
// Saturn ring 字符環：純 CSS 3D（蟲洞已改 R3F，見 WormholeR3F.tsx）
// ─────────────────────────────────────────────────────
interface CharRingProps {
  chars: string[];
  font: string;
  radius: number; // px，軌道半徑
  active: boolean;
  version: number; // 切 locale 時 +1，觸發 key 重建做淡入
}

function CharRing({ chars, font, radius, active, version }: CharRingProps) {
  const step = 360 / chars.length;

  return (
    // 外層 tilt 對齊蟲洞中軸：
    //   rotateX(7deg) rotateZ(-15deg) — 跟 WORMHOLE_TILT (0.12, 0, -0.26) 同步
    //   rotateY(20deg) — 讓 ring 在螢幕上呈現 3D 橢圓而非垂直線
    // top: 50% — ring center 對準蟲洞幾何中心（throat），ring 半徑 = halfH 投影
    //   → ring 頂部對準 top mouth、底部對準 bottom mouth
    //   → 字符自然從 bottom mouth 升起、從 top mouth 進入（配合 backface-hidden 穿透感）
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 0,
        height: 0,
        transformStyle: "preserve-3d",
        transform: "rotateX(7deg) rotateY(20deg) rotateZ(-15deg)",
      }}
    >
      {/* 內層：繞 X 軸旋轉 → 字符垂直繞圈穿過蟲洞 mouths */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          transformStyle: "preserve-3d",
          animation: `ring-spin-v ${active ? 6 : 18}s linear infinite`,
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
                // 垂直軌道：rotateX 分佈到圓周 + translateZ 推出半徑（對齊 mouth 中心）
                transform: `rotateX(${angle}deg) translateZ(${radius}px)`,
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
  const [hover, setHover] = useState(false);
  // 顯示字符的 locale（切換時先淡出舊 → 更新字符池 → 淡入新）
  const [charLocale, setCharLocale] = useState<Locale>(locale);
  const [ringVersion, setRingVersion] = useState(0);

  // 初始字符 + 每次 charLocale 改變重抽一批（20 個字符 = 更密）
  const [chars, setChars] = useState<string[]>([]);
  useEffect(() => {
    setChars(sampleChars(charLocale, 20));
    setRingVersion((v) => v + 1);
  }, [charLocale]);

  // locale 變化時同步更新 charLocale（會觸發重抽 + 重建動畫）
  useEffect(() => {
    setCharLocale(locale);
  }, [locale]);

  const handleClick = () => {
    const next = nextLocale(locale);
    setLocale(next);
  };

  // ringRadius 對齊蟲洞 halfH 投影到 button 像素的距離
  // camera z=2.55 fov 46° → view half-height ≈ 1.082
  // wormhole halfH=1.0 → 螢幕 fraction = 1.0/1.082 ≈ 0.92
  // 0.92 × button half-height(64) ≈ 59px → ringRadius = size × 0.46
  const ringRadius = size * 0.46;

  return (
    <button
      type="button"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
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
        filter: hover
          ? "drop-shadow(0 0 18px rgb(var(--accent-rgb) / 0.7))"
          : "drop-shadow(0 0 8px rgb(var(--accent-rgb) / 0.4))",
        transition: "filter 280ms",
      }}
    >
      {/* R3F 真 3D 蟲洞（背景層） */}
      <WormholeR3F active={hover} />

      {/* 字符環（前景 CSS 3D）— 字符垂直繞蟲洞 mouth 飛入飛出 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          // hover 時整體略側傾提示互動
          transform: `rotateZ(${hover ? 3 : 0}deg)`,
          transition: "transform 420ms cubic-bezier(0.32, 0.72, 0, 1)",
          pointerEvents: "none",
        }}
      >
        <CharRing
          chars={chars}
          font={FONT_BY_LOCALE[charLocale]}
          radius={ringRadius}
          active={hover}
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
          color: hover ? "var(--accent)" : "var(--muted)",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          transition: "color 250ms",
          textShadow: hover ? "0 0 8px rgb(var(--accent-rgb) / 0.5)" : "none",
        }}
      >
        LANG:{LOCALE_CODES[locale]}
      </span>

      <style>{`
        @keyframes ring-spin-v { from { transform: rotateX(0); } to { transform: rotateX(360deg); } }
        @keyframes ring-char-fade {
          from { opacity: 0; }
          to   { opacity: var(--char-o, 0.9); }
        }
      `}</style>
    </button>
  );
}

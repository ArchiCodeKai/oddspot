"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { BrandTag } from "@/components/ui/BrandTag";
import { AcidButton } from "@/components/ui/AcidButton";
import { EyeMark } from "@/components/ui/EyeMark";
import { useAppStore } from "@/store/useAppStore";
import { useLocaleStore } from "@/store/useLocaleStore";
import { useGlobeTier } from "@/hooks/useViewportTier";
import {
  BarcodeS,
  DealWithItS,
  ErrorTagS,
  StarBurstS,
  WordmarkS,
} from "./AcidStickers";
import { TerrainDeco } from "./TerrainDeco";
import { Marquee } from "./Marquee";
import { LangPortalToggle } from "./LangPortalToggle";

// GlobeScene 含 Three.js，禁止 SSR（canvas + WebGL）
// 桌面版：完整點雲 + 海洋 shader + 月球（重）
const GlobeScene = dynamic(
  () => import("./GlobeScene").then((m) => m.GlobeScene),
  { ssr: false },
);

// 手機版：經緯線 wireframe + 城市光點 + low-poly 月球（輕量，給手機效能）
// 兩者 props 完全相同，可無痛切換
const GlobeSceneMobile = dynamic(
  () => import("./GlobeSceneMobile").then((m) => m.GlobeSceneMobile),
  { ssr: false },
);

const VISITED_KEY = "oddspot-visited";

type Phase = "boot-0" | "boot-1" | "boot-2" | "boot-3" | "boot-4" | "idle";

// Boot phase 時間表（ms）
const PHASE_T = {
  "boot-0": 0,
  "boot-1": 1200,
  "boot-2": 3000,
  "boot-3": 4600,
  "boot-4": 5400,
  idle: 6200,
} as const;

const BOOT_CAPTIONS: Record<Phase, { main?: string; sub?: string; tag: string }> = {
  "boot-0": { tag: "phase:0 / init", main: "// booting", sub: "connecting to archive" },
  "boot-1": { tag: "phase:1 / scan", main: "scanning taiwan", sub: "37,197 km²" },
  "boot-2": { tag: "phase:2 / zoom", main: "zooming to region", sub: "23.8°N, 121.0°E" },
  "boot-3": { tag: "phase:3 / lock", main: "locked on", sub: "taipei basin" },
  "boot-4": { tag: "phase:4 / ready", main: undefined, sub: undefined },
  idle:     { tag: "phase:∞ / idle", main: undefined, sub: undefined },
};

// v3 「壞掉的存檔系統」碎語：系統狀態 + 詩意片段 + B-grade 裂縫
//   archive://... 系統路徑
//   數字統計 = 真資料感
//   softly catastrophic / last seen: ??? = poetic
//   MONTH 13 / 1998-08-13 / unverified = B-grade 「不可能日期」裂縫
//   有人知道但不肯說 / 打聽中 = 中文猶豫感（OddSpot voice）
//   信號干擾、err_no_weird_found = 終端機式錯誤
const MARQUEE_ITEMS = [
  "archive://taipei",
  "237 spots indexed",
  "12 disappeared this year",
  "softly catastrophic",
  "MONTH 13, 2026",
  "err_no_weird_found",
  "有人知道但不肯說",
  "signal interference detected",
  "archive://1998-08-13 · unverified",
  "last seen: ???",
  "打聽中... 等一下",
  "cartography: natural earth",
  "made in taiwan",
];

export function LandingExperience() {
  const router = useRouter();
  const t = useTranslations("landing");
  const { locale } = useLocaleStore();
  const globeTier = useGlobeTier(); // "light" | "reduced" | "full"
  const useLightGlobe = globeTier === "light";
  const startTimeRef = useRef<number>(performance.now());
  const [phase, setPhase] = useState<Phase>("boot-0");
  const [dissolveProgress, setDissolveProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [clock, setClock] = useState("--:--:--");
  const [skipBoot, setSkipBoot] = useState(false);
  // mounted 旗標：避免 SSR/client 不一致造成 hydration mismatch
  // 之前的 dev 角標用 typeof window 動態判斷，server="?" / client=瀏覽器寬度
  // → React 19 嚴格 hydration check 會丟棄整個 tree 重 render
  // → Canvas 重 mount → GLB 重新載入 → shader state 重置 → 看起來像「載入特別慢」+ 潮汐消失
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // 整個 boot → dissolve 動畫驅動：mount 一次，rAF 自我終止
  // 之前的版本把這個拆成兩個 useEffect 且依賴 [phase]，
  // 結果 phase 一進 idle 就 cleanup 取消 rAF → dissolveProgress 卡在 0
  useEffect(() => {
    const visited = typeof window !== "undefined" && localStorage.getItem(VISITED_KEY) === "1";
    if (visited) {
      setSkipBoot(true);
      setPhase("idle");
      setDissolveProgress(1);
      return; // 回訪不需要跑 boot 動畫
    }

    startTimeRef.current = performance.now();
    let frameId: number;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      const elapsed = performance.now() - startTimeRef.current;

      // Phase：依時間表前進
      let nextPhase: Phase = "boot-0";
      for (const key of Object.keys(PHASE_T) as Phase[]) {
        if (elapsed >= PHASE_T[key]) nextPhase = key;
      }
      setPhase(nextPhase);

      // Dissolve 進度：到 idle 後 1.3s 內 0 → 1
      if (elapsed >= PHASE_T.idle) {
        const dt = Math.min(1, (elapsed - PHASE_T.idle) / 1300);
        setDissolveProgress(dt);
        // 動畫完成後自我終止 rAF
        if (dt >= 1) {
          stopped = true;
          return;
        }
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  // 時鐘
  useEffect(() => {
    const update = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      setClock(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const enterMap = () => {
    if (typeof window !== "undefined") localStorage.setItem(VISITED_KEY, "1");
    setExiting(true);
    setTimeout(() => router.push("/map"), 480);
  };

  // Idle 狀態 = boot 播完 + dissolve 也走完
  const isIdle = phase === "idle" && dissolveProgress >= 1;

  const cap = BOOT_CAPTIONS[phase];

  const captionVisible = useMemo(() => {
    if (exiting) return false;
    return phase === "boot-0" || phase === "boot-1" || phase === "boot-2" || phase === "boot-3";
  }, [phase, exiting]);

  const reticleVisible = phase === "boot-2" || phase === "boot-3";

  return (
    <motion.div
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.48, ease: [0.32, 0.72, 0, 1] }}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        // Landing 強制 terminal 黑底，不受 light/dark 主題切換影響
        // 雙保險：CSS var + hardcoded fallback
        background: "var(--bg, #040c0a)",
        color: "var(--fg, #c6e8e0)",
        // 整頁文字全部不可選 — 拖曳月球、地球時不會誤選 HUD / sticker / marquee。
        // 加上 webkit 前綴以涵蓋 Safari / iOS。
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Film grain */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 3,
          opacity: "var(--grain-opacity)",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.9'/></svg>\")",
          mixBlendMode: "overlay",
        }}
      />
      {/* CRT scanlines */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 3,
          background:
            "repeating-linear-gradient(0deg, transparent 0, transparent 3px, rgb(var(--accent-rgb) / 0.025) 3px, rgb(var(--accent-rgb) / 0.025) 4px)",
        }}
      />

      {/* Globe canvas — 全螢幕
          mobile / reduced-motion        → GlobeSceneMobile（海岸線版）
          tablet / desktop reduced-motion → GlobeScene tier="reduced"（點雲 -30%）
          desktop                         → GlobeScene tier="full"
          mounted 守護：避免 SSR fallback "desktop" → client "light" 觸發
          GlobeScene unmount + GlobeSceneMobile mount 的 Canvas 重建（GLB 重抓 / shader state 丟失） */}
      {mounted && (
        globeTier === "light" ? (
          <GlobeSceneMobile phase={phase} skipBoot={skipBoot} dissolveProgress={dissolveProgress} />
        ) : (
          <GlobeScene
            phase={phase}
            skipBoot={skipBoot}
            dissolveProgress={dissolveProgress}
            tier={globeTier}
          />
        )
      )}

      {/* HUD: 左上 system tag + phase */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 10,
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
          maxWidth: "calc(100% - 40px)",
        }}
      >
        <BrandTag glow>sys://oddspot · v0.2.0-alpha</BrandTag>
        <BrandTag>{cap.tag}</BrandTag>
      </div>

      {/* HUD: 右上座標 + 時鐘 */}
      <div
        className="hud-coord"
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 10,
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <BrandTag>lat 25.0330°N</BrandTag>
        <BrandTag>lng 121.5654°E</BrandTag>
        <BrandTag>{clock}</BrandTag>
      </div>

      {/* Reticle scan frame（只在 zoom + lock 階段顯示） */}
      <AnimatePresence>
        {reticleVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 340,
              height: 340,
              border: "1px solid var(--accent)",
              pointerEvents: "none",
              zIndex: 11,
              boxShadow: "0 0 40px rgb(var(--accent-rgb) / 0.2) inset",
              maxWidth: "80vw",
              maxHeight: "80vw",
            }}
          />
        )}
      </AnimatePresence>

      {/* Boot caption — 畫面中央文字 */}
      <AnimatePresence>
        {captionVisible && cap.main && (
          <motion.div
            key={cap.main}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              position: "absolute",
              top: "52%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 12,
              textAlign: "center",
              pointerEvents: "none",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--accent)",
              textShadow: "0 0 12px rgb(var(--accent-rgb) / 0.5)",
            }}
          >
            {cap.main}
            {cap.sub && (
              <small
                style={{
                  display: "block",
                  color: "var(--muted)",
                  fontSize: 9,
                  marginTop: 6,
                  letterSpacing: "0.25em",
                  textShadow: "none",
                }}
              >
                {cap.sub}
              </small>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* === IDLE / Acid Landing 版面 === */}
      <AnimatePresence>
        {isIdle && !exiting && (
          <>
            {/* 左下 terrain 裝飾 — 只在桌面顯示 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="landing-terrain"
              style={{
                position: "absolute",
                bottom: 80,
                left: -40,
                width: 340,
                height: 180,
                zIndex: 4,
                pointerEvents: "none",
              }}
            >
              <TerrainDeco />
            </motion.div>

            {/* 眼睛 mascot — OddSpot wordmark「ot」正下方，點擊循環切主題 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="landing-eye"
              style={{
                position: "absolute",
                top: "22%",
                left: "25%",
                zIndex: 6,
              }}
            >
              <EyeMark
                size={70}
                mood="scanning"
                onClick={() => useAppStore.getState().cycleTheme()}
                ariaLabel="Cycle theme"
                title="Click to cycle theme"
              />
            </motion.div>

            {/* Acid stickers — SphereS（GLOBAL NULL）已移除，會擋住地球
                SwirlS 被 LangPortalToggle 取代 */}
            <WordmarkS     style={{ top: "8%",  left: "4%"  }} rotate={-3}  delay={0.1} />
            <ErrorTagS     style={{ bottom: "14%", left: "3%" }}            delay={0.5} />
            <StarBurstS    style={{ bottom: "22%", left: "36%" }}            delay={0.6} />
            <DealWithItS   style={{ bottom: "14%", right: "6%" }}            delay={0.7} />

            {/* 語言切換蟲洞 — 右上角，縮小版 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{
                delay: 0.5,
                type: "spring",
                stiffness: 130,
                damping: 11,
                mass: 0.9,
              }}
              className="landing-lang-portal"
              style={{
                position: "absolute",
                top: "7%",
                right: "4%",
                zIndex: 10,
              }}
            >
              {/* Glow burst 圈 — 蟲洞「劈啪」彈出時的光環擴散 */}
              <motion.div
                initial={{ scale: 0.2, opacity: 0.85 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ delay: 0.55, duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
                style={{
                  position: "absolute",
                  inset: -16,
                  borderRadius: "50%",
                  border: "1px solid var(--accent)",
                  boxShadow: "0 0 32px rgb(var(--accent-rgb) / 0.6), inset 0 0 24px rgb(var(--accent-rgb) / 0.3)",
                  pointerEvents: "none",
                }}
              />
              <LangPortalToggle size={116} />
            </motion.div>

            {/* Headline + CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
              className="landing-headline"
              style={{
                position: "absolute",
                bottom: "18%",
                left: "6%",
                right: "6%",
                maxWidth: 640,
                zIndex: 10,
              }}
            >
              <BrandTag dot glow style={{ marginBottom: 24 }}>
                {t("systemTag")}
              </BrandTag>
              <h1
                className={
                  locale === "en"
                    ? "t-en-h2"
                    : locale === "ja"
                    ? "t-jp-h1"
                    : "t-tc-h1"
                }
                style={{
                  fontSize:
                    locale === "en"
                      ? "clamp(1.8rem, 3.5vw, 2.5rem)"
                      : "clamp(28px, 5vw, 56px)",
                  margin: 0,
                  marginBottom: 24,
                  whiteSpace: "pre-line",
                }}
              >
                {t.rich("headline", {
                  em: (chunks) => (
                    <em
                      style={{
                        fontStyle: "normal",
                        color: "var(--accent)",
                        textShadow: "0 0 32px rgb(var(--accent-rgb) / 0.45)",
                      }}
                    >
                      {chunks}
                    </em>
                  ),
                })}
              </h1>
              <p
                className="t-tc-body"
                style={{ color: "var(--muted)", maxWidth: 480, marginBottom: 32 }}
              >
                {t("lede")}
              </p>
              <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <AcidButton
                  onClick={enterMap}
                  variant="accent"
                  size="lg"
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  }
                >
                  {t("cta")}
                </AcidButton>
                <BrandTag>{t("ctaMeta")}</BrandTag>
              </div>
            </motion.div>

            {/* Marquee */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              style={{ position: "absolute", bottom: 48, left: 0, right: 0, zIndex: 4 }}
            >
              <Marquee items={MARQUEE_ITEMS} />
            </motion.div>

            {/* 底部 status strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.0 }}
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 5,
                display: "flex",
                justifyContent: "space-between",
                padding: "14px 24px",
                borderTop: "1px solid var(--line)",
                background: "rgb(0 0 0 / 0.45)",
                backdropFilter: "blur(12px)",
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--muted)",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", gap: 20 }}>
                <span>© OddSpot / archive</span>
                <span>v0.2.0-alpha</span>
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                <span>/map</span>
                <span>/swipe</span>
                <span>/submit</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DEV ONLY · viewport + globe tier debug 角標
          mounted 守護：mount 完才渲染整個 div，避免 server "?" / client "574"
          的 hydration mismatch（會把整顆 React tree 重 render，讓 Canvas+GLB 重 mount） */}
      {process.env.NODE_ENV !== "production" && mounted && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            bottom: 4,
            right: 4,
            zIndex: 9999,
            padding: "4px 8px",
            background:
              globeTier === "light"   ? "rgba(95, 217, 192, 0.9)"
              : globeTier === "reduced" ? "rgba(255, 200, 80, 0.9)"
              :                           "rgba(255, 100, 100, 0.9)",
            color: "#000",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 10,
            letterSpacing: "0.1em",
            pointerEvents: "none",
          }}
        >
          {globeTier.toUpperCase()} · {window.innerWidth}px
        </div>
      )}
    </motion.div>
  );
}

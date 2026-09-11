"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// START SCANNING 主按鈕：按鈕本體是一片無人機視角、持續向前飛的線框山巒。
// 2D canvas 透視投影（不是 Three.js）：ROWS 排 × COLS 列高度格，每幀朝鏡頭推進，
// 飛過鏡頭的排在遠端用 value noise 重新生成 → 山形隨機、永不重複。
// 由遠到近用背景色填充做遮擋（painter's algorithm），近山擋遠山，有稜線感但仍是線框。
// 山可以比鏡頭高：山頂會探出地平線、在天空留下剪影，這是「像山」而不是「起伏的布」的關鍵；
// 飛行路徑本身壓成一條淺谷，鏡頭永遠不會鑽進山裡。
// hover / focus 時油門加大；prefers-reduced-motion 時只畫靜態一幀；分頁隱藏時暫停。

const ROWS = 64;              // 深度方向排數
const COLS = 112;             // 橫向列數（指數分佈，見 COL_X）
const CAM_Y = 0.5;            // 鏡頭高度（地面 = 0）
const HORIZON = 0.42;         // 地平線在畫布高度的比例（上方留給文字與山頂剪影）
const Z_NEAR = 0.34;          // 最近一排的眼空間深度；要夠近，谷底最高點才會投影到畫布底邊以下
const Z_STEP = 0.125;         // 每排深度差
const Z_FAR = Z_NEAR + ROWS * Z_STEP;   // 最遠一排 ≈ 8.3
const AMPLITUDE = 0.72;       // 山高上限（> CAM_Y，山頂會高過地平線）
const CURVE_Z = 3.2;          // 比這近的排才用貝茲曲線，遠處線段只有幾 px，直線就夠
const SPEED_IDLE = 2.9;       // 排 / 秒
const SPEED_ACTIVE = 6.2;

// 列的世界 x 走指數分佈：中央密（近景需要）、外側疏（只在遠景看得到）。
// 投影焦距 = 畫布半寬，所以深度 z 的畫面半寬剛好是 z 個世界單位；
// 最外列落在最遠排的畫面邊緣，任何深度都不會看到地形的左右邊界。
const COL_K = 1.6;
const COL_A = Z_FAR / (Math.exp(COL_K) - 1);
const COL_X: number[] = Array.from({ length: COLS }, (_, c) => {
  const u = (c / (COLS - 1)) * 2 - 1;
  return Math.sign(u) * COL_A * (Math.exp(COL_K * Math.abs(u)) - 1);
});
// 飛行路徑（x = 0）附近把山壓低成淺谷：谷底最高 0.42 × AMPLITUDE < CAM_Y，
// 兩側的山不受影響，可以高過鏡頭、在地平線上留下剪影
const COL_VALLEY: number[] = COL_X.map((x) => 1 - 0.58 * Math.exp(-x * x));
// 給定可見半寬（世界單位）→ 需要處理的列索引範圍（對稱）
function visibleCols(halfX: number): [number, number] {
  const u = Math.min(1, Math.log(halfX / COL_A + 1) / COL_K);
  const half = (COLS - 1) / 2;
  return [Math.max(0, Math.floor(half - u * half)), Math.min(COLS - 1, Math.ceil(half + u * half))];
}

// ─── value noise（無狀態：同樣的 (x, z, seed) 永遠同一個高度）───────────────
function hash(ix: number, iz: number, seed: number) {
  let n = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(seed, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967296;
}
const smooth = (t: number) => t * t * (3 - 2 * t);
function noise2(x: number, z: number, seed: number) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = smooth(x - x0);
  const tz = smooth(z - z0);
  const a = hash(x0, z0, seed);
  const b = hash(x0 + 1, z0, seed);
  const c = hash(x0, z0 + 1, seed);
  const d = hash(x0 + 1, z0 + 1, seed);
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * tz;
}
// ridged noise：1 - |2n - 1| 把雜訊的零交叉翻成稜線，這是山脈的招牌形狀。
// |·| 的尖角用 sqrt(t² + ε²) 磨圓：只圓山頂、斜坡保持陡，起伏才明顯（smoothstep 會把整體壓扁）
const RIDGE_EPS = 0.12;
function ridge(n: number) {
  const t = 2 * n - 1;
  return Math.max(0, (1 - Math.sqrt(t * t + RIDGE_EPS * RIDGE_EPS)) / (1 - RIDGE_EPS));
}
// x、z 都是眼空間單位（等向），一座山約 1.8 單位寬
function heightAt(x: number, z: number, seed: number) {
  const macro = ridge(noise2(x * 0.55, z * 0.55, seed));               // 主山體
  const sub = ridge(noise2(x * 1.3, z * 1.3, seed + 7));               // 山脊細節：山頂多、谷底少
  const grain = noise2(x * 3.2, z * 3.2, seed + 19);                   // 一點粗糙
  const region = smooth(noise2(x * 0.12, z * 0.1, seed + 31));         // 山區 / 丘陵區慢慢交替
  const h = macro * 0.65 + sub * 0.28 * (0.4 + 0.6 * macro) + grain * 0.07;
  return h * (0.5 + 0.5 * region) * AMPLITUDE;
}

// 把一排點（Float32Array，每列存 x, y）描成路徑；curved 時用中點二次貝茲，否則直線
function tracePath(
  ctx: CanvasRenderingContext2D,
  pts: Float32Array,
  lo: number,
  hi: number,
  reverse: boolean,
  continuePath: boolean,
  curved: boolean,
) {
  const step = reverse ? -1 : 1;
  const end = reverse ? lo : hi;
  let c = reverse ? hi : lo;
  if (continuePath) ctx.lineTo(pts[c * 2], pts[c * 2 + 1]);
  else ctx.moveTo(pts[c * 2], pts[c * 2 + 1]);
  if (!curved) {
    for (c += step; reverse ? c >= end : c <= end; c += step) ctx.lineTo(pts[c * 2], pts[c * 2 + 1]);
    return;
  }
  for (c += step; c !== end; c += step) {
    const px = pts[c * 2];
    const py = pts[c * 2 + 1];
    const nx = pts[(c + step) * 2];
    const ny = pts[(c + step) * 2 + 1];
    ctx.quadraticCurveTo(px, py, (px + nx) / 2, (py + ny) / 2);
  }
  ctx.lineTo(pts[end * 2], pts[end * 2 + 1]);
}

function readCssColor(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

interface TerrainScanButtonProps {
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

export function TerrainScanButton({ onClick, children, className }: TerrainScanButtonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // activeRef 給 rAF 迴圈讀（不觸發 re-render）；active state 只管邊框光暈。
  // 兩者在事件處理器裡一起更新，不在 render 期間寫 ref。
  const activeRef = useRef(false);
  const [active, setActive] = useState(false);
  const setActiveBoth = (value: boolean) => {
    activeRef.current = value;
    setActive(value);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seed = Math.floor(Math.random() * 2147483647);   // 每次 mount 一組新山脈

    let width = 0;
    let height = 0;
    let dpr = 1;
    let accent = readCssColor("--accent", "#5fd9c0");
    let bg = readCssColor("--bg", "#040c0a");

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // 主題切換 → 重新讀色
    const themeObs = new MutationObserver(() => {
      accent = readCssColor("--accent", accent);
      bg = readCssColor("--bg", bg);
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });

    // 每排高度只算一次：排的世界 z 是整數、地形本身不動，動的只有鏡頭
    const heightCache = new Map<number, Float32Array>();
    const rowHeights = (worldZ: number) => {
      const cached = heightCache.get(worldZ);
      if (cached) return cached;
      const hs = new Float32Array(COLS);
      const nz = worldZ * Z_STEP;
      // 飛行路徑左右微微漂移（±0.9），山脈才不會永遠正對著飛
      const drift = (noise2(nz * 0.16, 0.5, seed + 47) - 0.5) * 1.8;
      for (let c = 0; c < COLS; c += 1) hs[c] = heightAt(COL_X[c] + drift, nz, seed) * COL_VALLEY[c];
      heightCache.set(worldZ, hs);
      // 丟掉已經飛過去的排
      heightCache.forEach((_, key) => {
        if (key < worldZ - ROWS - 2) heightCache.delete(key);
      });
      return hs;
    };
    // 兩個投影緩衝輪流當遠排 / 近排，每列存 x, y
    const bufA = new Float32Array(COLS * 2);
    const bufB = new Float32Array(COLS * 2);

    // camZ 持續增加；每排的世界 z 是整數格，距離鏡頭 d = (rowBase + r + 1) - camZ
    let camZ = 0;
    let speed = SPEED_IDLE;
    let last = performance.now();
    let frame = 0;
    let running = true;

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduceMotion) {
        const target = activeRef.current ? SPEED_ACTIVE : SPEED_IDLE;
        speed += (target - speed) * Math.min(1, dt * 4);
        camZ += speed * dt;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineJoin = "round";

      const f = width * 0.5;
      const hy = height * HORIZON;
      const rowBase = Math.floor(camZ);
      const t = camZ - rowBase;

      let prev: Float32Array | null = null;
      let prevMinY = 0;
      let prevCurved = false;
      // 由遠到近：每條帶先用背景色填掉再描線（painter's）
      for (let r = ROWS - 1; r >= 0; r -= 1) {
        const d = r + 1 - t;                       // 距鏡頭幾排（0..ROWS）
        const zEye = Z_NEAR + d * Z_STEP;
        const hs = rowHeights(rowBase + r + 1);
        // 只投影看得到的列；用遠一排的可見寬度，填充多邊形才夠寬
        const [lo, hi] = visibleCols(1.12 * (zEye + Z_STEP));
        const cur: Float32Array = prev === bufA ? bufB : bufA;
        const s = f / zEye;
        let minY = Infinity;
        for (let c = lo; c <= hi; c += 1) {
          const y = hy + (CAM_Y - hs[c]) * s;
          cur[c * 2] = width / 2 + COL_X[c] * s;
          cur[c * 2 + 1] = y;
          if (y < minY) minY = y;
        }
        const curved = zEye < CURVE_Z;

        // 整條帶都在畫布下方就跳過
        if (prev && hi - lo >= 1 && !(minY > height && prevMinY > height)) {
          ctx.beginPath();
          tracePath(ctx, prev, lo, hi, false, false, prevCurved);
          tracePath(ctx, cur, lo, hi, true, true, curved);
          ctx.closePath();
          ctx.fillStyle = bg;
          ctx.fill();

          const fade = 1 - Math.pow(d / ROWS, 1.6);    // 遠端淡到 0，新生成的排看不見
          ctx.globalAlpha = fade;
          ctx.strokeStyle = accent;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          tracePath(ctx, cur, lo, hi, false, false, curved);
          ctx.stroke();

          // 縱向連線：帶薄於 1px（遠景）就不畫，遠處只剩稜線疊成霧
          const stripH = Math.abs(cur[COLS + 1] - prev[COLS + 1]);
          const connAlpha = Math.min(1, Math.max(0, (stripH - 1) / 2));
          if (connAlpha > 0) {
            ctx.globalAlpha = fade * connAlpha;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            for (let c = lo; c <= hi; c += 1) {
              ctx.moveTo(prev[c * 2], prev[c * 2 + 1]);
              ctx.lineTo(cur[c * 2], cur[c * 2 + 1]);
            }
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        prev = cur;
        prevMinY = minY;
        prevCurved = curved;
      }

      if (running && !reduceMotion && !document.hidden) frame = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      if (!document.hidden && running && !reduceMotion) {
        // 分頁隱藏時瀏覽器只是把排好的 rAF 暫停、不會丟掉；回到前景它會照跑。
        // 先取消它再重排，不然每切一次分頁就多疊一條繪圖迴圈。
        cancelAnimationFrame(frame);
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    frame = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      ro.disconnect();
      themeObs.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setActiveBoth(true)}
      onMouseLeave={() => setActiveBoth(false)}
      onFocus={() => setActiveBoth(true)}
      onBlur={() => setActiveBoth(false)}
      className={`terrain-scan-button${className ? ` ${className}` : ""}`}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "flex-start",       // 文字靠上
        justifyContent: "center",       // 文字水平置中
        width: "min(100%, 440px)",
        height: 132,
        padding: "22px 28px 0",
        background: "var(--bg, #040c0a)",
        border: "1px solid var(--accent)",
        borderRadius: 2,
        color: "var(--accent)",
        cursor: "pointer",
        overflow: "hidden",
        boxShadow: active
          ? "0 0 28px rgb(var(--accent-rgb) / 0.35), inset 0 0 0 1px rgb(var(--accent-rgb) / 0.35)"
          : "0 0 16px rgb(var(--accent-rgb) / 0.16)",
        transition: "box-shadow 0.25s ease, transform 0.12s ease",
      }}
    >
      <style>{`
        .terrain-scan-button:active { transform: translateY(1px); }
        .terrain-scan-button:focus-visible { outline: 1px solid var(--accent); outline-offset: 3px; }
        @media (max-width: 767px) {
          .terrain-scan-button { height: 100px !important; padding: 16px 20px 0 !important; }
        }
      `}</style>
      <div ref={wrapRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <canvas ref={canvasRef} style={{ display: "block" }} />
      </div>
      {/* 文字：內層背景色描邊隔開線框，外層 accent 霓虹光暈；hover 時光暈加強 */}
      <span
        style={{
          position: "relative",
          zIndex: 1,
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: "0.26em",
          textTransform: "uppercase",
          color: "var(--accent)",
          textShadow: active
            ? "0 0 2px var(--bg, #040c0a), 0 0 4px var(--bg, #040c0a), 0 0 10px rgb(var(--accent-rgb) / 0.95), 0 0 22px rgb(var(--accent-rgb) / 0.6), 0 0 40px rgb(var(--accent-rgb) / 0.35)"
            : "0 0 2px var(--bg, #040c0a), 0 0 4px var(--bg, #040c0a), 0 0 8px rgb(var(--accent-rgb) / 0.75), 0 0 18px rgb(var(--accent-rgb) / 0.4)",
          transition: "text-shadow 0.25s ease",
        }}
      >
        {children}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </span>
    </button>
  );
}

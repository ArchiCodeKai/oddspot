# OddSpot — Design Direction v2 (Acid / Y2K Evolution)

> **Status**: Active. Supersedes the earlier "Terminal Mint" direction for visual language while keeping the **brand voice and content rules** intact.
> **For AI assistants** (Claude Code, Cursor, etc.): when producing any new OddSpot interface, this file is the source of truth. Read `visual-design.md` for basics, then apply the overrides here.

---

## TL;DR — what changed

| Dimension | v1 (Terminal) | v2 (Acid / Y2K) |
|---|---|---|
| Mood | 穩重終端機 | 一點點壞掉的 B-grade 存檔系統 |
| Color | 黑底 + 薄荷綠 (single accent) | 4 themes, user-switchable |
| Type | Space Mono + Noto TC | unchanged ✅ |
| Visual DNA | flat UI + glow | wireframe 3D + acid stickers + film grain |
| Motion | subtle fade/slide | mascot is alive, things rotate, marquees scroll |
| Personality | quietly observant | observant **AND** a little cursed |

**Core brand voice does not change.** Chinese-first, no emoji, no hype, "系統" self-reference. Only the visual clothes got weirder.

---

## 1 · Theme system

There are **four themes**. Users switch freely from a visible toggle. All share identical token names defined in `themes.css`. Developers: **do not hardcode hex values** — always use `var(--accent)`, `var(--fg)`, etc.

| Theme | Use for | Feel |
|---|---|---|
| `terminal` | default · map · reading | 穩定的薄荷綠終端機 |
| `blueprint` | landing · onboarding · discovery moments | electric blue, 工程藍圖感 |
| `caution` | admin · warnings · submission flow | hazard yellow, 施工告示感 |
| `midnight` | focus mode · spot detail at night | 純黑白，wireframe 極致 |

Theme state is stored in `localStorage` under `oddspot-theme`.

**Category colors do NOT change per theme** — they are an information layer (8 spot types) and must stay recognisable.

---

## 2 · Visual DNA — what to add to every new screen

Pick **1–3** of these, not all at once:

### 2a. Wireframe geometry (the core new element)
- Rotating wireframe globe (use `SVG ellipses` for simple; `react-three-fiber + SphereGeometry` for real)
- Checkboard wave terrain
- Contour-line landscape
- Wireframe sphere / torus / cube as decorative sticker
- **Stroke width: 0.5–1px. No fills.** Wireframe must look fragile.

### 2b. Acid stickers (static SVG)
Scatter these at **irregular rotations (-8° to +8°)**, never aligned to a grid. Overlap slightly.
- Barcode stamps with fake coordinates (`N25°03'13.2"`)
- Fake error tags (`ERR_NO_LEGEND · archive 1998-08-13`)
- 4-point or 8-point stars
- Numbered labels (`HARD FORM / 001`, `INPUT:0`, `GLOBAL NULL`)
- Black-bordered stamps — **but only with system content** (`UNVERIFIED`, `未驗證`, `歸檔中`, archive numbers)

**裝飾物資格規則（2026-09-03 稽核後新增）**：貼紙必須是「系統裡撿到的東西」——讀數、
標籤、警告、條碼、示意圖、校準記號。**禁止**：網路梗文字（DEAL WITH IT 已移除）、
通用星芒 / 閃光、手繪表情或卡通物件。判斷法：如果它看起來是「為了可愛而畫的」，就不是酸性，
是廉價貼圖。

**一頁一個 mascot**：同一畫面只能有一個眼睛實例。Landing 的眼睛是月球（shader 瞳孔/虹膜），
所以 2D `EyeMark` 不上 landing；它留給 app 內 chrome 與 onboarding。

### 2c. Film grain + CRT scanlines
Always on, low opacity. Already in `themes.css` via `body::before` + `body::after`. Don't remove.

### 2d. Marquee tape
For footers, empty states, loading screens. Scrolls sideways with mixed system-status + poetic fragments:
`archive://taipei · 237 spots indexed · 12 disappeared this year · softly catastrophic · err_no_weird_found`

### 2e. Corners are harder, not softer
Drop most `border-radius: 16–24px`. **Default is `2px`**. Only the phone frame and hero images keep large radii. Y2K is sharp.

---

## 3 · Mascot expanded — the eye is alive

No longer just blink. Define the eye as having **moods** — use the right one for context:

| Mood | When | How |
|---|---|---|
| `scanning` | landing, idle | eyeball follows mouse cursor |
| `blinking` | default chrome | 6s interval blink (current) |
| `dizzy` | error states | figure-8 pupil motion |
| `sleepy` | empty states | upper lid droops 50% |
| `shocked` | discovery, new achievement | pupil jumps to 1.3× |
| `glitched` | loading | CRT scanline sweeps across pupil |

Implementation: all moods are SVG `<g transform>` + short CSS keyframes OR Framer Motion. Keep each under 15 lines.

---

## 4 · Opening sequence (Landing & Onboarding)

On first open / cold start, user should see:

1. **[0–1s]** black screen + grain only, system tag fades in (`sys://oddspot · booting`)
2. **[1–3s]** wireframe globe fades in, slowly rotating, centered
3. **[3–5s]** globe zooms + reorients so Taiwan is front; a single pulsing marker highlights it
4. **[5–6s]** camera pulls in until Taiwan fills half the viewport; around it, **stickers and headline fly in from different angles** (not a clean fade)
5. **[6s+]** idle — eye scans cursor, marquee scrolls, everything breathes

Users who have visited before: **skip to step 4** (use `localStorage`). Don't make returning users wait through the boot every time.

**Technical note for vibe-coding this**: `react-three-fiber` with `<Sphere wireframe />` gets 80% there. Don't build a custom shader. Don't try to make a "real" photo-realistic earth.

---

## 5 · Map cursor trail — the fix

Current implementation is janky. Replace with:

```
- Keep last 40 mouse positions in a ring buffer
- Render as SVG <polyline> OR canvas 2d path
- Each point's opacity = index / 40 (linear fade tail)
- Stroke: 1px, var(--accent)
- NO gradient, NO glow, NO smoothing — raw pixel path is more Acid
- Optional: when the trail passes over a known spot, switch to dashed + add 2–4px jitter. Feels like "signal interference."
```

---

## 6 · B-grade "cracks" — where to hide them

These are small lies the system tells. Sprinkle tastefully (not more than 1 per screen).

- Timestamps occasionally read `1998-08-13` regardless of reality
- Loading copy: `打聽中... · 有人知道但不肯說 · 有點複雜，等一下`
- Empty state: `ERR_NO_WEIRD_FOUND / 半徑內暫無登記有案之怪地`
- Spot card footer: `archive://1998-08-13 · unverified`
- Occasional impossible dates: `MONTH 13, 2026`
- "Submit successful": `已歸檔。等一下，還在想怎麼審。`

---

## 7 · What to still keep from v1

These rules carry over unchanged — don't regress them:

- **Chinese-first copy.** English is accent, not primary.
- **No emoji.** The mascot eye and ASCII / SVG stand-ins replace them.
- **44px minimum touch targets.**
- **Space Mono for brand + numbers; Noto Sans TC for reading.**
- **8 category colors stable** regardless of theme.
- **Dark is default.** Light theme is not implemented in v2 yet.
- **No "we / our".** System speaks as system.

---

## 8 · Technical implementation notes (for vibe-coding)

| Effect | Tool | Lines |
|---|---|---|
| Rotating wireframe globe | Three.js / r3f `<Sphere wireframe />` | ~30 |
| Terrain heightmap | r3f `<Plane>` + noise shader OR baked SVG | ~40 |
| Acid stickers | Static SVG in JSX | ~10 per sticker |
| Theme switch | CSS vars + `data-theme` attr | already done, see `themes.css` |
| Mascot moods | SVG + CSS keyframes OR Framer Motion | ~15 per mood |
| Cursor trail | SVG polyline + mousemove handler | ~25 |
| Marquee | CSS `@keyframes translateX(-50%)` + duplicate content | ~15 |

**Don't** hand-write custom shaders, build a real 3D city, or try to hit 60fps on low-end Android with complex Three.js scenes. Mobile should gracefully fall back to 2D SVG decorations.

---

## 9 · Reference mood boards (not literal)

- Y2K UI — but from a parallel timeline where it never stopped
- Old MTV motion graphics (1999–2003)
- Cassette inlay cards
- Public announcement signage from 1990s Taipei
- Field-recording magazine aesthetics (e.g., *The Wire*)
- NOT: cyberpunk neon, NOT: vaporwave pastel, NOT: corporate "dashboard" aesthetic

---

## 實作狀態（2026-07-20 更新）

| 功能 | 狀態 | 位置 |
|---|---|---|
| terminal 主題（薄荷綠） | ✅ 已實作 | `src/app/globals.css` |
| 4-theme token system | ✅ 已實作 | `src/app/themes.css` |
| 游標軌跡 + 點擊特效 | ✅ 已實作 | `MagneticCursor.tsx` / `MapClickEffect.tsx`；僅桌面 viewport 渲染，手機/平板完全不輸出 cursor DOM |
| 頁面進場動畫 | ✅ 已實作 | `PageTransition.tsx` / `SpotDetailShell.tsx` |
| 吉祥物 eye moods | ✅ 已實作 | `src/components/ui/Mascot.tsx`（6 種 mood） |
| 開場動畫序列 | ✅ 已實作 | landing boot 序列 + `/map` 首訪 `OnboardingOverlay.tsx`（吉祥物 + CRT 掃描線）；已登入者跳過 landing 直進 `/map` |
| Acid stickers / 貼紙 | ✅ 已實作 | `src/components/landing/AcidStickers.tsx` |
| Landing mobile globe | ❄️ 已實作並凍結（AD-10） | `GlobeSceneMobile.tsx`；landing 3D 全區維護模式，只修 bug 不再迭代 |
| 全域動作回饋 toast | ✅ 已實作 | `ActionToast.tsx` + `useActionToastStore`；收藏/行程動作帶結果入口 |
| Landing 減法整理（2026-09-03 稽核） | ✅ 已實作 | 貼紙只留系統物件（商標／錯誤標籤／`ArchiveCardS` 歸檔卡）；`CategoryLegend` 分類圖例取代 2D 眼睛；手機不掛 3D 牙齒、首次有 <768px 斷點；死碼與 4 個孤兒 GLB（~15MB）移除 |
| 重力網格（§2a wireframe geometry） | ✅ 已實作 | `GravityGrid.tsx`：2D SVG 網格朝地球高斯塌陷、半徑內貼大氣邊緣不穿球；重力中心由 GlobeScene 投影常數（z=4／fov 50／x=1.4）算出；CSS mask 左側 34→56% 漸淡讓位文字 × 橢圓暈影不佔滿版面；0.6px 線、`var(--fg)` 16%；9s 呼吸、reduced-motion 停；桌機/平板 idle 才顯示 |
| 主 CTA 地形按鈕 | ✅ 已實作 | `TerrainScanButton.tsx`：440×132（手機 100 高）2D canvas 線框山巒，無人機視角持續前飛；48×56 高度格、ridged value noise 三八度、每次 mount 換 seed；遠→近背景色填充做遮擋；文字置中靠上、800 字重、內層 bg 描邊 + 外層 accent 霓虹；hover/focus 油門 2.2→4.8 排/秒；reduced-motion 靜態一幀、分頁隱藏暫停 |
| START SCANNING 地形按鈕 | ✅ 已實作 | `TerrainScanButton.tsx`：主 CTA 放大為 360×96（手機 76 高），按鈕本體是 2D canvas 無人機視角向前飛的線框山巒；30×30 高度格、value noise 兩八度成峰、每次 mount 換 seed 山形隨機；painter's 背景色填充做近山擋遠山；hover/focus 油門 1.4→3.2 排/秒；reduced-motion 靜態一幀、分頁隱藏暫停；文字用 `--bg` 描邊避免線切字；顏色讀 `--accent`／`--bg` 並隨主題更新。標題區 bottom 18%→22% 上移；<760px 高視窗隱藏分類圖例避免相撞 |

## Files in this skill

- `src/app/themes.css` — 4-theme token system（已建立）
- `visual-design.md` — base rules (Chinese, v1 origin)

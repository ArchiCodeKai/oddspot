# 滑卡片 UI 設計

> **Status**：第一版已實作，整合在 `/map` 的探索模式中。
> **完整 spec**：[`docs/specs/2026-05-21-swipe-feature.md`](../specs/2026-05-21-swipe-feature.md)
> **模組現況**：[`.ai-context/features/swipe/_module.md`](../../.ai-context/features/swipe/_module.md)

本文件聚焦 UI 層細節（視覺、動畫、互動）。目前實作沒有獨立 `/swipe` 路由，而是在 `/map` 內用 bottom tab 切換 `map` / `swipe`，避免地圖元件切換時重載。

---

## 卡片尺寸

| 項目 | 手機 | 平板 | 桌機 |
|---|---|---|---|
| 寬度 | `min(100%, 100vw - 32px)`，避免 zoom / 窄螢幕時偏移或被裁切 | `clamp(34rem, 72vw, 48rem)`，再用 `max-width: calc(100vw - 72px)` 防裁切 | `24rem` |
| 高度（固定） | `min(520px, 70vh)` | `min(820px, 74vh)` | `min(520px, 70vh)` |
| 旋轉 | -2°（acid 截圖感） | -2° | -2° |
| border-radius | 2px（acid 硬角） | 2px | 2px |

下方還有 200vh 詳情區可內滾。

手機版 SwipeView 會替 `/map` 固定在頂部的 filter / radius 控制列預留安全高度，行程吉祥物列不再貼到最上緣被遮住。卡片 frame 使用 viewport-safe 寬度並置中，避免瀏覽器縮放或 390px 以下寬度時只看到卡片左半邊。

平板斷點（768–1279px）使用流體尺寸系統，不再只針對單一 iPad 寬度寫死。卡片會依 viewport 在 34–48rem 間縮放，toolbar 則改成置中 compact group，往下離開上方 nav，並與卡片保留 30px 左右的呼吸距離，避免行程吉祥物列與 globe button 或 filter controls 貼太近。SwipeView 自己不再渲染第二顆 filter；filter 只保留 `/map` 左上角全域按鈕。

SwipeView 左側的還原按鈕採用與底部 action rail 相同語言：預設是圓形 icon-only 按鈕，hover / focus 才顯示文字 tooltip；active 只做輕微按壓。手機版 toolbar 放在上方 nav 與卡片之間，並保留 14px 卡片間隙；平板同樣置於 nav 與卡片中間；桌機版保留吉祥物列位置，僅把 undo 縮到 37px 並水平往左靠近卡片左上角，同時維持與 `3/5` 行程文字同高。

## 底部 Action Rail

- 三顆按鈕放在卡片容器內，用 `z-index: 32` 浮在卡片底部上方，避免桌機全螢幕時看起來藏在卡片後面。
- 左右按鈕為 64px 圓形；中間「收藏」為 76px 圓形主按鈕。
- 中間加號不是細線 icon，而是寬胖圓角十字；目前行為是「只收藏」，打勾才是「收藏 + 加今日行程」。
- 按鈕不再承擔主要動畫：移除頂部短線與過強 glow，hover / focus 只顯示文字 tooltip，active 只做 `translateY(2px)` 按壓感。
- 行動結果回饋放回卡片中央：skip / 右滑打勾由 `SwipeDecisionAnimation` 播放 Lottie，但外層仍是 OddSpot 既有 2px hard-corner acid stamp；中間加號目前改成只收藏，仍沿用資料夾 intake 視覺，卡片先回到中心再縮小淡出。加號 Lottie 暫停，等後續選定資產再接。
- 手機版不在首屏顯示 action rail；使用者需要滾到卡片底部才看到三顆 68/82px 觸控按鈕。桌機版保留卡片外浮動按鈕，方便滑鼠操作。

## Lottie Decision Feedback

- 資產位置：`public/lottie/swipe/cross.json` 與 `public/lottie/swipe/check.json`。
- Runtime：`SwipeCard` mount 後會呼叫 `preloadSwipeDecisionAnimations()` 預載 player 需要的 JSON；`SwipeDecisionAnimation` 只在中央 stamp 播放 Lottie。側邊 hint 維持輕量 SVG，避免拖曳時渲染 525KB success Lottie 造成卡頓。
- 外觀規則：Lottie 只替換內層 X / check 的動態，不替換 action button 外框，也不替換中央 stamp 外框。
- 主題色：元件讀取 `--accent-rgb` / `--muted-rgb`，用 `tintLottieColors` 將 JSON 內的 shape color runtime tint；切換 `data-theme` 後下一次播放會跟著變色。
- Reduced motion：`prefers-reduced-motion` 時不播放 Lottie，回到靜態 SVG fallback。
- 觸發時機：拖曳超過 24px 先出現低透明度 edge hint；放手達 100px 閾值或點擊 skip/save 後，中央播放加速後的 1.1s 明顯 Lottie stamp，按鈕本身只保留 active 下壓。
- 手勢：`SwipeCard` 採單一 pointer swipe engine。滑鼠、手指、觸控筆都直接寫入 `x` motion value；Framer Motion 不再負責 drag 判斷，只負責 `x` 驅動的旋轉、邊緣 hint 與 flyOut 動畫。事件綁在 `.acid-card-scroll` 的 capture 階段，讓內滾容器本身先判斷水平 / 垂直意圖；水平位移超過 12px 且明顯大於垂直位移時開始 swipe，並暫時鎖住內部 `overflowY`，避免行動裝置拖曳時跟 scrollbar 搶事件。若先判定為垂直手勢，會釋放 pointer capture，讓使用者正常上下看詳情。放手後用同一個 100px 閾值判斷左 / 右滑。卡片飛出後再延遲 620ms 才切下一張，避免中央 feedback 還沒播完就卸載。

## FilterSheet

- 開啟時使用 `src/lib/motion/sheetMotion.ts` 的共用 bottom sheet motion：進場是 320/34 spring，離場用 0.2s ease-in 往下收，避免關閉時拖泥帶水。
- 關閉保留三種方式：點擊上方遮罩空白處、點 header 右側 36px X 按鈕、或從拉手條往下拖曳超過門檻。
- `prefers-reduced-motion` 時改成淡入淡出，不做大距離 y 軸位移。
- X 按鈕走 i18n `filter.close`，並保留 hover / focus 可辨識狀態。
- Filter tag hover / focus 使用 neon flicker：brightness steps、scanline 掃過、accent glow。
- 點擊 tag 時先跑 0.9s 老日光燈啟動閃爍（ignite），選中後進入低頻、極輕微的 idle flicker，模擬年久失修燈管的微弱不穩定。
- 手機沒有 hover，active / selected 狀態保留更明顯的 ignition；同時尊重 `prefers-reduced-motion` 關閉動畫。

## 手勢對應

| 手勢 | 行動 |
|---|---|
| 左滑（>100px） | pass |
| 右滑（>100px）/ 打勾 | 加收藏夾 + 加今日探險行程 |
| 中間 + 按鈕 | 只加收藏夾 |
| 上下滑 / 桌機滾輪在卡片內 | 整張卡片內滾動 |
| 撤回箭頭（chip bar） | 撤回上一張 |

**重點**：左右滑隨時可用，不會被內滾鎖住。

## 卡片內頁瀏覽

- 移除 `查看完整詳情` 按鈕；卡片本身就是可內滾詳情面板。
- 首屏保留封面圖、分類、狀態、難度、名稱；往下滾可看到查詢 / 造訪數、推薦時段、GPS、地址、最多 3 張照片。
- 卡片右側 scrollbar 採低透明 acid 樣式，滾動時提供「還有內容」的提示，但不搶主視覺。
- 詳情區提供 `導航前往 Google Maps`，這是單點即刻出發，不加入 OddSpot 路線排程；行程規劃仍由 RouteSheet 負責。

## Pointer Swipe 設定

```typescript
<div
  className="acid-card-scroll"
  style={{ overflowY: "auto", touchAction: "pan-y" }}
  onPointerDownCapture={handlePointerDown}
  onPointerMoveCapture={handlePointerMove}
  onPointerUpCapture={handlePointerEnd}
  onPointerCancelCapture={handlePointerEnd}
>
  {/* 內滾區 */}
</div>
```

關鍵：不要同時交給 Framer Motion `drag` 與內部 scroll 容器處理。OddSpot 目前只讓 pointer engine 決定水平 swipe，Framer Motion 只負責 motion value 動畫；這樣能避免手機和平板上「拖到一半被內部 scrollbar 取消」的問題。

## 卡片堆疊視覺

- 看到後面 1–2 張
- 後面卡片 `scale(0.95)` + `opacity(0.6)`
- z-index 遞減
- 拖拉前面卡片時，後面 scale 漸近 1.0（給「下一張準備好」的視覺）

## 滑動視覺反饋

- 拖過閾值（100px）：邊緣染色
  - 左滑 → 紅色 `#ff3b3b`（pass）
  - 右滑 → 綠色 `#5fd9c0`（收藏 + 加今日行程）
  - 中間 + 按鈕 → 金色 `#ffd24a`（只收藏）
- 釋放：spring 飛出（依方向）
- 撤回：spring 從畫面外飛回
- 手機與桌機拖曳中：左 / 右邊緣各有低透明度的 X / check icon 從邊緣往卡片中心滑入，越靠中心越淡，切到下一張後消失。這裡刻意不用大型 Lottie，以免拖曳路徑掉幀；桌機仍額外保留較明確的文字 stamp，讓滑鼠拖曳時判定更清楚。

## 行程計數與 TripPlanSheet

```
┌──────────────────────────────────────┐
│ [FILTER] [UNDO]        ● ● _ _ _ 2/5 │
└──────────────────────────────────────┘
```

| 狀態 | 視覺 |
|---|---|
| 空位 | sleepy 吉祥物，低透明度 |
| 有點 | 吉祥物恆亮，並以分層 idle 動作提供生命感 |
| 滿 5 個 | 5 個吉祥物全亮，+ 按鈕 toast 提示「今日行程已達上限」 |

整個行程槽可 hover / 點擊；hover 不再出現每個吉祥物的方框，也不使用外圈發光，避免把「已選數量」誤看成閃爍狀態。提示方式改為吉祥物本體微抬、眼球看向游標、文字底線變亮。mini 吉祥物必須沿用設計稿原始單眼輪廓與大眼睛比例，不新增雙眼或新角色；動態只拆到原始 eye SVG 的外殼、眼眶、瞳孔圖層：外殼 squash / stretch、落地反震、瞳孔位移、眼眶微傾，避免整個 SVG 像貼紙一樣平移。此 sheet 讀取 `useRoutePlannerStore.selectedSpots`，可移除或清空選點；CTA 會切回地圖並開啟既有 RouteSheet，讓使用者繼續「路徑規劃 / 最佳化 / START」。

目前路線會持久化到 localStorage key `oddspot-route`，重新整理後仍保留。

## Acid sticker 元素

- 卡片右上角：`[001/237]` 編號（archive 風格）
- 卡片左下角：mini barcode sticker
- 邊緣偶爾出現 `archive://taipei` 章戳（每 3 張隨機一張）

## 空狀態

```
┌──────────────────────────────────┐
│                                  │
│   所有怪地都被你看過了           │
│   試試擴大半徑                    │
│                                  │
│       [ 回地圖調整  ]            │
│                                  │
└──────────────────────────────────┘
```

文案 acid 化詳見 spec 第八章。

## 資料來源

- 探索卡片資料：沿用 `/api/spots`
- 篩選條件：`useMapStore.filters`
- 收藏：`useSavedStore`
- 路線選點：`useRoutePlannerStore.selectedSpots`
- swipe session：`useSwipeStore.skippedIds` + `lastSkippedId`

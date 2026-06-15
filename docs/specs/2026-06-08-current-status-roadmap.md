# OddSpot 目前狀態與下一步 Roadmap

日期：2026-06-15

本文件只討論進入地圖頁後的產品體驗與工程狀態，不討論 landing page 視覺。

## 一、目前已完成的主功能

### 1. 地圖探索

- `/map` 已是主要產品入口。
- 地圖已從 Google Maps 方向改為 Mapbox + `react-map-gl/mapbox`。
- 四套主題地圖 JSON 已存在，透過 `style-loader.ts` 載入。
- 支援使用者位置、附近景點、marker、popup。
- Filter / Radius 第一版已接上 store 與 API。

### 2. 滑卡片探索

- 滑卡片已整合在 `/map` 的探索模式，不另開 `/swipe` 路由。
- 桌機 / 平板 / 手機 RWD 已做多輪調整。
- 卡片支援內部滾動看更多資料。
- 左滑 / 叉叉：略過。
- 中間 +：只收藏。
- 右滑 / 打勾：收藏並加入今日行程。
- 目前仍建議做真機 QA，尤其是 iOS Safari / Android Chrome / iPadOS Safari 的手勢穩定度。

### 3. 今日行程與路線

- `useRoutePlannerStore` 是路線選點的 single source of truth。
- 地圖 popup、滑卡片、TripPlanSheet、RouteSheet 共用同一份選點資料。
- RouteSheet 支援拖曳排序、照目前順序規劃、最佳化重排。
- RoutePolyline / RouteWaypointMarker 已能在地圖顯示路線。
- ExternalNavSheet 已可跳外部地圖服務。

### 4. 認證與收藏

- NextAuth v5 已串 Google / LINE OAuth。
- `useSavedStore` 支援未登入 localStorage 收藏。
- `/api/saved`、`/api/saved/[spotId]`、`/api/saved/sync` 已實作。
- `ClientAuthProvider` 會在登入後透過 `useAuthSync` 同步 Guest 收藏。

### 5. 投稿與審核

- `/submit` 需要登入。
- 投稿會建立 `status: "pending"`，公開 `/api/spots` 排除 pending。
- 投稿支援 Google Maps 貼上解析座標。
- 投稿照片已有前端壓縮 + `/api/uploads/spots` + Vercel Blob URL 精簡版。
- `/admin` 與 admin API 已有第一版 pending 審核。
- 已補投稿防濫用 MVP：短時間 rate limit、每日投稿上限、每日照片上傳上限、duplicate check。
- Admin reject 已改為清理 Blob 圖片並保留 `rejected` 狀態，讓使用者可以回看投稿結果。
- `/admin` 已補 production env / DB health check 與 Blob smoke test。
- `/saved` 個人收藏頁與 `/submissions` 我的投稿狀態頁已完成第一版。

## 二、目前最大 UX 缺口

### 1. 使用者容易不知道「下一步去哪裡」

目前地圖、滑卡、收藏、行程、投稿都已存在，但入口很多，使用者可能不知道：

- 收藏後去哪裡看？（已補 `/saved`，仍可再強化入口提示）
- 投稿後怎麼知道審核狀態？（已補 `/submissions`，仍缺 reject reason）
- 滑卡打勾與中間 + 的差異是什麼？
- RouteSheet 滿 5 點後為什麼不能再加？

這不是單一 UI bug，而是資訊架構（Information Architecture）還需要收斂。

### 2. 投稿公開前的安全防線不足

目前已修 pending 外洩，並補上基礎防濫用：

- rate limit / 每日投稿上限：已完成 MVP。
- duplicate check：已完成同名與近座標檢查。
- Blob orphan cleanup：admin reject 已清該 spot 圖片。
- reject reason：仍未完成。

這些比繼續加新功能更重要，因為它們會影響資料品質與長期維護成本。

### 3. 手機 / 平板真機流程尚未完整驗證

之前已修多輪 RWD 與 swipe 手勢，但 DevTools 模擬不等於真機。正式展示前至少要手動跑：

- iPhone Safari：滑卡、卡片內滾、filter sheet、RouteSheet 下滑收合。
- Android Chrome：滑卡與外部 Google Maps。
- iPadOS Safari：平板卡片尺寸、toolbar、RouteSheet。
- 桌機 Chrome：theme switch、route polyline、外部導航。

## 三、建議下一步

### P0：先修流程與安全，不急著加大功能

1. **Production 驗證**
   - Vercel env：`AUTH_*`、`DATABASE_URL`、`NEXT_PUBLIC_MAPBOX_TOKEN`、`BLOB_READ_WRITE_TOKEN`。
   - Google / LINE callback URL。
   - Vercel Blob upload smoke test。
   - Production DB migration。
   - 目前已新增 `/admin` 檢查入口；部署後仍需在 production 實際點一次確認。

2. **投稿防濫用**
   - 每位使用者每日投稿上限：已完成。
   - 每位使用者每日圖片上傳上限：已完成 server memory MVP。
   - 同名 / 近座標 duplicate warning：已完成。
   - Admin reject 時刪除 Blob 圖片並標記 rejected：已完成。

3. **RouteSheet 小 UX 收斂**
   - 滿 5 點時顯示 disabled「已達 5 點上限」：已完成。
   - Saved picker 空狀態改成可行動提示：已完成。
   - iOS Google Maps app scheme 失敗時 fallback 到 web URL。

### P1：讓使用者不迷路

4. **個人收藏頁**
   - 最小版已完成：列表、移除收藏、加入今日行程。
   - 對面試也有幫助，因為能展示 auth + API + state + UX closure。

5. **我的投稿狀態**
   - 第一版已完成，顯示 pending / active / rejected。
   - 待補：reject reason 與審核通知。

6. **景點詳情頁資訊補強**
   - 照片最多 3 張。
   - 地址 / GPS / 推薦時段 / 查詢或造訪數。
   - 明確 CTA：導航、收藏、加入今日行程。

### P2：可以之後再做

- 到訪驗證。
- 足跡地圖 / 熱力圖。
- 檢舉與回報。
- 週期性 Blob cleanup。
- 更完整的相簿 / 收藏夾分類。
- 更多 acid/Y2K 視覺 polish。

## 四、不建議現在做的功能

- 大型社群動態牆、留言、追蹤。
- 太複雜的收藏夾系統。
- AI 圖片審核或 AI 內容生成。
- 過多動畫細節，直到核心流程與真機手勢穩定。

理由：這些會拉高資料模型、審核、安全與維護成本，但不一定能讓目前 MVP 更清楚。

## 五、面試展示角度

如果目標是作品展示，不需要硬塞很多功能。面試官更容易看出價值的是：

- 你能把 Mapbox、Auth、DB、Blob、API、localStorage sync 串成完整流程。
- 你有 pending 審核與公開 API 白名單，表示你懂資料安全邊界。
- 你能說明為什麼先做個人收藏 / 投稿狀態，而不是先做社群功能。
- 你有 RWD、手勢、sheet motion、外部導航 fallback 這些真實產品細節。

比較不專業的風險點：

- 文件寫待實作，但程式碼其實已完成，會讓接手者誤判。
- 投稿圖片只新增、不清理，長期會造成 Blob 成本與資料品質問題。
- 公開 API 沒有白名單或 rate limit，容易把 pending / spam 暴露出去。
- 使用者完成收藏或投稿後沒有回看入口，產品流程斷掉。

## 六、推薦接下來的實作順序

1. 先在 Vercel production 用 `/admin` 實際跑 env / DB / Blob smoke test，並核對 Google / LINE callback。
2. 補 P1 剩餘 UX closure：reject reason、投稿失敗 UI、iOS 外部導航 fallback。
3. 最後做 polish：景點詳情頁照片、真機手勢微調、acid marker / radar 等視覺加分。

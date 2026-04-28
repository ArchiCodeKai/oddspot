# OddSpot · 未來功能清單

依優先序，未來可以慢慢加進來的功能。打勾的是這次 Flow Demo 已經處理的。

## 🟢 這次 Flow Demo 已加

- [x] **點 pin 改成 bottom sheet**（不換 route）
  - peek 30%：封面、名字、距離、類別、收藏、導航
  - 上滑 / 點卡片 → 全屏詳情
  - 下拉關閉，地圖位置不丟失
- [x] **Swipe 上滑看詳情**手勢
- [x] **Swipe 倒回**按鈕（救回剛剛滑掉的 spot）
- [x] **Swipe onboarding** 手勢提示（首次進入 2 秒淡出）
- [x] **Swipe 卡片上類別 badge → 一鍵 toggle 篩選**
- [x] **主題色完整統一**到 themes.css v3（terminal/blueprint/caution/midnight）
- [x] **底色從純黑改鐵灰**（降低賽博龐克感）

## 🟡 高優先 — 下次建議優先加

### 離線模式
已收藏景點的圖 + 資料 cache 到 localStorage / IndexedDB。
**為什麼重要**：探險現場常常沒訊號，這是這個 app 的核心使用場景。
**怎麼做**：
- Service Worker cache 收藏景點的封面圖
- IndexedDB 存 spot detail json
- UI 加「離線可用」標記（在收藏列表的卡片右下角）

### 「最近看過」歷史
使用者 swipe 過、想再看的時候找不到。
**怎麼做**：
- `useHistoryStore` (zustand) 紀錄最近 30 個看過的 spotId
- 在地圖頁加「最近」tab，或在個人頁加歷史區
- 注意：要區分「skip 過的」和「看過詳情的」

### Map cluster（聚落）
zoom out 時 pin 太多會擠在一起。
**怎麼做**：
- 用 `supercluster` 套件（react-leaflet 有對應 helper）
- cluster 顯示為帶數字的圓圈（accent 色）
- 點 cluster → zoom in 一級

## 🟠 中優先

### 景點打卡 / 上傳照片
**為什麼重要**：UGC 是長期內容護城河。
**怎麼做**：
- 詳情頁加「我去過」按鈕 → 開相機 / 選相簿
- 照片上傳到 Supabase storage
- 詳情頁底部新增「最近打卡」區（時間軸 + 縮圖）
- 注意：要做 moderation queue（avoid spam / NSFW）

### 時間軸（這個景點 1998 / 2010 / 2024 的樣子）
跟你的「12 disappeared this year」slogan 強烈呼應。
**怎麼做**：
- 詳情頁加 timeline 元件（左側年份 vertical line，右側照片+短描述）
- 資料來源：每個 spot 一個 `archives: [{ year, image, note }]` 陣列
- 視覺：黑白 → 彩色漸進，最後一張照片標 "current" 或 "lost"
- 連結到首頁的 marquee（"今年消失：12" 點下去 → 顯示這 12 個的 timeline）

### Trip plan 路線優化
目前 5 個 spot 是清單，沒有最佳路徑。
**怎麼做**：
- 用 OSRM / Mapbox Directions API 計算
- TripPlanSheet 顯示總距離 + 預估時間 + 路線地圖
- 加「依距離排序」按鈕

## 🔵 低優先 / nice-to-have

### 分享單一景點到社群
- 詳情頁加分享按鈕
- 自動產生 OG image（`/og/[id]` 路由，1200×630）
- OG image 模板：景點封面 + 名字 + odd index + OddSpot 浮水印

### 隨機探索按鈕
你已經有 `RandomSpotButton.tsx`，可以擴充：
- 加「附近的奇異」「全台奇異」「最近消失中」三種隨機策略
- 點下去 → 黑洞動畫 → 跳出一張全屏卡片

### 主題自動切換
- caution → 白天
- terminal → 黃昏
- midnight → 凌晨
- blueprint → 用戶手動
依使用者本地時間自動切，但允許手動覆蓋。

### 通知 / 推播
- 「你收藏的景點被回報為 disappeared」
- 「你附近有新景點被加入」
- 需要 PWA + Web Push API

### 成就 / 徽章
- 「集滿 8 個分類」「探訪超過 30 個」「貢獻者：上傳了 5 個景點」
- 加在個人頁，不要做得太遊戲化（會破壞 archive 氣質）

## ⚪ 設計系統 / 工程後續

- [ ] 把 themes.css v3 的色票 sync 回 codebase（Tailwind config + CSS variables）
- [ ] 移除程式碼裡所有 `CATEGORY_COLORS` 的繽紛色（保留 status 色，類別 badge 只用 accent + 灰階）
- [ ] 統一 border-radius 規範（已在 themes.css 定義 --radius-xs/sm/md/lg/xl，要逐一替換）
- [ ] 把字體從 Space Mono 改成 JetBrains Mono（可讀性更好）
- [ ] OnboardingOverlay 改用本檔案 demo 的手勢動畫版本

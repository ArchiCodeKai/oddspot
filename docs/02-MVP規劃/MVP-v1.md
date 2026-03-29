# MVP v1 規劃

## Step 0：開發順序

按照以下順序開發，不跳步：

1. **Schema 修正 + Seed Data**
   - 補齊 Spot 欄位（status, difficulty, legend 等）
   - 準備 10 個台北景點資料 + 本地靜態圖
   - 跑 `npx prisma migrate dev`

2. **地圖頁**（@vis.gl/react-google-maps）
   - 取得用戶位置
   - 顯示附近景點標記
   - 點擊標記顯示 SpotPopup

3. **景點詳情頁**
   - `/spots/[id]` 頁面
   - 完整景點資訊顯示

4. **滑卡片 + Guest mode**
   - Framer Motion 滑動動效
   - localStorage 收藏

5. **NextAuth + 收藏同步**
   - Google / GitHub OAuth
   - 登入後 sync localStorage 收藏到後端

## v1 功能清單

### 包含

- 地圖瀏覽（含分類顏色標記）
- 景點 Popup（名稱、分類、狀態、難度）
- 景點詳情頁
- 滑卡片探索
- Guest mode 收藏（localStorage）
- OAuth 登入
- 收藏同步

### 不包含（移到 v2）

- 到訪驗證
- 足跡地圖 / 熱力圖
- 使用者上傳照片
- Cron Job 自動驗證
- 評分機制（rating 欄位存在但 UI 不顯示）

## v1 景點資料

10 筆台北奇特景點作為 seed data，涵蓋各分類。
圖片使用本地靜態圖 `/public/spots/`（佔位符，之後補真實圖片）。

## v2 預計功能

- 到訪驗證（用戶上傳照片）
- Cloudinary 圖片上傳
- 足跡地圖
- 熱力圖

# OddSpot 部署指南

## 📋 部署檢查清單

- [ ] GitHub Repository 已建立
- [ ] 註冊 Vercel 帳號
- [ ] 設定 Neon PostgreSQL 資料庫
- [ ] 設定 Google OAuth 憑證
- [ ] 準備景點圖片
- [ ] 部署到 Vercel
- [ ] 執行資料庫遷移

---

## 🗄️ 步驟 1：建立 Neon PostgreSQL 資料庫（5 分鐘）

### 1.1 註冊 Neon
1. 前往 https://neon.tech
2. 點擊「Sign Up」→ 使用 GitHub 帳號登入（最快）
3. 免費方案已自動選好，直接進入

### 1.2 建立資料庫
1. 點擊「Create a project」
2. 設定：
   - **Project name**: `oddspot-db`
   - **PostgreSQL version**: 16（預設即可）
   - **Region**: 選最近的（建議 `Asia Pacific (Tokyo)`）
3. 點擊「Create project」

### 1.3 取得連線字串
建立完成後，你會看到「Connection string」，複製它（格式如下）：
```
postgresql://username:password@ep-xxx-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

**⚠️ 重要：暫時先存在記事本，等等會用到**

---

## 🔐 步驟 2：設定 Google OAuth（10 分鐘）

### 2.1 進入 Google Cloud Console
1. 前往 https://console.cloud.google.com
2. 登入你的 Google 帳號
3. 點擊左上角「選取專案」→「新增專案」
4. 專案名稱：`OddSpot`，點擊「建立」

### 2.2 設定 OAuth 同意畫面
1. 左側選單 → 「APIs & Services」 → 「OAuth consent screen」
2. 選擇「External」（外部）→ 點擊「建立」
3. 填寫資訊：
   - **App name**: `OddSpot`
   - **User support email**: 你的 email
   - **Developer contact**: 你的 email
4. 其他欄位可以先不填，點擊「儲存並繼續」
5. Scopes 頁面 → 直接點擊「儲存並繼續」
6. Test users 頁面 → 點擊「+ ADD USERS」，加入你的 Google email（測試用）
7. 點擊「儲存並繼續」→ 完成

### 2.3 建立 OAuth 憑證
1. 左側選單 → 「Credentials」（憑證）
2. 點擊「+ CREATE CREDENTIALS」→ 選擇「OAuth client ID」
3. 應用程式類型：選「Web application」
4. 名稱：`OddSpot Web Client`
5. **已授權的重新導向 URI**（這很重要！）：
   ```
   http://localhost:3000/api/auth/callback/google
   ```
   先填這個本地測試用的，部署後再加線上的
6. 點擊「建立」

### 2.4 取得憑證
建立完成後會跳出視窗顯示：
- **Client ID**：`xxx.apps.googleusercontent.com`
- **Client Secret**：`GOCSPX-xxx`

**⚠️ 重要：複製這兩個值，等等會用到**

---

## 🚀 步驟 3：部署到 Vercel（5 分鐘）

### 3.1 註冊 Vercel
1. 前往 https://vercel.com
2. 點擊「Sign Up」→ 使用 GitHub 帳號登入
3. 授權 Vercel 存取你的 GitHub repositories

### 3.2 Import 專案
1. Vercel Dashboard → 點擊「Add New...」→ 「Project」
2. 找到你的 `oddspot` repository → 點擊「Import」
3. **Configure Project** 頁面：
   - **Framework Preset**: Next.js（應該自動偵測）
   - **Root Directory**: `./`（預設即可）
   - **Build Command**: `npm run build`（預設即可）

### 3.3 設定環境變數
在「Environment Variables」區塊，新增以下變數：

```env
# 資料庫（使用剛剛 Neon 給的連線字串）
DATABASE_URL=postgresql://username:password@ep-xxx.neon.tech/neondb?sslmode=require

# NextAuth（需要生成 secret）
AUTH_SECRET=先隨便填一個32字元的字串，等等會改
AUTH_GOOGLE_ID=剛剛 Google 給的 Client ID
AUTH_GOOGLE_SECRET=剛剛 Google 給的 Client Secret

# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=你的 Maps API Key（如果還沒有就先留空）
```

**如何生成 AUTH_SECRET：**
在你的終端機執行：
```bash
openssl rand -base64 32
```
複製輸出結果，填入 `AUTH_SECRET`

### 3.4 開始部署
點擊「Deploy」→ 等待 2-3 分鐘

部署完成後，你會得到一個網址，例如：
```
https://oddspot-xxx.vercel.app
```

**⚠️ 先不要急著測試，還有一個步驟！**

---

## 🔄 步驟 4：更新 Google OAuth 設定

### 4.1 加入正式網址
1. 回到 Google Cloud Console → Credentials
2. 點擊你剛建立的「OddSpot Web Client」
3. 在「已授權的重新導向 URI」加入：
   ```
   https://oddspot-xxx.vercel.app/api/auth/callback/google
   ```
   （記得改成你的 Vercel 網址）
4. 點擊「儲存」

---

## 🗃️ 步驟 5：執行線上資料庫遷移

### 5.1 在本地連接線上資料庫
1. 建立一個臨時環境變數檔 `.env.production.local`：
   ```env
   DATABASE_URL="你的 Neon 連線字串"
   ```

2. 執行 Prisma 遷移：
   ```bash
   npx prisma migrate deploy
   ```

3. 執行 Seed 資料（10 個景點）：
   ```bash
   npx prisma db seed
   ```

### 5.2 驗證資料
執行 Prisma Studio 檢查：
```bash
npx prisma studio
```
應該可以看到 10 個景點資料。

---

## 📸 步驟 6：上傳景點圖片

### 選項 A：使用 Cloudinary（推薦，免費）
1. 註冊 https://cloudinary.com（免費 25GB）
2. 上傳 10 個景點圖片
3. 取得圖片 URL，更新資料庫的 `images` 欄位

### 選項 B：放在 Vercel（簡單但不推薦）
1. 圖片放在 `/public/spots/` 下
2. 推送到 GitHub
3. Vercel 會自動重新部署

**建議：先用選項 B 快速測試，未來再遷移到 Cloudinary**

---

## ✅ 步驟 7：測試上線網站

1. 前往你的 Vercel 網址：`https://oddspot-xxx.vercel.app`
2. 測試以下功能：
   - [ ] 首頁載入正常
   - [ ] 地圖顯示景點標記
   - [ ] 點擊標記顯示彈出視窗
   - [ ] 景點詳情頁顯示正常
   - [ ] 右上角點擊「登入」→ Google OAuth 正常
   - [ ] 登入後點擊收藏 → 重新整理後收藏狀態保留
   - [ ] 滑卡片模式正常

---

## 🎯 網域設定（選擇性）

### 免費方案：使用 Vercel 提供的子網域
你已經有了：`oddspot-xxx.vercel.app`（免費、有 SSL）

### 如果你想要自己的網域（例如 `oddspot.com`）
1. 購買網域（推薦平台）：
   - **Namecheap**：約 $10/年（.com）
   - **Cloudflare**：約 $10/年（成本價）
   - **GoDaddy**：約 $15/年
2. Vercel Dashboard → Project Settings → Domains
3. 輸入你的網域 → 按照指示設定 DNS

**我的建議：先用免費的 `.vercel.app`，等確定要長期經營再買網域**

---

## 🐛 常見問題

### Q1: 部署後出現「Internal Server Error」
**原因**：通常是環境變數沒設定好
**解決**：
1. Vercel Dashboard → Project Settings → Environment Variables
2. 檢查 `DATABASE_URL` 是否正確
3. 重新部署：Deployments → 最新的 → 點擊「...」 → Redeploy

### Q2: Google 登入後跳回首頁但沒登入成功
**原因**：OAuth redirect URI 沒設定對
**解決**：
1. 檢查 Google Cloud Console → Credentials
2. 確認有加入 `https://your-domain.vercel.app/api/auth/callback/google`
3. 確認 `.env` 的 `AUTH_GOOGLE_ID` 和 `AUTH_GOOGLE_SECRET` 正確

### Q3: 地圖不顯示
**原因**：Google Maps API Key 沒設定
**解決**：
1. 到 Google Cloud Console → APIs & Services → Credentials
2. 建立「API key」
3. 啟用「Maps JavaScript API」
4. 在 Vercel 環境變數加入 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

---

## 📝 後續維護

### 每次更新程式碼
1. 修改完程式碼
2. `git add .` → `git commit -m "描述"` → `git push`
3. Vercel 會自動部署（約 2-3 分鐘）

### 更新資料庫 Schema
1. 修改 `prisma/schema.prisma`
2. 本地測試：`npx prisma migrate dev`
3. 推送到 GitHub
4. 在 Vercel 部署完成後，執行：
   ```bash
   DATABASE_URL="線上資料庫URL" npx prisma migrate deploy
   ```

---

## 💰 成本估算

| 項目 | 免費方案 | 付費升級（如果需要）|
|------|---------|-------------------|
| Vercel 部署 | ✅ 免費（100GB 流量/月）| $20/月（Pro）|
| Neon PostgreSQL | ✅ 免費（0.5GB）| $19/月（1GB）|
| Google OAuth | ✅ 免費 | 免費 |
| Google Maps API | ✅ 免費（$200/月額度）| 超過才計費 |
| 網域（選擇性）| ❌ | $10/年 |

**總結：完全免費就能上線！**

---

## 🎉 完成！

恭喜你完成 OddSpot 的部署！

有任何問題隨時問我 :)

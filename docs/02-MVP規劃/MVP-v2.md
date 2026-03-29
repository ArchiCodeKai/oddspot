# MVP v2 規劃（草稿）

## 前提條件
MVP v1 完整完成後才開始。

## 核心新功能

### 到訪驗證
- 景點詳情頁加「我已到達」按鈕
- 驗證邏輯：目前座標距景點 100m 內 → 允許打卡
- 成功後寫入 VisitedSpot 記錄
- 更新 Spot.visitCount（+1）

### 用戶上傳照片
- 到訪驗證成功後，可上傳照片
- 使用 Cloudinary（免費方案足夠 v2）
- 圖片 URL 存入 VisitedSpot.photos（JSON string）
- 可選：用戶上傳的照片加入 Spot.images（需審核機制）

### 足跡地圖
- 個人頁：顯示去過的景點地圖
- Google Maps Heatmap Layer
- 依賴 VisitedSpot 資料

## Schema 變動（v2 預計）

```prisma
model VisitedSpot {
  // ... 現有欄位 ...
  photos String? // JSON string: ["cloudinary_url"]
  note   String?
}
```

## 技術挑戰

- 背景定位（Geofencing）：iOS 限制嚴格，v2 先用「手動觸發」方式
- Cloudinary：需設定 upload preset 和 API key
- 照片審核：v2 先不做審核，直接顯示（低風險 side project）

# 景點詳情頁設計（Step 3）

## 路由
`/spots/[id]`

## 資料來源
`GET /api/spots/[id]`（待實作）

## 頁面區塊

### Hero 區
- 圖片輪播（images JSON 陣列）
- 返回按鈕（← 回地圖）

### 基本資訊
- 名稱（中 + 英）
- 分類 badge + 狀態 badge + 難度
- 地址 + 距離

### 描述
- description（中文）
- 傳說 / 來由（legend，如有）

### 實用資訊
- 推薦到訪時段（recommendedTime）

### 行動按鈕
- 收藏按鈕（useSavedStore）
- 一鍵導航（opens Google Maps）

### v2 預留區域
- 「我已到達」打卡按鈕（Step v2）
- 用戶上傳照片牆（Step v2）

## API 設計

```typescript
// GET /api/spots/[id]
// Response: ApiResponse<Spot>（完整欄位，不是 SpotMapPoint）
```

## 導航至 Google Maps

```typescript
const openNavigation = (lat: number, lng: number, name: string) => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${name}`;
  window.open(url, "_blank");
};
```

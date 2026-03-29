# 專案結構說明

## src/ 目錄

```
src/
├── app/                    # Next.js App Router
│   ├── api/
│   │   └── spots/          # GET /api/spots
│   ├── blob-test/          # BlobEffect 測試頁
│   ├── map/                # 地圖主頁
│   ├── spots/[id]/         # 景點詳情頁
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx            # Landing page
├── components/
│   ├── map/                # 地圖相關元件
│   │   ├── MapView.tsx     # 地圖容器（含 APIProvider）
│   │   ├── SpotMarker.tsx  # 景點標記
│   │   └── SpotPopup.tsx   # 點擊標記後的 popup
│   └── ui/                 # 通用 UI 元件
│       └── BlobEffect.tsx
├── lib/
│   ├── constants/
│   │   ├── categories.ts   # SpotCategory 型別 + CATEGORY_OPTIONS
│   │   ├── radius.ts       # 搜尋半徑選項
│   │   ├── routes.ts       # 路由常數 ROUTES
│   │   └── status.ts       # SpotStatus 型別 + 標籤/顏色
│   └── db.ts               # Prisma singleton
├── services/               # API 呼叫封裝（待實作）
├── store/                  # Zustand stores（待實作）
└── types/
    ├── api.ts              # ApiResponse<T>
    └── spots.ts            # Spot, SpotCard, SpotMapPoint 等
```

## prisma/

```
prisma/
├── migrations/             # 自動產生的遷移檔
├── prisma.config.ts        # Prisma 7 設定（seed 指令）
├── schema.prisma           # 資料模型定義
└── seed.ts                 # 10 筆台北景點資料
```

## public/

```
public/
└── spots/                  # 景點靜態圖片（v1 佔位符）
```

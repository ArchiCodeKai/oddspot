# store/

Zustand stores。一個 feature 一個 store。

| Store | 用途 |
|---|---|
| `useAppStore` | 全站 theme 切換（terminal / blueprint / caution / midnight） |
| `useMapStore` | 地圖頁狀態（filter、selectedSpot 等） |
| `useSavedStore` | 使用者收藏（Guest mode localStorage + 登入後同步後端） |
| `useSwipeStore` | 滑卡片頁狀態（Step 4） |
| `useLocaleStore` | 語系切換 |
| `useLoginPromptStore` | 登入提示 modal 顯示控制 |
| `useJawMoonStore` | 桌機月球咬合動畫跨 Canvas 通訊（將來會評估改用 module-level mutable） |

詳細設計見 `docs/04-狀態管理/store-design.md`。

# MVP v1 現況與收斂規劃

最後更新：2026-06-08

本文件描述「目前實際已完成到哪裡」，不是最早期的開發想像。下一步優先順序以
[`docs/specs/2026-06-08-current-status-roadmap.md`](../specs/2026-06-08-current-status-roadmap.md)
為準。

## 目前完成狀態

| 模組 | 狀態 | 說明 |
|------|------|------|
| Schema + Seed Data | ✅ 完成 | Spot / User / SavedSpot / Auth 相關 schema 已可支援目前功能 |
| 地圖頁 | ✅ 主功能完成 | 已改為 Mapbox + `react-map-gl/mapbox`，支援 theme style JSON |
| 地圖篩選 | ✅ 第一版完成 | 半徑、分類、狀態、難度已串 API 與 store |
| 景點詳情頁 | ✅ 第一版完成 | `/spots/[id]` 可顯示基本資訊、描述、legend、收藏與導航 |
| 滑卡片探索 | ✅ 第一版完成 | 整合在 `/map` 的探索模式，不另開 `/swipe` 路由 |
| Guest mode 收藏 | ✅ 完成 | localStorage 收藏，登入後可 sync |
| NextAuth | ✅ 功能完成 | NextAuth v5 + Google / LINE OAuth，Production callback 待驗證 |
| 收藏同步 | ✅ 完成 | `/api/saved`、`/api/saved/[spotId]`、`/api/saved/sync` 已實作 |
| 多點路線規劃 | ✅ 主功能完成 | RouteSheet、拖曳排序、最佳化、外部導航 deep link 已完成 |
| 投稿 | ✅ 精簡版完成 | pending 防漏、Google Maps 貼上解析、照片壓縮 + Vercel Blob URL |
| Admin 審核 | ✅ 第一版完成 | 可查看 pending spot、approve 或 reject |

## 目前核心 UX 流程

1. 使用者進入 `/map`，看到附近景點與地圖控制列。
2. 使用者可用 filter / radius 縮小探索範圍。
3. 使用者可在地圖點 marker 看 popup，或切到探索模式滑卡片。
4. 滑卡片中：
   - 叉叉 / 左滑：略過。
   - 中間 +：只收藏。
   - 打勾 / 右滑：收藏並加入今日行程。
5. 使用者可到 RouteSheet 調整行程點順序、直接規劃路線，或按最佳化重排。
6. 使用者可從 ExternalNavSheet 跳到 Google Maps / Apple Maps / web maps。
7. 登入前收藏會先存在 localStorage；登入後自動同步到後端。
8. 使用者可投稿新景點，景點先進 pending，Admin 審核通過後才公開。

## 下一步優先順序

### P0：正式公開前應先修

- Production env / OAuth callback / Blob token / DB migration 驗證。
- 投稿與圖片上傳加上 rate limit 或每日上限。
- Admin reject 時補 Blob cleanup，避免孤兒圖片佔空間。
- RouteSheet 小 UX：滿 5 點時顯示 disabled「已達 5 點上限」、Saved picker 空狀態、iOS Google Maps fallback。
- 手機 / 平板 / 桌機真機 QA：滑卡手勢、filter sheet、RouteSheet 收合、外部導航。

### P1：讓使用者不迷路

- 個人收藏頁或收藏清單入口。
- 我的投稿狀態頁：pending / approved / rejected。
- 投稿 duplicate check：同名或座標太近時提醒可能已存在。
- 景點詳情頁補照片展示與更明確的「加入行程 / 導航」行動。

### P2：可延後的擴充

- 到訪驗證。
- 足跡地圖 / 熱力圖。
- 檢舉與社群回報。
- 週期性清理未綁定 spot 的 Blob 檔。
- 更完整的個人紀念相簿或收藏夾分類。

## 目前不建議先做

- 大型社群動態牆、留言系統、追蹤功能。
- 過早做複雜收藏夾分類。
- 大量新增動畫 polish，直到核心流程不迷路、真機手勢穩定後再做。
- 付費雲端圖片方案；目前 Vercel Blob public store 對個人專案與低流量投稿已足夠，先控制上傳大小與數量。

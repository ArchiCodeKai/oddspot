# 編碼規範

## TypeScript
- strict mode，不使用 `any`（例外：Prisma adapter 強制需要時加 eslint disable comment）
- 所有函數、元件都要有明確型別
- API 回應使用 `ApiResponse<T>` 包裝

## 格式
- 2 空格縮排
- 雙引號字串
- 箭頭函數優先於 function 關鍵字
- 解構賦值優先於屬性訪問

## 命名
- 元件：PascalCase（`SpotMarker`）
- 函數/變數：camelCase（`handleMarkerClick`）
- 常數：camelCase 或 UPPER_SNAKE_CASE 皆可
- 型別/介面：PascalCase（`SpotMapPoint`）
- 檔案名：與主要 export 同名

## import 順序
1. React 相關
2. 第三方套件（next, framer-motion 等）
3. 本地 store（@/store/）
4. 本地 hooks
5. 本地元件（@/components/）
6. 本地 lib / services（@/lib/, @/services/）
7. 本地 types（@/types/）

## 路徑別名
- 統一使用 `@/` 代表 `src/`
- 禁止使用相對路徑 `../../`

## 元件結構順序
1. `"use client"` 宣告（如需要）
2. import 語句
3. 常數定義（在元件外）
4. interface / type 定義
5. 元件函數
6. export

## 註解規範
- 使用簡潔中文
- 不使用 emoji（顯得太 AI 化）
- 只在邏輯不自明時加註解
- TODO 格式：`// TODO Step N — 說明`

## 錯誤處理
- API 呼叫一律用 try-catch
- 錯誤訊息使用繁體中文
- console.error 只在開發期使用，正式環境移除

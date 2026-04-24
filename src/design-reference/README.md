# src/design-reference/ 資料夾使用指南

## 用途
本資料夾存放所有設計原件與 Huashu Design 迭代版本，
**是視覺層的 Source of Truth**，不是可編譯的程式碼。

Next.js 建置流程不會匯入此資料夾的內容（因為沒有任何 .ts/.tsx import 進來），
但如需完全排除編譯掃描，可於 `next.config.ts` 或 `.gitignore` 視需求配置。

## 資料夾結構

- `claude-design-source/` — Claude Design 匯出的原始設計系統（**不可修改**）
  - `OddSpot Design System/` — 解壓後的專案根目錄（路徑含空白，引用時記得加引號）
    - `themes.css` — 4 主題 token 系統（權威色票）
    - `colors_and_type.css` — 色彩與字型 token 定義
    - `preview/component-*.html` — 各元件獨立預覽檔
    - `ui_kits/MobileKit_x4Themes.html` — 完整 mobile UI kit
    - `Acid Landing.html` / `Globe Intro.html` / `Mascot Moods.html` — 主要頁面原型
    - `DESIGN_DIRECTION_v2.md` — 原版設計方向文件
- `huashu-iterations/` — 用 Huashu Design skill 產出的迭代版本
  - 命名規則：`v{N}-{簡短描述}/`，例：`v1-lighter-scanlines/`
- `CHANGELOG.md` — 每次迭代的變更紀錄（建議後續建立並逐筆補入）

## 給 Claude Code 的指令

實作新元件或頁面時：

1. 先查閱 `claude-design-source/OddSpot Design System/preview/component-*.html`
   作為視覺參考，找到最接近的元件樣式
2. 所有顏色引用透過 `themes.css` 的 CSS 變數（如 `var(--accent)`、`var(--fg)`），
   **禁止寫死 hex 值**
3. 不可把 HTML 結構原樣搬到 React，要依既有元件粒度重新組織
   （參考 `src/components/` 下既有檔案的拆分慣例）
4. 實作前先閱讀 `.ai-context/global/design-direction-v2.md` 的具體規則

## 給 Huashu Design skill 的指令

當使用 Huashu Design skill 做設計迭代時：

- **跳過 Brand Asset Protocol 的品牌搜尋步驟**。
  OddSpot 的品牌資產已在 `claude-design-source/OddSpot Design System/themes.css`，
  直接讀取作為權威來源，不要上網搜尋。
- 所有迭代版本放到 `huashu-iterations/v{N}-{簡短描述}/` 子資料夾
- 新產出必須使用 themes.css 的 CSS 變數，不可寫死 hex 值
- 每次產出後在 `CHANGELOG.md` 記錄：版本號、日期、基底檔案、變更內容、理由

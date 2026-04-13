# OddSpot Icon Usage

這份文件整理目前已產出的 OddSpot 靜態 icon family，以及我建議的使用場景分工。  
Source assets 都放在 `public/brand/`。

## Asset Inventory

- `oddspot-icon-dark-open.svg`
- `oddspot-icon-light-open.svg`
- `oddspot-icon-dark-closed.svg`
- `oddspot-icon-light-closed.svg`
- `oddspot-icon-dark-error.svg`
- `oddspot-icon-light-error.svg`
- `oddspot-favicon-dark.svg`
- `oddspot-favicon-light.svg`

## Recommended Split

### 1. Open Eye

用途：

- 主 app icon
- App Store / Play Store / download page
- 啟動畫面靜態品牌圖
- 產品首頁 hero mark
- 社群頭像或品牌 avatar

理由：

- 這是辨識度最高的版本。
- 眼睛打開代表探索、觀察、搜尋，最符合 OddSpot 的核心語意。
- 不帶過強情緒，最適合當 default state。

建議：

- 深色版優先用在 app icon、深色系 splash、黑底品牌物。
- 淺色版優先用在文件、press kit、瀏覽器 tab、淺色產品介面。

### 2. Closed Eye

用途：

- Sleep mode
- Quiet mode
- Private mode
- Focus mode
- Scheduled maintenance
- Background sync

理由：

- 閉眼是「暫時收起感知」，不是壞掉。
- 它比錯誤版溫和，適合 intentional quiet，不適合真故障。

不建議：

- 不要拿閉眼版去表示 crash、permission denied、內容遺失。
- 不要拿來取代一般 loading icon，除非你的產品真的想把 loading 做成安靜等待。

### 3. Tear / Error

用途：

- Fatal error page
- API failure landing
- Content unavailable
- Resource deleted
- Server outage
- Permission blocked

理由：

- 流淚版情緒明確，適合真的發生失聯、失敗、找不到或被阻擋。
- 它比單純驚嘆號更有品牌記憶點。

不建議：

- 不要用在首次使用的 empty state。
- 不要用在一般 zero data 狀態。
- 不要拿來表示「目前沒有附近景點」這種正常結果。

## Favicon Guidance

### Dark favicon

檔案：

- `oddspot-favicon-dark.svg`

建議：

- 深色主題瀏覽器分頁
- 黑底 web app shell
- 開發環境或 staging 的深色識別

### Light favicon

檔案：

- `oddspot-favicon-light.svg`

建議：

- 淺色文件站
- 品牌說明頁
- 淺色產品表層

設計原則：

- 深淺色版本的點大小和造型應一致。
- 差異只保留在顏色與背景，避免 favicon 在 tab 上像不同品牌。

## Size Recommendations

SVG 可直接作為 source of truth，再按需求導出 PNG。

- `1024`: App Store / master source
- `512`: landing page OG image compositing / press kit
- `256`: PWA, install prompts, internal asset bundles
- `128`: desktop shortcuts, docs illustrations
- `64`: small UI previews, settings, onboarding lists
- `32`: favicon / tab icon

## My Opinionated Product Mapping

如果你現在還沒完全決定，我建議先這樣落位：

- Open eye = 品牌預設
- Closed eye = 系統安靜狀態
- Tear error = 真正失敗落地頁

這樣好處是：

- 語意乾淨
- 使用者容易學會這套圖像語言
- 之後擴展更多狀態時不會混亂

## Related Files

- Preview board: `oddspot-icon-preview.html`
- Error landing page: `oddspot-error-landing.html`

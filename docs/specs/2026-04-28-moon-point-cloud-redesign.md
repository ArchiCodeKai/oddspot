# Moon Point Cloud Redesign

**日期：** 2026-04-28  
**狀態：** 已核准，待實作  
**影響檔案：**
- `src/components/landing/globe/buildMoonPoints.ts`（新增）
- `src/components/landing/globe/Moon.tsx`（修改球體層）

---

## 背景

原本月球使用 `SphereGeometry + MeshStandardMaterial`（半透明填充）+
`IcosahedronGeometry wireframe` 疊加，視覺上只是一坨灰色球體，
缺乏坑洞質感與設計語言統一性。

## 設計目標

以幾何點雲取代實心球，透過密度分布讓坑洞輪廓自然浮現：
- 坑洞 rim（邊緣）= 點密集
- 坑洞碗底 = 點稀疏（空洞感）
- 整體風格與地球點雲一致，但密度稍低、顏色稍暗，不搶眼

---

## 移除

| 項目 | 原因 |
|------|------|
| `SphereGeometry + MeshStandardMaterial` 填充球 | 被點雲取代 |
| `createMoonBumpTexture()` | 不再需要 bump map |
| `moonBumpTex` | 同上 |
| `IcosahedronGeometry wireframe` | 與點雲風格重複，移除 |

## 新增

| 項目 | 說明 |
|------|------|
| `buildMoonPoints.ts` | 點雲生成函數，參考 `buildLandPoints.ts` 架構 |
| `moonPointsGeom` useMemo | 在 Moon.tsx 替換原球體 |

---

## 坑洞規格

```ts
const MOON_CRATERS = [
  { lat:  15, lng:  20, radius: 18, rimWidth: 5 },
  { lat: -30, lng: -60, radius: 12, rimWidth: 4 },
  { lat:  50, lng:  80, radius:  8, rimWidth: 3 },
  { lat: -10, lng: 150, radius: 14, rimWidth: 4 },
  { lat:  35, lng: -40, radius:  9, rimWidth: 3 },
  { lat: -55, lng:  30, radius: 11, rimWidth: 4 },
  { lat:  20, lng: -110,radius:  7, rimWidth: 3 },
  { lat: -20, lng:  90, radius: 16, rimWidth: 5 },
  { lat:  60, lng: -80, radius:  6, rimWidth: 2 },
  { lat:  -5, lng: -20, radius: 10, rimWidth: 3 },
];
```

### 密度計算

```
dist = 候選點到坑洞中心的角距離（度）

碗底區：dist < crater.radius * 0.4  → keep 機率 15%
rim 區：dist 在 [radius - rimWidth, radius + rimWidth]  → keep 機率 100%
其餘月面：keep 機率 55%
```

---

## 顏色規格

| 區域 | 亮度乘數 | 備註 |
|------|----------|------|
| rim 一般點 | `0.70–1.10 × accentColor` | jitter 讓 rim 有立體感 |
| rim 高亮點（5%） | white `(1,1,1)` | 閃爍感 |
| 一般月面 | `0.55–0.85 × accentColor` | 比地球偏暗 |
| 碗底殘留 | `0.28–0.45 × accentColor` | 深色，強化空洞對比 |

整體顏色跟隨 `accentColor`（主題切換時自動更新）。

---

## 規模參數

| 參數 | 值 |
|------|-----|
| `candidateCount` | `22,000` |
| 預估最終點數 | ~11,000–14,000 |
| `pointSize` | `0.008` |
| `sizeAttenuation` | `true` |
| `blending` | `AdditiveBlending` |
| `depthWrite` | `false` |

---

## 保留不動

- comet trail（彗星尾巴字符）
- label 軌道移動
- moon orbit 軌道
- visibility / dissolve 動畫銜接

---

## 實作順序

1. 新增 `buildMoonPoints.ts`
2. 修改 `Moon.tsx`：移除球體層，加入 `<points>` 元素
3. `npm run build` 確認零錯誤

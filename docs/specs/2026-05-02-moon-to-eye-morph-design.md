# Moon → Eye Morph 設計規格

> ❄️ **凍結（AD-10）**：landing 3D 全區進入維護模式，本規格未實作部分不再排程。只修 bug，不加功能、不重構。

**日期**：2026-05-02
**範圍**：桌機 `Moon.tsx` 點雲月球、手機 `MobileMoonShader` mesh 月球
**目標**：使用者拖曳月球時，月球漸變成「Cthulhu 不可名狀」風格的眼球；放手後 spring 回月球
**核心決策**：**不使用 `realistic_eye.glb`**，改採程序化 shader 變形

---

## 一、為什麼放棄 GLB

| 問題 | 說明 |
|---|---|
| 檔案大 | `realistic_eye.glb` 7.4MB，是其他模型 5–30 倍，手機絕不能載 |
| 面數錯位 | GLB 至少幾萬三角面，手機月球 mesh 才 ~1.5k vertices，差兩個量級 |
| 美學斷裂 | 桌機是點雲、手機是低模 shader mesh，硬塞 GLB 兩邊都不和諧 |
| 動畫不靈活 | 凝視轉動需要「外殼顫動 + 瞳孔獨立掃視」分層，shader uniform 才好做 |

**眼球視覺三件套（瞳孔黑點、虹膜環、眼白底色）100% 能在球面上程序化生成**，不需要外部 mesh。

---

## 二、雙軌方案總覽

桌機 / 手機本來就是兩條視覺技術路線，眼球變身也分兩套，各自延續原本美學語言。

| | 桌機 | 手機 |
|---|---|---|
| **基底** | `<points>` 點雲 ~22k 點，PointsMaterial + AdditiveBlending | `<mesh>` SphereGeometry 48×24 + 自訂 ShaderMaterial |
| **morph 機制** | PointsMaterial → 自訂 ShaderMaterial（保留 vertexColors fallback），加 `aRole` attribute + `uMorph`/`uGazeDir`/`uTremor` uniforms | 直接擴充 `MobileMoonShader`，加 3 個 uniform |
| **凝視** | shader 內依 `aRole` + `uGazeDir` 把 iris/pupil 點朝 gaze 方向偏移；外殼粒子保持顫動 | 用 sphere 表面相對「gaze 中心軸」距離，分層染色 sclera/iris/pupil |
| **顫動** | vertex shader：position += sin(time × highFreq) × 0.3% radius | 同上，振幅 0.3–1% |
| **掃視** | 共用 `useGazeController`（JS）每 0.8–2.5s 隨機跳新 target | 同上 |
| **新增資源** | 1 attribute (Uint8 22k = 22KB) + shader 改寫 | 0 attribute + shader 擴充 |
| **效能影響** | 接近 0（shader 計算量微增） | 接近 0 |

---

## 三、共用 Gaze Controller

### 檔案：`src/hooks/useGazeController.ts`

**職責**：產出每幀的 `gazeDir`（THREE.Vector2，xy 範圍 [-1, 1]）給 shader 用。

**內部行為**：

1. **掃視（saccade）**：每 0.8–2.5 秒（隨機）跳一個新 target
2. **盯人偏向**：80% 機率 target 朝 pointer NDC 方向，20% 朝隨機方向 → 「他知道你在看」
3. **平滑過渡**：當前 gazeDir 用 critically damped spring lerp 到 target（不是線性）
4. **顫動相位**：output += sin(time × 23) × 0.04（高頻微抖，疊在 gaze 上）
5. **morph progress**：對外暴露 `morph` 0→1，由 moon state 驅動：
   - `orbiting` → 0
   - `grabbed` → 1（時間常數 ~0.4s 的 ease）
   - `returning` → 0（時間常數 ~0.6s）

**API**：

```typescript
interface GazeController {
  /** 每幀寫入：當前 morph 進度（0=月球, 1=眼球） */
  morph: { current: number };
  /** 每幀寫入：gazeDir 在攝影機 view space 的 NDC（x, y） */
  gazeDir: THREE.Vector2;
  /** 由 Moon.tsx / MoonLite 呼叫，傳入當前 moonState */
  setMoonState: (state: "orbiting" | "grabbed" | "returning") => void;
  /** useFrame 內呼叫推進時間 + 計算掃視 */
  update: (dt: number, pointerNDC: THREE.Vector2) => void;
}
```

**Effort**：**S（30 分鐘）**

---

## 四、桌機改造：`Moon.tsx`

### 改動範圍

1. **`buildMoonPoints.ts`**：每個 candidate 多一個 `aRole`（Uint8）
   - 球面對應「眼睛預設凝視方向」（z+ 軸）的角距離決定 role：
     - 角距離 < 8° → `pupil` (2)
     - 8–25° → `iris` (1)
     - > 25° → `sclera` (0)
   - 這是「靜態 layout」，凝視方向動態靠 shader 計算
2. **`Moon.tsx`**：
   - PointsMaterial → `<shaderMaterial>` 包點雲（保留 vertexColors / additive blending）
   - 新 uniforms：`uMorph`、`uGazeDir`、`uTremor`、`uTime`、`uAccent`
   - 連接 `useGazeController`：把 `moonStateRef` 的狀態同步進去
   - 拖曳 grabbed 時 cycleTheme 邏輯**保留**（不衝突）

### Shader 行為

**Vertex**：

```glsl
attribute float aRole; // 0=sclera, 1=iris, 2=pupil
uniform float uMorph;
uniform vec2 uGazeDir; // -1..1，shader 內轉成 view-space 偏移
uniform float uTime;
uniform float uTremor;

// 1. 凝視旋轉：把 pupil/iris 點往 gazeDir 偏轉（小角度）
//    - sclera 不動
//    - iris 偏 0.5 × gazeAngle
//    - pupil 偏 1.0 × gazeAngle（看起來瞳孔最動）
float gazeWeight = aRole * 0.5;
vec3 morphedPos = rotateAroundOrigin(position, uGazeDir * 0.6 * uMorph * gazeWeight);

// 2. 顫動：高頻 noise displacement（只在 morph=1 時生效）
float jitter = sin(uTime * 23.0 + position.x * 50.0) * 0.003 * uMorph * uTremor;
morphedPos += normal * jitter;

// 3. 球面變光滑（morph=1 時 crater displacement 淡化）
//    這個由 buildMoonPoints 已經算進 position 裡，無法 shader 反推
//    → 接受月球凹凸保留為「眼球瑕疵」（Cthulhu 風格反而加分）
```

**Fragment**：

```glsl
// 顏色 lerp
//   morph=0: vertexColor (現有 accent 月球色)
//   morph=1:
//     pupil  → vec3(0.0)              // 純黑
//     iris   → uAccent × 1.4 (高飽和) // 主題色虹膜
//     sclera → mix(vec3(0.92, 0.94, 0.86), uAccent * 0.3, 0.2) // 暖白偏冷
vec3 eyeColor = pickByRole(aRole, ...);
vec3 finalColor = mix(vColor, eyeColor, uMorph);
gl_FragColor = vec4(finalColor, ...);
```

### Effort 拆解

| 子任務 | 估時 |
|---|---|
| `buildMoonPoints.ts` 加 `aRole` attribute（依球面區域分類） | 15 min |
| ShaderMaterial 取代 PointsMaterial（vertex + fragment + uniforms） | 60 min |
| 接 `useGazeController`、拖曳狀態同步 | 20 min |
| 處理 `recolorMoonPoints` 與 `cycleTheme` 並存（uAccent uniform 同步） | 15 min |
| 視覺微調（飽和度、瞳孔大小、顫動振幅） | 30 min |

**Effort 總計：M（~2.5 小時）**

---

## 五、手機改造：`GlobeSceneMobile.tsx` 的 `MobileMoonShader`

### 改動範圍

1. **`buildMoonTerrainSphere.ts`**：**不改**（mesh 結構保留）
2. **`MobileMoonShader`**：
   - 加 3 個 uniform：`uMorph`、`uGazeDir`、`uTremor`、`uTime`
   - vertex shader：依 `uMorph` × `uTremor` 加抖動
   - fragment shader：依 `vLocalNormal` 跟 `uGazeDir` 算「距離凝視中心軸的 angular distance」，分層染色
3. **`MoonLite`**：
   - 連接 `useGazeController`，把 `moonStateRef` 餵進去
   - 把 controller 寫的 morph / gazeDir 在 useFrame 同步給 shader uniform
   - 順便補 `useJawMoonStore` 寫入（手機目前沒接，補上 = 手機也有 jaw 互動）

### Shader 行為

**Fragment 關鍵段**：

```glsl
// gazeAxis = 預設凝視方向 + uGazeDir 偏移（view space → local 反算）
vec3 gazeAxis = normalize(vec3(uGazeDir.x * 0.4, uGazeDir.y * 0.4, 1.0));
gazeAxis = applyCameraInverse(gazeAxis); // 轉到 local

float gazeAngle = acos(clamp(dot(vLocalNormal, gazeAxis), -1.0, 1.0));

// 0 rad = 正中央 (pupil)，~0.4 rad = iris 邊界，> 0.4 = sclera
float pupilMask  = 1.0 - smoothstep(0.10, 0.18, gazeAngle);
float irisMask   = (1.0 - smoothstep(0.30, 0.42, gazeAngle)) * (1.0 - pupilMask);
float scleraMask = 1.0 - pupilMask - irisMask;

vec3 eyeColor =
    pupilMask  * vec3(0.02, 0.0, 0.05) +
    irisMask   * uAccent * 1.5 +
    scleraMask * mix(vec3(0.92, 0.94, 0.86), uAccent * 0.4, 0.3);

// 與現有月球色 lerp
vec3 moonColor = /* 現有 bowl/rim/surface 算出的顏色 */;
vec3 finalColor = mix(moonColor, eyeColor, uMorph);

// alpha：morph=1 時整顆比月球更實體（眼球比較不透）
float baseAlpha = /* 現有月球 alpha */;
float eyeAlpha = 0.85;
float a = mix(baseAlpha, eyeAlpha, uMorph) * uOpacity;
```

**Vertex 顫動**：

```glsl
uniform float uTime;
uniform float uMorph;
uniform float uTremor;

vec3 jitteredPos = position + normalize(position) *
  sin(uTime * 23.0 + position.x * 50.0) * 0.005 * uMorph * uTremor;
```

### Effort 拆解

| 子任務 | 估時 |
|---|---|
| Shader 擴充（uniforms + vertex 顫動 + fragment 分層 lerp） | 50 min |
| `MoonLite` 接 `useGazeController` + uniform 同步 | 15 min |
| 補 `useJawMoonStore.setMoonFrame` 呼叫（手機補洞） | 15 min |
| 視覺微調（手機螢幕小，瞳孔/虹膜比例可能要放大） | 25 min |

**Effort 總計：M（~1.7 小時）**

---

## 六、效能評估

### 桌機

- **新增 attribute**：`aRole` Uint8 × 22000 = **22KB**（一次性 GPU upload）
- **Shader 額外 ALU**：vertex 加一個 rotation matrix + sin、fragment 加 3 個 mix
- **JS 每幀成本**：`useGazeController.update` ~0.05ms（spring + 一個 random 機率）
- **Buffer 更新**：**沒有**！uniform 改值不需要 re-upload

預估 frame time 增加：**< 0.1ms**

### 手機（最關注）

- **新增 attribute**：**0**（mesh 不動）
- **Shader 額外 ALU**：fragment 加 acos + 3 個 smoothstep + 1 個 mix（~10 額外運算/像素，可忽略）
- **JS 每幀成本**：同桌機 ~0.05ms
- **Buffer 更新**：**沒有**

預估 frame time 增加：**< 0.05ms**

**手機效能：100% 安全。** 不載 GLB、不加 geometry、不加 buffer，純 shader 計算量微增。

---

## 七、Cthulhu 風格的 4 個程序化技巧

| 技巧 | 實作位置 | 細節 |
|---|---|---|
| 不規律 saccade | `useGazeController` | idle 間隔 random(0.8, 2.5) 秒；grabbed 使用快/慢雙峰停留時間，避免固定節奏 |
| 拖曳時更失控 | `useGazeController` | grabbed 時降低 pointer 追蹤比例，讓視線更多跳往隨機方向 |
| 顫動相位錯開 | shader vertex | sin freq 用 23（質數），不同 axis 用不同 multiplier |
| 偶發眨眼 | `useGazeController` + shader | grabbed 眼球態每 1.2–3.8 秒觸發約 160ms blink，shader 用 eyelid mask 壓暗/收窄眼球 |

### 7.1 View-facing eye correction（2026-05-03）

原本桌機點雲用 `aRole` 固定分類 pupil / iris / sclera，月球 tumble 後瞳孔會被轉到側面或背面。修正後：

- 桌機 `Moon.tsx` 的眼球角色改由 view-space 球面方向與 `uGazeDir` 動態計算，不再依賴固定 local `+Z` 角色。
- 桌機材質改為 `NormalBlending`，避免 `AdditiveBlending` 讓黑色瞳孔不可見。
- 手機 `MobileMoonShader` 同步接 `uBlink`，並放大 pupil / iris 角距離範圍，手機尺寸下拖曳也能讀到眼球。
- 眼球視線與眨眼都只靠 uniform 更新；不新增 geometry、texture、GLB 或每幀 buffer upload。

### 7.2 Acid graphic tuning（2026-05-03）

使用者回饋 GLB/發光虹膜太生硬、桌機散逸太強、手機只剩線稿。修正後：

- 桌機 `Moon.tsx` 改成「同一份月球點雲的第二層 point shader overlay」：中心純黑黑洞、低彩度虹膜、血絲與眼白全部由粒子點聚集，不再使用球面遮罩或 screen-space 方格網點。
- 桌機 dust 生成量與粒子尺寸下修，保留顫動但避免散逸雲蓋掉完整眼球輪廓；基礎點雲在 morph 時不再降到過低 opacity。
- 手機 `MobileMoonShader` 放大 pupil / iris，改用 surface-normal hash 做粒子質感，不使用模糊像素遮罩；morph 時輔助 wireframe 只退到背景可讀程度，並鎖住 mesh alpha 下限，避免拖曳時只剩半透明線框。
- 手機眼球中心另有 `MobileEyeBillboard`，掛在 `moonBodyRef` 而不是 `moonSelfRef`，因此不會被月球自轉帶走。這層用低彩度 iris、純黑 pupil、淡血絲與 edge fade 補足手機尺寸下的辨識度。
- 拖曳尺寸補償仍以「攝影機到軌道最近點」作最大 apparent size；grabbed 進入速度提高，pointer down 時先把 compensation 設為 `1`，釋放後再平滑回自然軌道尺寸。
- `useGazeController` 降低 tremor 頻率與振幅，讓眼球震顫更接近不穩定的自然微動，而不是機械式高頻抖動。

### 7.3 Gaze + tremor correction（2026-05-06）

- `useGazeController` 對 random target 與 pointer target 套同一個上方 clamp：下半部不限制，上方只允許偏左上/右上或接近水平，避免抽到正上方造成翻白眼感。
- `useGazeController` 另暴露 `tremor.current`：saccade 移動中為 0，到注視點穩定停留 `0.2s` 後才淡入高頻小振幅 tremor。這對應 enhanced physiological tremor / fixational eye movement，而不是平滑繞圈漂移。
- 手機 `GlobeSceneMobile.tsx` 與桌機 `Moon.tsx` 的 iris 分裂 cell 都不再做 shader 內低頻漂移或獨立旋轉；分裂軸固定在球面上，震顫由 `gazeDir` 的 settled tremor 與整顆眼球 `rotation.z` 統一提供。
- 分裂期只把整體 tremor 振幅提高約 `10%`，不新增第三個 iris、不做額外環形滑動。

### 7.4 Budding iris split（2026-05-06）

- 桌機 `Moon.tsx` 與手機 `GlobeSceneMobile.tsx` 的重瞳分裂不再使用中心對稱 mitosis；改為 budding：主瞳孔固定在 gaze 中心，副瞳孔沿單側有機滑出。
- cycle 前段用 fBM domain warping 放大邊界畸變；release 段用 exponential easing 讓副瞳孔突破表面張力；hold 段透過 polynomial `smin` 維持黏橋；reverse 段用 sine + damped spring 回合體並提高融合半徑。
- 手機版額外要求：副 cell 位移倍率較大，讓「虹膜 + 瞳孔」一起出芽；pupil 用兩個原始距離場保持完全斷開，iris 用較大的 `smin` 融合半徑保留約 `20%` 黏橋、`80%` 分離。
- Budding cycle 從 `8s` 拉長到約 `23s`，裂變頻率約為原本的 `35%`，避免過度頻繁而削弱眼球感。
- 最大分裂後不得長時間停留：cycle 到最大出芽後約 `0.6s` 開始合體，合體段約 `1.4s`，確保分裂完成後在 `0.5–2s` 內回到單一虹膜。
- uniform 名稱仍保留 `uMitosisCycle` 以避免擴大 R3F wiring 改動，但語義已是 budding cycle。

---

## 八、實作順序

1. **Phase 1**：寫 `useGazeController`（共用，不依賴 moon 修改）
2. **Phase 2**：手機版改造（最關鍵效能驗證點）+ 補 jaw 接線
3. **Phase 3**：桌機版改造（材質改寫工程量最大）
4. **Phase 4**：兩端視覺微調 + npm run build 驗證

**總 Effort**：S + M + M ≈ **5 小時實作 + 1 小時微調 = 6 小時**

---

## 九、不在這次範圍

- 不刪 `realistic_eye.glb`（保留給未來其他用途，例如 wormhole 場景）
- 不改 `buildMoonTerrainSphere`、`buildLandPoints`、`Earth` 相關
- 不改現有 dust 粒子系統、cycleTheme 邏輯
- 不引入新依賴

---

## 十、待 user 確認後動工

---

## 十一、後續迭代：Mobile Moon Halftone 表面強化（2026-05-04）

### 背景問題

手機版月球被拖拽放大時，表面變得透明、無明顯紋理。物理根因：
- mesh 段數低（48×24），shader 的 fresnel/crater 漸層是低頻訊號 — 放大 2–3 倍後同一張圖填更大畫面，視覺密度被稀釋
- wireframe 在 morph 時刻意降到 0.04（為了不打擾眼球），放大後線條間距變更大、密度進一步崩潰
- `MobileEyeBillboard` 是 camera-facing 圓盤，會等比放大 — billboard 內的瞳孔有提升，但月球**本體表面**沒有任何「按 pixel 算密度」的訊號

### 方向選擇（user 確認）

採「**漸進式強化**」：軌道狀態就有微弱底紋、隨 morph 加重。符合 acid 風格「物件本來就有紋理，只是被注意到的時機不同」直覺，避免突兀感。

### 技術方案：Screen-space Halftone + Posterize

**為什麼是 screen-space halftone**：

只有 screen-space 圖樣是真正 scale-invariant 的解 — 點密度按 pixel 算、不按 mesh area 算，月球放大幾倍每個 pixel 仍維持同樣覆蓋率。其他兩個方案（local-position cellular noise、稀疏點雲粒子）在某個 zoom level 又會稀掉。

**改動範圍**：

- 唯一檔案：`src/components/landing/GlobeSceneMobile.tsx`
- 唯一函式：`MobileMoonShader` 的 fragment shader（約 +25 行 GLSL）
- 不動：`MobileEyeBillboard`、`PupilWireOverlay`、wireframe `lineSegments`、`MobileOceanVolume`、`MobileOceanShell`、桌機 `Moon.tsx`

### Shader 設計

#### Halftone 點陣

```glsl
vec2 pix = gl_FragCoord.xy;
float cellSize = 4.0;                 // 4×4 px 一格，DPR=2~3 下不馬賽克
vec2 cell = floor(pix / cellSize);
vec2 cellUv = fract(pix / cellSize) - 0.5;
float dotR = length(cellUv);

float dotRadius = 0.18 + uMorph * 0.22;   // 軌道 0.18、放大 0.40
float dot = 1.0 - smoothstep(dotRadius - 0.08, dotRadius + 0.05, dotR);
dot *= 0.85 + hash(cell) * 0.30;          // ±15% 抖動防 banding
```

#### Halftone 顏色

```glsl
vec3 dotCol = mix(uAccent * 0.45, vec3(0.04, 0.04, 0.07), 0.55);
```

- accent × 0.45：壓暗的主題色，不發光
- 混 55% 暗灰：點看起來「印在表面」而非「浮在表面」
- 不加 fresnel / emissive / rim — 避免任何霓虹傾向

#### 強度曲線（隨 morph 漸進）

```glsl
float halftoneStrength = 0.10 + uMorph * 0.22;   // 軌道 0.10、放大 0.32
```

- 軌道狀態：alpha ≈ 0.10 — 隱約底紋，正常瀏覽不搶 Earth
- 拖拽放大：alpha ≈ 0.32 — 明確網點質感
- 線性插值，無「突然出現」感

#### Posterize crater shading

```glsl
float surfaceRaw = smoothstep(0.22, 0.72, vCrater);
float posterStep = mix(1.0, 4.0, uMorph);          // 軌道 1（不變）、放大 4 階
float surface = floor(surfaceRaw * posterStep) / posterStep;
```

軌道狀態維持現在外觀；放大時 crater 變 4 階「漫畫陰影」，跟 halftone 配套。

#### 與既有 alpha 合成的順序

在現有 `moonShading()` 回傳前注入：

```glsl
vec3 col = ...                                     // 現有計算
col = mix(col, dotCol, dot * halftoneStrength);    // halftone 疊加
return vec4(col, a);
```

- 在 `moonShading()` 內部 → 跟 `eyeShading()` 的 mix 自動相容
- 不影響 `max(moon.a, eye.a, bodyFloor)` 的 alpha 邏輯
- 月球被眼球 morph 取代時，halftone 自然淡出（`mix(moon.rgb, eye.rgb, m)` 接管）

### 對 Earth 的影響評估

- Earth 是獨立 mesh + 獨立 shader（`MobileEarthShader`）— 完全不共享
- 月球 halftone alpha 上限 0.32，且只在 morph 拉到 1 時才到上限 — 軌道狀態 0.10 比 wireframe 還弱
- 視覺重量：halftone 是中頻訊號（4×4 px 點），Earth 是低頻訊號（連續 mesh + ocean）— 頻率不重疊、不競爭注意力

### 效能

- Fragment 多 1 次 hash、1 次 length、1 次 smoothstep、1 次 floor — 可忽略
- 沒新 uniform / attribute / draw call
- 對手機 GPU 影響：< 0.1 ms / frame

### 可調參數

| 參數 | 預設 | 想要更明顯 | 想要更低調 |
|------|------|------------|------------|
| `cellSize` | 4.0 | 5.0–6.0 | 3.0 |
| `dotRadius` 上限 | 0.40 | 0.50 | 0.30 |
| `halftoneStrength` 上限 | 0.32 | 0.45 | 0.20 |
| `uAccent × 0.45` | 0.45 | 0.65 | 0.30 |
| `posterStep` 上限 | 4.0 | 3.0（更扁平） | 6.0（更細） |

### 不在這次範圍

- 不動桌機 `Moon.tsx`（user 對桌機表現滿意）
- 不動 `MobileEyeBillboard`、`PupilWireOverlay`、wireframe layer
- 不調整海洋層或大氣層
- 不引入新 uniform 或新 geometry

### 驗證

- `npx tsc --noEmit` 通過
- `npm run build` 通過（不跑 dev — port 8083 限制）
- 視覺驗證留給 user 在瀏覽器親眼看


設計就緒，等 OK 後直接實作。

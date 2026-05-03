# Moon → Eye Morph 設計規格

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
| 不規律 saccade | `useGazeController` | 間隔 random(0.8, 2.5) 秒，不是固定節拍 |
| 盯人偏向 | `useGazeController` | 80% 朝 pointer，20% 朝隨機方向 |
| 顫動相位錯開 | shader vertex | sin freq 用 23（質數），不同 axis 用不同 multiplier |
| Morph 非線性 | `useGazeController` | morph 用 ease curve，途中略微 overshoot 再回穩 |

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

設計就緒，等 OK 後直接實作。

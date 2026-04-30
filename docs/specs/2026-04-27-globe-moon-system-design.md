# Landing Globe + Moon System — Design Spec

**Date**: 2026-04-27
**Author**: Brainstorming session
**Status**: Approved, ready for implementation
**Scope**: `src/components/landing/GlobeScene.tsx` + new `src/components/landing/globe/*`

---

## 1. Goal

把現有的 landing wireframe 球體（純經緯線格、無辨識度）升級成：
- 可辨識的地球（看得出大陸 + 海洋）
- 真實 vertex displacement 的地形起伏感（大陸高於海平面）
- 一顆按真實比例（大小）+ 真實傾角的月球繞行
- 保持 v3 Acid/Y2K 線稿風格、不爆效能

## 2. Constraints

- **效能**：mobile-safe，per-frame 預算 < 0.5ms（globe 部分）
- **視覺**：純線稿、accent 一色（不引入紋理彩色貼圖）
- **Bundle**：< 100 KB 額外資產
- **不破壞**：保留 Taiwan pin、halo pulse、background stars、boot phases、dissolve 動畫、主題色切換

---

## 3. Architecture

### 3.1 場景結構

```
<scene>
  ├─ <group>  EarthGroup (rotation.z = 0.41 rad ≈ 23.5° 真實軸傾)
  │   ├─ <lineSegments>  displaced wireframe (32×24 segments, 已 vertex 位移)
  │   ├─ <lineSegments>  continent outlines (offset to radius 1.03)
  │   ├─ <mesh>          Taiwan pin (sit on displaced surface)
  │   └─ <mesh>          halo pulse (existing)
  ├─ <group>  MoonOrbitGroup (rotation.x = 0.0897 rad ≈ 5.14° 黃道→月球軌道夾角)
  │   ├─ <line>          orbit path (淡淡的圓圈, opacity 0.12)
  │   └─ <group>         MoonAnchor (rotation.y 每幀更新 = 公轉角)
  │       └─ <group>     Moon (position [3, 0, 0], rotation.y = -orbitAngle 潮汐鎖定)
  │           └─ <lineSegments>  moon wireframe (12×8 segments)
  └─ <points>            background stars (existing 400)
```

### 3.2 座標系統與傾角

- **黃道（ecliptic）= 場景 XZ 平面**（水平）
- **EarthGroup**：rotation.z = 23.5° → 地球軸傾，自轉軸不再垂直
- **MoonOrbitGroup**：rotation.x = 5.14° → 月球軌道平面相對黃道微傾
- **重要**：MoonOrbitGroup 是 **scene 的直接子節點**，不是 EarthGroup 的子節點。月球軌道平面跟黃道對齊，**不**跟著地球軸傾旋轉。

---

## 4. Earth: Vertex Displacement

### 4.1 預計算流程（一次性，模組初始化時）

```typescript
// 步驟 1：載入 GeoJSON
const landData = await fetch('/data/ne_110m_land.json').then(r => r.json());

// 步驟 2：rasterize 到 256×128 equirectangular canvas
const canvas = document.createElement('canvas');
canvas.width = 256; canvas.height = 128;
const ctx = canvas.getContext('2d')!;
ctx.fillStyle = '#000'; // sea
ctx.fillRect(0, 0, 256, 128);
ctx.fillStyle = 'rgb(200,200,200)'; // land
for (const polygon of landData.features) {
  drawPolygonAsEquirectangular(ctx, polygon);
}
ctx.filter = 'blur(2px)'; // 海岸軟化（避免 vertex displacement 太銳利）
ctx.drawImage(canvas, 0, 0);

// 步驟 3：讀 pixel → Uint8 heightmap
const imageData = ctx.getImageData(0, 0, 256, 128);
const heightmap = new Uint8Array(256 * 128);
for (let i = 0; i < heightmap.length; i++) {
  heightmap[i] = imageData.data[i * 4]; // R channel
}

// 步驟 4：建 SphereGeometry 並對每個頂點位移
const geom = new THREE.SphereGeometry(1, 32, 24);
const pos = geom.attributes.position;
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
  // 球面 → lat/lng
  const lat = Math.asin(y);                   // -π/2 ~ π/2
  const lng = Math.atan2(z, x);                // -π ~ π
  // lat/lng → heightmap UV
  const u = (lng + Math.PI) / (2 * Math.PI);  // 0 ~ 1
  const v = 1 - (lat + Math.PI/2) / Math.PI;  // 0 ~ 1（北極在頂部）
  // bilinear sample
  const sample = bilinearSample(heightmap, 256, 128, u, v) / 255;
  // 位移：max 2.5% 半徑
  const newR = 1 + sample * 0.025;
  pos.setXYZ(i, x * newR, y * newR, z * newR);
}
geom.computeVertexNormals();

// 步驟 5：WireframeGeometry 包裝
const wireGeom = new THREE.WireframeGeometry(geom);
```

### 4.2 大陸線稿（offset 1.03，浮在球面上）

```typescript
// 從 GeoJSON 取出每個 polygon 的外環線段
const lineSegments: number[] = [];
for (const feature of landData.features) {
  for (const ring of feature.geometry.coordinates) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [lng1, lat1] = ring[i];
      const [lng2, lat2] = ring[i + 1];
      // lng/lat → 球面座標 (radius 1.03 浮起)
      const v1 = latLngToVec3(lat1, lng1, 1.03);
      const v2 = latLngToVec3(lat2, lng2, 1.03);
      lineSegments.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
    }
  }
}
const lineGeom = new THREE.BufferGeometry();
lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(lineSegments, 3));
```

### 4.3 視覺參數
- **Wireframe**：`LineBasicMaterial({ color: accent, transparent: true, opacity: 0.6 })`
- **Continent outline**：`LineBasicMaterial({ color: accent, transparent: true, opacity: 0.85, linewidth: 1 })`
- **位移幅度**：`max 0.025`（球面半徑的 2.5%）—— 在 wireframe 上看得出來但不誇張

### 4.4 Mobile light globe 修正（2026-04-30）

手機版不再混用「低多邊形填色面」與「高解析 GeoJSON 海岸線」。兩者解析度不同會造成色塊與邊線無法吻合。

目前 `GlobeSceneMobile` 的 light globe 使用 `buildTerrainSphere(...)` 產生四組 heightmap 同源幾何：

| 幾何 | 用途 | 視覺規則 |
|---|---|---|
| `meshGeometry` | 陸地 mask 填色 | 完整 displaced sphere；shader 用 `aLandFactor` 切陸地，避免 triangle coast 鋸齒 |
| `coastlineGeometry` | 海岸線 | marching squares 從 heightmap land threshold 抽 contour，比 triangle edge 平滑 |
| `wireGeometry` | 大陸內部等高線 | 從 procedural elevation field 抽 contour，補山脈/盆地/高原可讀性 |
| `ridgeGeometry` | 山脈/高地線 | 從 mountain field 抽 contour，讓大陸中央不只是單純填色 |

透明度層級維持：陸地高點 > 一般陸地 > 潮汐 wave > 海洋。海洋與潮汐仍由 mobile ocean shell 處理，陸地 mesh 不再覆蓋整顆球。

---

## 5. Moon

### 5.1 軌道機制

```typescript
function MoonGroup() {
  const orbitRef = useRef<THREE.Group>(null);
  const moonRef = useRef<THREE.Group>(null);
  const ORBIT_PERIOD_SEC = 32;

  useFrame((_, dt) => {
    if (!orbitRef.current || !moonRef.current) return;
    const angle = orbitRef.current.rotation.y + (dt * 2 * Math.PI / ORBIT_PERIOD_SEC);
    orbitRef.current.rotation.y = angle;
    moonRef.current.rotation.y = -angle; // 潮汐鎖定：抵銷 anchor 旋轉，同一面永遠朝原點
  });

  return (
    <group rotation-x={5.14 * Math.PI / 180}> {/* 軌道平面傾角 */}
      <line>{/* orbit path ring */}</line>
      <group ref={orbitRef}> {/* MoonAnchor */}
        <group ref={moonRef} position={[3, 0, 0]}> {/* Moon */}
          <lineSegments geometry={moonWireGeom}>
            <lineBasicMaterial color={accent} opacity={0.7} transparent />
          </lineSegments>
        </group>
      </group>
    </group>
  );
}
```

### 5.2 Moon mesh
- SphereGeometry(0.25, 12, 8) → WireframeGeometry
- **不做**月球的 vertex displacement（保持簡單，月球只是線稿球體）

### 5.3 軌道路徑
- 使用 EllipseCurve（perfect circle, radius 3）→ 100 個點 → BufferGeometry
- 渲染為 `<line>`（連續線段，不是 lineSegments）
- Material: opacity 0.12, accent color, 1px stroke
- 位於 MoonOrbitGroup 內，所以也跟著 5.14° 傾斜

---

## 6. Boot Animation Integration

| Phase | Globe state | Moon state |
|---|---|---|
| boot-0 | sphere fade in（有起伏 wireframe） | 隱藏 |
| boot-1 | 完整顯示（穩定旋轉） | 隱藏 |
| boot-2 | + 大陸線稿淡入（0 → 0.85） | 隱藏 |
| boot-3 | 攝影機鎖定 Taiwan + 月球從畫面外進入軌道 | scale 0 → 1，opacity 0 → 1 |
| boot-4 → idle | 全部穩定 | 穩定繞行 |

### Dissolve (idle 後)
- 地球：往右平移 + 縮小 28%（既有）
- 月球軌道：跟著一起平移縮小（同一個父級 group？或獨立計算）
- 軌道路徑：跟著 fade

> **實作建議**：包一個 `<group>` 把 Earth + Moon 都裝進去，dissolveProgress 套在這個外層 group 上，自動連動。

---

## 7. File Changes

### 新增
```
public/data/
  └─ ne_110m_land.json                    (~50 KB simplified Natural Earth)

src/components/landing/globe/
  ├─ buildDisplacedSphere.ts              (canvas rasterize + vertex displacement)
  ├─ buildContinentLines.ts               (GeoJSON → BufferGeometry)
  ├─ buildMoonOrbitRing.ts                (orbit path geometry)
  ├─ Moon.tsx                              (Moon component with tidal lock)
  └─ geoUtils.ts                           (latLngToVec3, bilinearSample, etc.)
```

### 改寫
- `src/components/landing/GlobeScene.tsx` — 整合上述新元件，移除既有兩個裝飾環

### Marquee 加註
`src/components/landing/LandingExperience.tsx` 的 `MARQUEE_ITEMS` 加一條：
```ts
"cartography: natural earth",
```

---

## 8. Performance Budget

### Initialization (one-time)
| 階段 | 預估時間 |
|---|---|
| Fetch ne_110m_land.json (~50 KB) | 5-10 ms |
| Parse GeoJSON | 1-2 ms |
| Canvas rasterize 256×128 | 3-5 ms |
| Read ImageData → heightmap | <1 ms |
| Vertex displacement loop (~768 verts) | 1-2 ms |
| Build wireframe + continent line geom | 2 ms |
| **Total** | **~15-20 ms** |

### Per-frame (steady state)
| 項目 | 成本 |
|---|---|
| Earth rotation update | < 0.05 ms |
| Moon orbit + tidal lock update | < 0.05 ms |
| Total globe-related per-frame | **< 0.5 ms** |

### Bundle impact
- +50 KB ne_110m_land.json (一次性 fetch，後續快取)
- +0 npm packages（無新依賴）
- Code: ~250 lines across 5 new files

---

## 9. Visual Specs

### Color
- 全部 `var(--accent)`（current theme: terminal #5fd9c0）
- 透明度層級：
  - Background stars: 0.4
  - Earth wireframe: 0.6
  - Continent lines: 0.85
  - Moon wireframe: 0.7
  - Moon orbit ring: 0.12
  - Halo pulse: 0.6 → 0（pulse）

### Sizes
| 元素 | 半徑（scene units） |
|---|---|
| Earth | 1.0 |
| Earth surface displacement | up to 1.025 |
| Continent line layer | 1.03 |
| Moon | 0.25 |
| Moon orbit | 3.0 |
| Camera distance | ~4.0（視距內可見地球 + 月球） |

### Camera
- Steady idle: position `[0, 0, 4]`, FOV 45°
- 之前 boot-2 phase 會 zoom in 到 z=2.5 → 月球可能會出 viewport
- **解法**：boot 結束、月球進場時，camera 拉回 z=4 給足視野

---

## 10. Open / Future

- **不在這次範圍**：月球本身的 vertex displacement（坑洞感）—— 月球只當線稿球體
- **不在這次範圍**：日蝕/月蝕（月球擋住地球的暗面）—— 沒有光源系統
- **不在這次範圍**：地球的雲層、城市光點、白天/黑夜
- **未來可加**：mobile DPR/segments 自動降階（如果 38 KB JSON 太重會考慮）

---

## 11. Acceptance Criteria

實作完成後驗收：
1. 球體有可辨識的大陸（非洲、美洲、歐亞、澳洲、南極都能認出來）
2. 旋轉時邊緣輪廓有起伏（大陸高出海洋的視覺差異 > 1 像素）
3. 月球大小相對地球肉眼上去 ≈ 1/4
4. 月球軌道平面相對地球赤道明顯有傾斜（5.14° 看得出來）
5. 月球同一面永遠朝向地球（潮汐鎖定）
6. `npm run build` 通過、TypeScript 0 錯
7. Mobile（iPhone 12 mini 模擬）不掉幀
8. 主題色切換 (terminal/blueprint/caution/midnight) 全部 globe 元素同步換色
9. Marquee 多了一條 `cartography: natural earth`

---

## 12. References

- Natural Earth: https://www.naturalearthdata.com/ — Public Domain
- Natural Earth 110m Land: https://www.naturalearthdata.com/downloads/110m-physical-vectors/
- Three.js LatheGeometry / SphereGeometry / WireframeGeometry / BufferGeometry
- Tidal locking: rotation period = orbital period
- Moon axial tilt: 6.7° to its orbital plane（不在這次實作 scope）
- Moon orbit eccentricity: 0.0549（簡化為圓形軌道）

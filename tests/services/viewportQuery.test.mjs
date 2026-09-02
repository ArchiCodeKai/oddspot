import assert from "node:assert/strict";
import test from "node:test";

const { quantizeBbox, BBOX_GRID_PRECISION, VIEWPORT_QUERY_DEBOUNCE_MS } = await import(
  "../../src/lib/map/viewportQuery.ts"
);

// 實際從 Mapbox getBounds() 拿到的那種原始浮點數
const RAW = {
  minLng: 121.34385573694931,
  minLat: 24.871026106252472,
  maxLng: 121.64135528689178,
  maxLat: 25.12459724560938,
};

test("quantized bbox snaps to the grid precision", () => {
  const q = quantizeBbox(RAW);
  assert.deepEqual(q, {
    minLng: 121.343,
    minLat: 24.871,
    maxLng: 121.642,
    maxLat: 25.125,
  });
  // 每個值最多只有 BBOX_GRID_PRECISION 位小數
  for (const value of Object.values(q)) {
    const decimals = (String(value).split(".")[1] ?? "").length;
    assert.ok(decimals <= BBOX_GRID_PRECISION, `${value} 小數位過多`);
  }
});

test("quantized bbox always covers the original viewport", () => {
  // 只能向外擴、不能向內縮，否則視窗邊緣的景點會查不到
  const q = quantizeBbox(RAW);
  assert.ok(q.minLng <= RAW.minLng);
  assert.ok(q.minLat <= RAW.minLat);
  assert.ok(q.maxLng >= RAW.maxLng);
  assert.ok(q.maxLat >= RAW.maxLat);
});

test("tiny map movements collapse to the same query key", () => {
  // 這是省請求的關鍵：微小位移落在同一格 → 查詢條件完全相同 → React Query 命中快取
  const nudged = {
    minLng: RAW.minLng + 0.0000004,
    minLat: RAW.minLat + 0.0000004,
    maxLng: RAW.maxLng - 0.0000004,
    maxLat: RAW.maxLat - 0.0000004,
  };
  assert.deepEqual(quantizeBbox(nudged), quantizeBbox(RAW));
  // 未量化時兩者是不同的 key（對照組）
  assert.notDeepEqual(nudged, RAW);
});

test("quantize is idempotent and handles negative coordinates", () => {
  const once = quantizeBbox(RAW);
  assert.deepEqual(quantizeBbox(once), once);

  // 南半球 / 西半球：floor 與 ceil 在負數同樣要向外擴
  const southWest = { minLng: -74.0060152, minLat: -33.8688197, maxLng: -73.9, maxLat: -33.8 };
  const q = quantizeBbox(southWest);
  assert.ok(q.minLng <= southWest.minLng);
  assert.ok(q.minLat <= southWest.minLat);
  assert.ok(q.maxLng >= southWest.maxLng);
  assert.ok(q.maxLat >= southWest.maxLat);
});

test("debounce window stays below the perceptible delay threshold", () => {
  assert.ok(VIEWPORT_QUERY_DEBOUNCE_MS > 0);
  assert.ok(VIEWPORT_QUERY_DEBOUNCE_MS <= 400, "太長會讓使用者覺得圖釘沒更新");
});

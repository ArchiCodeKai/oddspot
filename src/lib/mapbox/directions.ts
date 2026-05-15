import type { LineString } from "geojson";

// Mapbox 多點路線規劃封裝。
//
// 兩個端點：
// - Optimization API（/optimized-trips/v1/）做順序最佳化（TSP）。3 點以上才用。
// - Directions API（/directions/v5/）只算路徑，不重排。2 點時用這個。
//
// 端點選擇邏輯藏在 fetchOptimizedRoute 內，呼叫者只需傳座標。

export type DirectionsProfile = "driving" | "walking" | "cycling";

interface LngLat {
  lat: number;
  lng: number;
}

export interface DirectionsRequest {
  origin: LngLat;
  destination: LngLat;
  waypoints?: LngLat[];
  profile?: DirectionsProfile;
}

export interface DirectionsResponse {
  geometry: LineString;
  distanceMeters: number;
  durationSeconds: number;
  /**
   * 對應輸入陣列的「新順序」index。
   * 例如輸入 [A, B, C, D]，最佳化後是 A→C→B→D，
   * 則 optimizedOrder = [0, 2, 1, 3]：
   *   新位置 0 ← 原 index 0（A）
   *   新位置 1 ← 原 index 2（C）
   *   新位置 2 ← 原 index 1（B）
   *   新位置 3 ← 原 index 3（D）
   *
   * 呼叫者可用 `optimizedOrder.map((i) => original[i])` 套用新順序。
   */
  optimizedOrder: number[];
}

const OPTIMIZE_BASE = "https://api.mapbox.com/optimized-trips/v1/mapbox";
const DIRECTIONS_BASE = "https://api.mapbox.com/directions/v5/mapbox";
const MAX_POINTS = 12; // Mapbox API 上限

function formatCoords(points: LngLat[]): string {
  return points.map((p) => `${p.lng},${p.lat}`).join(";");
}

interface MapboxWaypoint {
  waypoint_index: number;
  location: [number, number];
}

interface MapboxRoute {
  geometry: LineString;
  distance: number;
  duration: number;
}

export async function fetchOptimizedRoute(
  req: DirectionsRequest
): Promise<DirectionsResponse> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    throw new Error("NEXT_PUBLIC_MAPBOX_TOKEN 未設定");
  }

  const profile = req.profile ?? "driving";
  const points: LngLat[] = [
    req.origin,
    ...(req.waypoints ?? []),
    req.destination,
  ];

  if (points.length < 2) {
    throw new Error("路線至少需要兩點");
  }
  if (points.length > MAX_POINTS) {
    throw new Error(`Mapbox 上限 ${MAX_POINTS} 點`);
  }

  const useOptimize = points.length >= 3;
  const coords = formatCoords(points);

  const params = new URLSearchParams({
    geometries: "geojson",
    overview: "full",
    access_token: token,
  });

  if (useOptimize) {
    // 起點 / 終點鎖住不動，只重排中間點
    params.set("source", "first");
    params.set("destination", "last");
    params.set("roundtrip", "false");
  }

  const baseUrl = useOptimize ? OPTIMIZE_BASE : DIRECTIONS_BASE;
  const url = `${baseUrl}/${profile}/${coords}?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Directions API 失敗 (${res.status})`);
  }
  const data = await res.json();

  if (useOptimize) {
    const trips = data.trips as MapboxRoute[] | undefined;
    const waypoints = data.waypoints as MapboxWaypoint[] | undefined;
    if (!trips?.length || !waypoints?.length) {
      throw new Error("找不到可行路線");
    }
    const trip = trips[0];
    // Mapbox 回的 waypoints[originalIdx].waypoint_index = 該點在最佳化後的位置
    // 我們要的是相反映射：optimizedOrder[newPosition] = originalIdx
    const optimizedOrder = new Array<number>(waypoints.length);
    waypoints.forEach((wp, originalIdx) => {
      optimizedOrder[wp.waypoint_index] = originalIdx;
    });
    return {
      geometry: trip.geometry,
      distanceMeters: trip.distance,
      durationSeconds: trip.duration,
      optimizedOrder,
    };
  }

  // 2 點走 Directions API，順序不變
  const routes = data.routes as MapboxRoute[] | undefined;
  if (!routes?.length) {
    throw new Error("找不到可行路線");
  }
  const route = routes[0];
  return {
    geometry: route.geometry,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    optimizedOrder: [0, 1],
  };
}

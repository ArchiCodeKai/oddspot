import type { SpotMapPoint } from "@/types/spots";
import type { Bbox } from "@/store/useMapStore";

export interface SpotsListResponse {
  spots: SpotMapPoint[];
  nextCursor: string | null;
}

// 兩種查詢模式（擇一）：
//   1. radius: lat + lng + radius
//   2. viewport: bbox
export interface FetchSpotsParams {
  lat?: number;
  lng?: number;
  radius?: number;
  bbox?: Bbox | null;
  categories?: string[];
  cursor?: string;
}

export async function fetchSpots(params: FetchSpotsParams): Promise<SpotsListResponse> {
  const { lat, lng, radius, bbox, categories, cursor } = params;

  const searchParams = new URLSearchParams();

  if (bbox) {
    // viewport mode：bbox 優先
    searchParams.set("bbox", `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`);
  } else {
    // radius mode
    if (lat !== undefined) searchParams.set("lat", String(lat));
    if (lng !== undefined) searchParams.set("lng", String(lng));
    if (radius !== undefined) searchParams.set("radius", String(radius));
  }

  if (categories && categories.length > 0) {
    searchParams.set("categories", categories.join(","));
  }
  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  const res = await fetch(`/api/spots?${searchParams.toString()}`);

  if (!res.ok) {
    throw new Error(`取得景點失敗：${res.status} ${res.statusText}`);
  }

  const json: { data: SpotsListResponse; success: boolean; error?: string } = await res.json();

  if (!json.success) {
    throw new Error(json.error ?? "API 回應失敗");
  }

  return json.data;
}

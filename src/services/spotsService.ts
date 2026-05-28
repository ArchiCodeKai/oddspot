import type { SpotMapPoint } from "@/types/spots";
import type { Bbox } from "@/store/useMapStore";
import { buildSpotsSearchParams } from "./spotsQueryParams";

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
  status?: string[];
  difficulty?: string[];
  cursor?: string;
}

export async function fetchSpots(params: FetchSpotsParams): Promise<SpotsListResponse> {
  const searchParams = buildSpotsSearchParams(params);

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

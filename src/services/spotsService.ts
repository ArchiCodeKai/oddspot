import type { SpotMapPoint } from "@/types/spots";

export interface SpotsListResponse {
  spots: SpotMapPoint[];
  nextCursor: string | null;
}

export interface FetchSpotsParams {
  lat: number;
  lng: number;
  radius: number;
  categories?: string[];
  cursor?: string;
}

export async function fetchSpots(params: FetchSpotsParams): Promise<SpotsListResponse> {
  const { lat, lng, radius, categories, cursor } = params;

  const searchParams = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
  });

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

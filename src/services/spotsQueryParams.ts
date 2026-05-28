import type { Bbox } from "@/store/useMapStore";

export interface BuildSpotsSearchParamsInput {
  lat?: number;
  lng?: number;
  radius?: number;
  bbox?: Bbox | null;
  categories?: string[];
  status?: string[];
  difficulty?: string[];
  cursor?: string;
}

export function buildSpotsSearchParams({
  lat,
  lng,
  radius,
  bbox,
  categories,
  status,
  difficulty,
  cursor,
}: BuildSpotsSearchParamsInput): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (bbox) {
    searchParams.set("bbox", `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`);
  } else {
    if (lat !== undefined) searchParams.set("lat", String(lat));
    if (lng !== undefined) searchParams.set("lng", String(lng));
    if (radius !== undefined) searchParams.set("radius", String(radius));
  }

  if (categories && categories.length > 0) {
    searchParams.set("categories", categories.join(","));
  }
  if (status && status.length > 0) {
    searchParams.set("status", status.join(","));
  }
  if (difficulty && difficulty.length > 0) {
    searchParams.set("difficulty", difficulty.join(","));
  }
  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  return searchParams;
}

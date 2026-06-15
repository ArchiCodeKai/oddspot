import type { SpotStatus } from "@/lib/constants/status";

export interface DuplicateSpotCandidate {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: SpotStatus | string;
}

export interface DuplicateSpotInput {
  name: string;
  lat: number;
  lng: number;
}

export interface DuplicateSpotResult extends DuplicateSpotCandidate {
  reason: "same-name" | "nearby";
  distanceMeters: number;
}

export const DUPLICATE_RADIUS_METERS = 80;
export const DUPLICATE_SEARCH_DEGREES = DUPLICATE_RADIUS_METERS / 111_000;

const EARTH_RADIUS_METERS = 6_371_000;

export function normalizeSpotName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000()[\]{}【】（）「」『』,，.。·・_-]+/g, "");
}

export function getDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function findDuplicateSpot(
  input: DuplicateSpotInput,
  candidates: DuplicateSpotCandidate[],
  radiusMeters = DUPLICATE_RADIUS_METERS,
): DuplicateSpotResult | null {
  const normalizedInput = normalizeSpotName(input.name);

  for (const candidate of candidates) {
    if (normalizeSpotName(candidate.name) === normalizedInput) {
      return {
        ...candidate,
        reason: "same-name",
        distanceMeters: getDistanceMeters(input, candidate),
      };
    }
  }

  let nearest: DuplicateSpotResult | null = null;
  for (const candidate of candidates) {
    const distanceMeters = getDistanceMeters(input, candidate);
    if (distanceMeters > radiusMeters) continue;
    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = {
        ...candidate,
        reason: "nearby",
        distanceMeters,
      };
    }
  }

  return nearest;
}

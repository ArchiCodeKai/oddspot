import type { SpotMapPoint } from "../types/spots";

export const ROUTE_PLANNER_STORAGE_KEY = "oddspot-route";

interface RouteStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

function isRouteSpot(value: unknown): value is SpotMapPoint {
  if (!value || typeof value !== "object") return false;
  const spot = value as Partial<SpotMapPoint>;
  return (
    typeof spot.id === "string" &&
    typeof spot.name === "string" &&
    typeof spot.category === "string" &&
    typeof spot.status === "string" &&
    typeof spot.difficulty === "string" &&
    typeof spot.lat === "number" &&
    typeof spot.lng === "number" &&
    typeof spot.coverImage === "string"
  );
}

export function readRouteSpotsFromStorage(storage: RouteStorage | undefined): SpotMapPoint[] {
  if (!storage) return [];

  try {
    const raw = storage.getItem(ROUTE_PLANNER_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRouteSpot).slice(0, 5);
  } catch {
    return [];
  }
}

export function writeRouteSpotsToStorage(
  storage: RouteStorage | undefined,
  spots: SpotMapPoint[],
): void {
  if (!storage) return;

  if (spots.length === 0) {
    storage.removeItem(ROUTE_PLANNER_STORAGE_KEY);
    return;
  }

  storage.setItem(ROUTE_PLANNER_STORAGE_KEY, JSON.stringify(spots.slice(0, 5)));
}

export function getBrowserRouteStorage(): RouteStorage | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

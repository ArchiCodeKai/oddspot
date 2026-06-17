export interface ParsedGoogleMapsCoordinates {
  lat: number;
  lng: number;
}

const COORDINATE_PAIR_PATTERN = /(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/;
const GOOGLE_MAP_AT_PATTERN = /@(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)(?:[,/?]|$)/;
const GOOGLE_MAP_DATA_PATTERN = /!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/;

function normalizeCoordinate(lat: number, lng: number): ParsedGoogleMapsCoordinates | null {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function parseCoordinatePair(value: string): ParsedGoogleMapsCoordinates | null {
  const match = value.match(COORDINATE_PAIR_PATTERN);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return normalizeCoordinate(lat, lng);
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function isGoogleMapsShortUrl(input: string) {
  try {
    const url = new URL(input.trim());
    return url.protocol === "https:" && url.hostname === "maps.app.goo.gl";
  } catch {
    return false;
  }
}

export function parseGoogleMapsInput(input: string): ParsedGoogleMapsCoordinates | null {
  const value = input.trim();
  if (!value) return null;

  const decodedValue = safeDecode(value);

  try {
    const url = new URL(decodedValue);
    if (url.hostname === "maps.app.goo.gl") return null;

    const queryValue = url.searchParams.get("q") ?? url.searchParams.get("ll");
    if (queryValue) {
      const parsed = parseCoordinatePair(queryValue);
      if (parsed) return parsed;
    }
  } catch {
    // 不是 URL 時繼續用純文字座標解析。
  }

  const atMatch = decodedValue.match(GOOGLE_MAP_AT_PATTERN);
  if (atMatch) {
    const lat = Number(atMatch[1]);
    const lng = Number(atMatch[2]);
    const parsed = normalizeCoordinate(lat, lng);
    if (parsed) return parsed;
  }

  const dataMatch = decodedValue.match(GOOGLE_MAP_DATA_PATTERN);
  if (dataMatch) {
    const lat = Number(dataMatch[1]);
    const lng = Number(dataMatch[2]);
    const parsed = normalizeCoordinate(lat, lng);
    if (parsed) return parsed;
  }

  return parseCoordinatePair(decodedValue);
}

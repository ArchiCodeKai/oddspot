type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface ParsedGoogleMapsCoordinates {
  lat: number;
  lng: number;
}

const ALLOWED_GOOGLE_MAPS_HOSTS = new Set([
  "maps.app.goo.gl",
  "www.google.com",
  "google.com",
  "maps.google.com",
]);

const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 4_000;
const COORDINATE_PAIR_PATTERN = /(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/;
const GOOGLE_MAP_AT_PATTERN = /@(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)(?:[,/?]|$)/;
const GOOGLE_MAP_DATA_PATTERN = /!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/;

function isAllowedMapsHost(url: URL) {
  return url.protocol === "https:" && ALLOWED_GOOGLE_MAPS_HOSTS.has(url.hostname);
}

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

function parseGoogleMapsCoordinates(input: string): ParsedGoogleMapsCoordinates | null {
  const atMatch = input.match(GOOGLE_MAP_AT_PATTERN);
  if (atMatch) {
    const parsed = normalizeCoordinate(Number(atMatch[1]), Number(atMatch[2]));
    if (parsed) return parsed;
  }

  const dataMatch = input.match(GOOGLE_MAP_DATA_PATTERN);
  if (dataMatch) {
    const parsed = normalizeCoordinate(Number(dataMatch[1]), Number(dataMatch[2]));
    if (parsed) return parsed;
  }

  try {
    const url = new URL(input);
    const queryValue = url.searchParams.get("q") ?? url.searchParams.get("ll");
    if (queryValue) return parseCoordinatePair(queryValue);
  } catch {
    return parseCoordinatePair(input);
  }

  return parseCoordinatePair(input);
}

function isGoogleMapsShortUrl(input: string) {
  try {
    const url = new URL(input.trim());
    return url.protocol === "https:" && url.hostname === "maps.app.goo.gl";
  } catch {
    return false;
  }
}

async function fetchWithoutBody(url: string, fetchImpl: FetchLike) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetchImpl(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "OddSpot/1.0 maps resolver",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveGoogleMapsShortUrl(
  input: string,
  fetchImpl: FetchLike = fetch,
): Promise<ParsedGoogleMapsCoordinates> {
  if (!isGoogleMapsShortUrl(input)) {
    throw new Error("只支援 Google Maps 手機分享短網址");
  }

  let currentUrl = new URL(input.trim());

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    if (!isAllowedMapsHost(currentUrl)) {
      throw new Error("不支援的 Google Maps 轉址");
    }

    const parsed = parseGoogleMapsCoordinates(currentUrl.href);
    if (parsed) return parsed;

    const response = await fetchWithoutBody(currentUrl.href, fetchImpl);
    const location = response.headers.get("location");

    if (response.status >= 300 && response.status < 400 && location) {
      const nextUrl = new URL(location, currentUrl);
      if (!isAllowedMapsHost(nextUrl)) {
        throw new Error("不支援的 Google Maps 轉址");
      }
      currentUrl = nextUrl;
      continue;
    }

    const responseUrl = response.url ? new URL(response.url) : currentUrl;
    if (isAllowedMapsHost(responseUrl)) {
      const responseParsed = parseGoogleMapsCoordinates(responseUrl.href);
      if (responseParsed) return responseParsed;
    }

    throw new Error("讀不到 Google Maps 座標");
  }

  throw new Error("Google Maps 轉址過多");
}

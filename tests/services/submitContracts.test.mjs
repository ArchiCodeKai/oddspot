import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const apiSource = readFileSync("src/app/api/spots/route.ts", "utf8");
const submitSource = readFileSync("src/app/submit/page.tsx", "utf8");
const validationSource = readFileSync("src/lib/validation.ts", "utf8");
const uploadRoutePath = "src/app/api/uploads/spots/route.ts";
const uploadSource = existsSync(uploadRoutePath) ? readFileSync(uploadRoutePath, "utf8") : "";
const mapsResolveRoutePath = "src/app/api/maps/resolve/route.ts";
const mapsResolveSource = existsSync(mapsResolveRoutePath) ? readFileSync(mapsResolveRoutePath, "utf8") : "";

test("public spots API excludes moderation-only statuses even when status query is provided", () => {
  assert.match(apiSource, /PUBLIC_SPOT_STATUSES/);
  assert.match(apiSource, /const publicStatuses =/);
  assert.match(apiSource, /PUBLIC_SPOT_STATUSES\.includes/);
  assert.match(apiSource, /status: \{ in: publicStatuses \}/);
});

test("submit schema accepts only a bounded compressed image data URL array", () => {
  assert.match(validationSource, /imageDataUrlSchema/);
  assert.match(validationSource, /imageDataUrls/);
  assert.match(validationSource, /z\.array\(imageDataUrlSchema\)\.max\(3/);
  assert.equal(validationSource.includes("data:image\\/(jpeg|png|webp);base64,"), true);
  assert.match(validationSource, /MAX_SUBMIT_IMAGE_DATA_URL_LENGTH/);
});

test("submit schema accepts a bounded HTTPS image URL array for blob uploads", () => {
  assert.match(validationSource, /imageUrls/);
  assert.match(validationSource, /z\.array\(imageUrlSchema\)\.max\(3/);
  assert.match(validationSource, /圖片網址必須使用 https/);
});

test("spot image upload route stores authenticated compressed photos in Vercel Blob", () => {
  assert.equal(existsSync(uploadRoutePath), true);
  assert.match(uploadSource, /@vercel\/blob/);
  assert.match(uploadSource, /put\(/);
  assert.match(uploadSource, /auth\(\)/);
  assert.match(uploadSource, /BLOB_READ_WRITE_TOKEN/);
  assert.match(uploadSource, /image\/jpeg/);
  assert.match(uploadSource, /image\/png/);
  assert.match(uploadSource, /image\/webp/);
  assert.match(uploadSource, /MAX_UPLOAD_BYTES/);
});

test("google maps paste parser extracts coordinates from common map formats", async () => {
  const { isGoogleMapsShortUrl, parseGoogleMapsInput } = await import("../../src/lib/submit/googleMapsPaste.ts");

  assert.deepEqual(parseGoogleMapsInput("25.0478, 121.5319"), {
    lat: 25.0478,
    lng: 121.5319,
  });
  assert.deepEqual(parseGoogleMapsInput("https://www.google.com/maps/@25.0478,121.5319,17z"), {
    lat: 25.0478,
    lng: 121.5319,
  });
  assert.deepEqual(parseGoogleMapsInput("https://www.google.com/maps?q=25.0478,121.5319"), {
    lat: 25.0478,
    lng: 121.5319,
  });
  assert.equal(parseGoogleMapsInput("https://maps.app.goo.gl/example"), null);
  assert.equal(isGoogleMapsShortUrl("https://maps.app.goo.gl/jR3EGXTdzx1qqhbU8?g_st=ic"), true);
  assert.equal(isGoogleMapsShortUrl("https://www.google.com/maps/@25.0478,121.5319,17z"), false);
});

test("google maps short link resolver follows only allowed maps redirects", async () => {
  const { resolveGoogleMapsShortUrl } = await import("../../src/lib/submit/googleMapsResolve.ts");

  const fetches = [];
  const mockFetch = async (url) => {
    fetches.push(String(url));
    if (String(url).startsWith("https://maps.app.goo.gl/")) {
      return new Response(null, {
        status: 302,
        headers: {
          location: "https://www.google.com/maps/place/test/@25.0478,121.5319,17z",
        },
      });
    }
    return new Response(null, { status: 200 });
  };

  assert.deepEqual(
    await resolveGoogleMapsShortUrl("https://maps.app.goo.gl/jR3EGXTdzx1qqhbU8?g_st=ic", mockFetch),
    { lat: 25.0478, lng: 121.5319 },
  );
  assert.deepEqual(fetches, [
    "https://maps.app.goo.gl/jR3EGXTdzx1qqhbU8?g_st=ic",
  ]);

  await assert.rejects(
    () => resolveGoogleMapsShortUrl(
      "https://maps.app.goo.gl/jR3EGXTdzx1qqhbU8",
      async () => new Response(null, {
        status: 302,
        headers: { location: "https://example.com/not-allowed" },
      }),
    ),
    /不支援的 Google Maps 轉址/,
  );
});

test("maps resolve API is authenticated and rate limited", () => {
  assert.equal(existsSync(mapsResolveRoutePath), true);
  assert.match(mapsResolveSource, /auth\(\)/);
  assert.match(mapsResolveSource, /resolveGoogleMapsShortUrl/);
  assert.match(mapsResolveSource, /checkRateLimit/);
  assert.match(mapsResolveSource, /maps-resolve/);
});

test("submit page exposes maps paste and compressed photo upload controls", () => {
  assert.match(submitSource, /parseGoogleMapsInput/);
  assert.match(submitSource, /compressSubmitImage/);
  assert.match(submitSource, /imageUrls/);
  assert.match(submitSource, /uploadSubmitPhoto/);
  assert.match(submitSource, /fetch\("\/api\/uploads\/spots"/);
  assert.doesNotMatch(submitSource, /imageDataUrls: imageDataUrls/);
  assert.match(submitSource, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(submitSource, /Google Maps/);
});

test("submit page makes maps paste the primary location input", () => {
  assert.match(submitSource, /貼上 Google Maps 連結或座標/);
  assert.match(submitSource, /handleMapPasteChange/);
  assert.match(submitSource, /已讀取座標/);
  assert.match(submitSource, /進階座標/);
  assert.match(submitSource, /LocationPreview/);
  assert.match(submitSource, /resolveGoogleMapsShortLink/);
  assert.match(submitSource, /\/api\/maps\/resolve/);
  assert.doesNotMatch(submitSource, />解析</);
});

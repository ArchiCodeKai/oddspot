import assert from "node:assert/strict";
import test from "node:test";

const { resolveGoogleMapsShortUrl } = await import(
  "../../src/lib/submit/googleMapsResolve.ts"
);

function redirectResponse(location) {
  return {
    status: 302,
    url: "",
    headers: { get: (name) => (name.toLowerCase() === "location" ? location : null) },
  };
}

test("resolves coordinates after a redirect to an allowed maps URL", async () => {
  const fetchImpl = async () =>
    redirectResponse("https://www.google.com/maps/place/x/@25.0478,121.5319,17z");
  const parsed = await resolveGoogleMapsShortUrl(
    "https://maps.app.goo.gl/AbCd123",
    fetchImpl,
  );
  assert.deepEqual(parsed, { lat: 25.0478, lng: 121.5319 });
});

test("rejects redirects that leave the google maps host allowlist", async () => {
  const fetchImpl = async () => redirectResponse("https://evil.example.com/@25.0,121.5");
  await assert.rejects(
    () => resolveGoogleMapsShortUrl("https://maps.app.goo.gl/AbCd123", fetchImpl),
    /不支援的 Google Maps 轉址/,
  );
});

test("rejects inputs that are not maps short links without fetching", async () => {
  let fetched = false;
  const fetchImpl = async () => {
    fetched = true;
    return redirectResponse("https://www.google.com/maps/@25,121");
  };
  await assert.rejects(
    () => resolveGoogleMapsShortUrl("https://www.google.com/maps/@25.0,121.5", fetchImpl),
    /只支援 Google Maps 手機分享短網址/,
  );
  assert.equal(fetched, false);
});

test("gives up after too many coordinate-less redirects", async () => {
  // 一直轉向另一個沒座標的短網址 → 超過上限擲出錯誤
  const fetchImpl = async () => redirectResponse("https://maps.app.goo.gl/next-hop");
  await assert.rejects(
    () => resolveGoogleMapsShortUrl("https://maps.app.goo.gl/loop", fetchImpl),
    /Google Maps 轉址過多/,
  );
});

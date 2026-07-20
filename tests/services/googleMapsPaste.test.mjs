import assert from "node:assert/strict";
import test from "node:test";

const { parseGoogleMapsInput, isGoogleMapsShortUrl } = await import(
  "../../src/lib/submit/googleMapsPaste.ts"
);

test("parses a plain coordinate pair with spaces", () => {
  assert.deepEqual(parseGoogleMapsInput("25.033, 121.565"), {
    lat: 25.033,
    lng: 121.565,
  });
});

test("parses the @lat,lng segment of a full maps URL", () => {
  const url = "https://www.google.com/maps/place/somewhere/@25.0478,121.5319,17z/data=abc";
  assert.deepEqual(parseGoogleMapsInput(url), { lat: 25.0478, lng: 121.5319 });
});

test("parses the !3d!4d data segment of a place URL", () => {
  const url = "https://www.google.com/maps/place/x/data=!3m1!4b1!4m6!3m5!3d25.1234!4d121.5678";
  assert.deepEqual(parseGoogleMapsInput(url), { lat: 25.1234, lng: 121.5678 });
});

test("parses the q= query parameter form", () => {
  assert.deepEqual(parseGoogleMapsInput("https://maps.google.com/?q=22.9997,120.227"), {
    lat: 22.9997,
    lng: 120.227,
  });
});

test("short links are detected but never parsed locally", () => {
  const short = "https://maps.app.goo.gl/AbCdEf123";
  assert.equal(isGoogleMapsShortUrl(short), true);
  // 短網址本身沒座標，交給 resolver，本地解析回 null
  assert.equal(parseGoogleMapsInput(short), null);
  // http 或其他 host 都不算短網址
  assert.equal(isGoogleMapsShortUrl("http://maps.app.goo.gl/AbCdEf123"), false);
  assert.equal(isGoogleMapsShortUrl("https://evil.example.com/AbCdEf123"), false);
});

test("rejects out-of-range coordinates and garbage input", () => {
  assert.equal(parseGoogleMapsInput("95.0, 121.5"), null);
  assert.equal(parseGoogleMapsInput("25.0, 200.1"), null);
  assert.equal(parseGoogleMapsInput("不是座標的文字"), null);
  assert.equal(parseGoogleMapsInput(""), null);
});

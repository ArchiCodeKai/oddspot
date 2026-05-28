import test from "node:test";
import assert from "node:assert/strict";
import { buildSpotsSearchParams } from "../../src/services/spotsQueryParams.ts";

test("builds search params with all spot filters", () => {
  const params = buildSpotsSearchParams({
    lat: 25.0478,
    lng: 121.5319,
    radius: 20,
    categories: ["giant-object", "graffiti"],
    status: ["active", "uncertain"],
    difficulty: ["easy", "hard"],
  });

  assert.equal(params.get("lat"), "25.0478");
  assert.equal(params.get("lng"), "121.5319");
  assert.equal(params.get("radius"), "20");
  assert.equal(params.get("categories"), "giant-object,graffiti");
  assert.equal(params.get("status"), "active,uncertain");
  assert.equal(params.get("difficulty"), "easy,hard");
});

test("uses bbox mode without radius coordinates", () => {
  const params = buildSpotsSearchParams({
    bbox: {
      minLng: 121.1,
      minLat: 24.9,
      maxLng: 121.7,
      maxLat: 25.3,
    },
    categories: [],
    status: [],
    difficulty: [],
  });

  assert.equal(params.get("bbox"), "121.1,24.9,121.7,25.3");
  assert.equal(params.has("lat"), false);
  assert.equal(params.has("lng"), false);
  assert.equal(params.has("radius"), false);
  assert.equal(params.has("categories"), false);
  assert.equal(params.has("status"), false);
  assert.equal(params.has("difficulty"), false);
});

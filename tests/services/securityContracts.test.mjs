import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const spotsRouteSource = readFileSync("src/app/api/spots/route.ts", "utf8");
const uploadRouteSource = readFileSync("src/app/api/uploads/spots/route.ts", "utf8");
const adminSpotRouteSource = readFileSync("src/app/api/admin/spots/[id]/route.ts", "utf8");
const statusSource = readFileSync("src/lib/constants/status.ts", "utf8");

test("public spots API excludes moderation-only statuses from query filters", () => {
  assert.match(statusSource, /"rejected"/);
  assert.match(spotsRouteSource, /PUBLIC_SPOT_STATUSES/);
  assert.match(spotsRouteSource, /PUBLIC_SPOT_STATUSES\.includes/);
  assert.doesNotMatch(spotsRouteSource, /value !== "pending"\)/);
});

test("spot submissions apply burst limit, daily limit, and duplicate guard", () => {
  assert.equal(existsSync("src/lib/security/rateLimit.ts"), true);
  assert.equal(existsSync("src/lib/spots/duplicate.ts"), true);
  assert.match(spotsRouteSource, /checkRateLimit/);
  assert.match(spotsRouteSource, /SPOT_SUBMIT_WINDOW_LIMIT/);
  assert.match(spotsRouteSource, /SPOT_DAILY_LIMIT/);
  assert.match(spotsRouteSource, /getTaipeiDayStart/);
  assert.match(spotsRouteSource, /findDuplicateSpot/);
  assert.match(spotsRouteSource, /status:\s*429/);
  assert.match(spotsRouteSource, /status:\s*409/);
});

test("photo uploads apply burst limit and DB-based daily limit before blob put", () => {
  assert.match(uploadRouteSource, /checkRateLimit/);
  assert.match(uploadRouteSource, /UPLOAD_WINDOW_LIMIT/);
  assert.match(uploadRouteSource, /UPLOAD_DAILY_LIMIT/);
  assert.match(uploadRouteSource, /status:\s*429/);
  // 每日上限改用 DB 計數（跨 instance 正確，AD-7）
  assert.match(uploadRouteSource, /prisma\.uploadLog\.count/);
  assert.match(uploadRouteSource, /getTaipeiDayStart/);
  assert.match(uploadRouteSource, /evaluateDailyLimit/);
  // 上傳成功後寫入紀錄供計數
  assert.match(uploadRouteSource, /prisma\.uploadLog\.create/);
  assert.doesNotMatch(uploadRouteSource, /checkDailyMemoryLimit/);
});

test("admin reject cleans blob images and preserves rejected submission status", () => {
  assert.match(adminSpotRouteSource, /@vercel\/blob/);
  assert.match(adminSpotRouteSource, /del\(/);
  assert.match(adminSpotRouteSource, /status:\s*"rejected"/);
  assert.match(adminSpotRouteSource, /images:\s*JSON\.stringify\(\[\]\)/);
  assert.doesNotMatch(adminSpotRouteSource, /prisma\.spot\.delete/);
});

test("admin reject stores a reason and public spot APIs never expose it", () => {
  const validationSource = readFileSync("src/lib/validation.ts", "utf8");
  const spotByIdRouteSource = readFileSync("src/app/api/spots/[id]/route.ts", "utf8");
  // reject 可附原因，未填存預設文案；Zod 限 200 字
  assert.match(validationSource, /rejectReason/);
  assert.match(validationSource, /max\(200/);
  assert.match(adminSpotRouteSource, /rejectReason/);
  assert.match(adminSpotRouteSource, /DEFAULT_REJECT_REASON/);
  // 公開 API 不回傳 rejectReason
  assert.doesNotMatch(spotsRouteSource, /rejectReason/);
  assert.doesNotMatch(spotByIdRouteSource, /rejectReason/);
});

test("admin-only production readiness and blob smoke routes exist", () => {
  const healthPath = "src/app/api/admin/health/route.ts";
  const blobSmokePath = "src/app/api/admin/blob-smoke/route.ts";
  assert.equal(existsSync("src/lib/ops/productionChecks.ts"), true);
  assert.equal(existsSync(healthPath), true);
  assert.equal(existsSync(blobSmokePath), true);

  const healthSource = readFileSync(healthPath, "utf8");
  const blobSmokeSource = readFileSync(blobSmokePath, "utf8");
  assert.match(healthSource, /isAdminSession/);
  assert.match(healthSource, /getProductionReadiness/);
  assert.match(healthSource, /prisma\.\$queryRaw/);
  assert.match(blobSmokeSource, /isAdminSession/);
  assert.match(blobSmokeSource, /put\(/);
  assert.match(blobSmokeSource, /del\(/);
});

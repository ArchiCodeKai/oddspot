import assert from "node:assert/strict";
import test from "node:test";

const { evaluateDailyLimit, getTaipeiDayStart, UPLOAD_DAILY_LIMIT } =
  await import("../../src/lib/security/rateLimit.ts");

test("daily upload limit rejects the 16th photo of the day", () => {
  // 前 15 張放行
  for (let used = 0; used < UPLOAD_DAILY_LIMIT; used += 1) {
    assert.equal(
      evaluateDailyLimit(used, UPLOAD_DAILY_LIMIT).allowed,
      true,
      `第 ${used + 1} 張應放行`,
    );
  }
  // 已上傳 15 張時，第 16 張被拒
  assert.equal(evaluateDailyLimit(15, UPLOAD_DAILY_LIMIT).allowed, false);
});

test("daily upload limit reports remaining quota correctly", () => {
  assert.equal(evaluateDailyLimit(0, UPLOAD_DAILY_LIMIT).remaining, UPLOAD_DAILY_LIMIT - 1);
  assert.equal(evaluateDailyLimit(14, UPLOAD_DAILY_LIMIT).remaining, 0);
  assert.equal(evaluateDailyLimit(15, UPLOAD_DAILY_LIMIT).remaining, 0);
});

test("daily upload limit resets at the next Taipei day boundary", () => {
  const now = Date.now();
  const result = evaluateDailyLimit(0, UPLOAD_DAILY_LIMIT, now);
  const todayStart = getTaipeiDayStart(new Date(now)).getTime();
  const expectedReset = todayStart + 24 * 60 * 60 * 1000;
  assert.equal(result.resetAt.getTime(), expectedReset);
  assert.equal(result.resetAt.getTime() > now, true);
});

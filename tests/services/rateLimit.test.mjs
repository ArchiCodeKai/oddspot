import assert from "node:assert/strict";
import test from "node:test";

const {
  checkRateLimit,
  evaluateDailyLimit,
  formatRetryAfterSeconds,
  getTaipeiDayStart,
  UPLOAD_DAILY_LIMIT,
} = await import("../../src/lib/security/rateLimit.ts");

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

test("burst window rejects the request beyond the limit", () => {
  const now = 1_700_000_000_000;
  const key = "burst-reject-test";
  for (let i = 0; i < 3; i += 1) {
    assert.equal(checkRateLimit(key, 3, 60_000, now + i).allowed, true, `第 ${i + 1} 次應放行`);
  }
  const fourth = checkRateLimit(key, 3, 60_000, now + 10);
  assert.equal(fourth.allowed, false);
  assert.equal(fourth.remaining, 0);
});

test("burst window resets after the window expires", () => {
  const now = 1_700_100_000_000;
  const key = "burst-reset-test";
  for (let i = 0; i < 3; i += 1) checkRateLimit(key, 3, 60_000, now);
  assert.equal(checkRateLimit(key, 3, 60_000, now).allowed, false);
  // 窗口過期後重新計數
  const afterWindow = checkRateLimit(key, 3, 60_000, now + 60_001);
  assert.equal(afterWindow.allowed, true);
  assert.equal(afterWindow.remaining, 2);
});

test("burst window tracks each key independently", () => {
  const now = 1_700_200_000_000;
  for (let i = 0; i < 3; i += 1) checkRateLimit("burst-user-a", 3, 60_000, now);
  assert.equal(checkRateLimit("burst-user-a", 3, 60_000, now).allowed, false);
  assert.equal(checkRateLimit("burst-user-b", 3, 60_000, now).allowed, true);
});

test("retry-after header value is always at least one second", () => {
  const now = 1_700_300_000_000;
  assert.equal(formatRetryAfterSeconds(new Date(now + 200), now), "1");
  assert.equal(formatRetryAfterSeconds(new Date(now + 61_000), now), "61");
});

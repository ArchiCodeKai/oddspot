interface RateEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export const SPOT_SUBMIT_WINDOW_LIMIT = 6;
export const SPOT_SUBMIT_WINDOW_MS = 60_000;
export const SPOT_DAILY_LIMIT = 5;
export const UPLOAD_WINDOW_LIMIT = 20;
export const UPLOAD_WINDOW_MS = 60_000;
export const UPLOAD_DAILY_LIMIT = 15;

const DAY_MS = 24 * 60 * 60 * 1000;
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

const burstEntries = new Map<string, RateEntry>();

function cleanupExpired(entries: Map<string, RateEntry>, now: number) {
  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) {
      entries.delete(key);
    }
  }
}

export function getTaipeiDayStart(date = new Date()): Date {
  const taipeiTime = date.getTime() + TAIPEI_OFFSET_MS;
  const dayStartUtc = Math.floor(taipeiTime / DAY_MS) * DAY_MS - TAIPEI_OFFSET_MS;
  return new Date(dayStartUtc);
}

function getNextTaipeiDayStart(now: number): number {
  const currentStart = getTaipeiDayStart(new Date(now)).getTime();
  return currentStart + DAY_MS;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  cleanupExpired(burstEntries, now);

  const current = burstEntries.get(key);
  const entry =
    current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + windowMs };

  entry.count += 1;
  burstEntries.set(key, entry);

  const allowed = entry.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - entry.count),
    resetAt: new Date(entry.resetAt),
  };
}

// 每日照片上限改用 DB 計數（跨 instance 正確，見 AD-7）
// usedToday 為當日已成功上傳張數，由呼叫端以 prisma count 帶入
export function evaluateDailyLimit(
  usedToday: number,
  limit: number,
  now = Date.now(),
): RateLimitResult {
  const allowed = usedToday < limit;
  return {
    allowed,
    remaining: Math.max(0, limit - usedToday - (allowed ? 1 : 0)),
    resetAt: new Date(getNextTaipeiDayStart(now)),
  };
}

export function formatRetryAfterSeconds(resetAt: Date, now = Date.now()): string {
  return String(Math.max(1, Math.ceil((resetAt.getTime() - now) / 1000)));
}

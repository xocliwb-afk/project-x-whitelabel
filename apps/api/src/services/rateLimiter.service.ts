type Bucket = {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillPerSec: number;
};

const tokenBuckets = new Map<string, Bucket>();

type DailyEntry = {
  count: number;
  dayKey: string;
  lastSeen: number;
};

const dailyBuckets = new Map<string, DailyEntry>();

export const takeToken = (
  key: string,
  rpm: number
): { allowed: boolean; retryAfterSeconds: number } => {
  const now = Date.now();
  const capacity = Number.isFinite(rpm) && rpm > 0 ? rpm : 1;
  const refillPerSec = capacity / 60;

  const bucket = tokenBuckets.get(key) ?? {
    tokens: capacity,
    lastRefill: now,
    capacity,
    refillPerSec,
  };
  bucket.capacity = capacity;
  bucket.refillPerSec = refillPerSec;

  const deltaSec = Math.max(0, (now - bucket.lastRefill) / 1000);
  const safeRefillPerSec =
    Number.isFinite(refillPerSec) && refillPerSec > 0 ? refillPerSec : 1 / 60;

  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + deltaSec * bucket.refillPerSec);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    const missing = Math.max(0, 1 - bucket.tokens);
    const retryAfter = Math.min(300, Math.max(1, Math.ceil(missing / safeRefillPerSec)));
    tokenBuckets.set(key, bucket);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  bucket.tokens -= 1;
  tokenBuckets.set(key, bucket);
  return { allowed: true, retryAfterSeconds: 0 };
};

export const checkDailyLimit = (
  key: string,
  maxPerDay: number
): { allowed: boolean; retryAfterSeconds: number } => {
  if (!Number.isFinite(maxPerDay) || maxPerDay <= 0) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const now = Date.now();
  const dayKey = new Date(now).toISOString().slice(0, 10);
  const entry = dailyBuckets.get(key) ?? { count: 0, dayKey, lastSeen: now };

  if (entry.dayKey !== dayKey) {
    entry.dayKey = dayKey;
    entry.count = 0;
  }

  entry.lastSeen = now;

  if (entry.count >= maxPerDay) {
    // seconds until next day (rough)
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(24, 0, 0, 0);
    const secondsLeft = Math.max(1, Math.ceil((tomorrow.getTime() - now) / 1000));
    const retryAfter = Math.min(86400, secondsLeft);
    dailyBuckets.set(key, entry);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  entry.count += 1;
  dailyBuckets.set(key, entry);
  return { allowed: true, retryAfterSeconds: 0 };
};

export const cleanupDaily = () => {
  const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
  for (const [key, entry] of dailyBuckets.entries()) {
    if (entry.lastSeen < cutoff) {
      dailyBuckets.delete(key);
    }
  }
};

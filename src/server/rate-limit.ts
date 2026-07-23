interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(key: string, limit = 100, windowMs = 60000): { success: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter out timestamps outside the current window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= limit) {
    return {
      success: false,
      remaining: 0
    };
  }

  record.timestamps.push(now);

  return {
    success: true,
    remaining: limit - record.timestamps.length
  };
}

export function clearRateLimitStore() {
  rateLimitStore.clear();
}

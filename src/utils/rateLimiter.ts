const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Checks if a key (e.g. IP address or Telegram user ID) is rate-limited.
 * Operates in-memory and is local to the active serverless function instance.
 */
export function isRateLimited(
  key: string,
  limit = 20, // default max 20 requests
  windowMs = 60 * 1000 // default 1 minute window
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitCache.get(key);

  if (!record || now > record.resetTime) {
    const newRecord = { count: 1, resetTime: now + windowMs };
    rateLimitCache.set(key, newRecord);
    return { limited: false, remaining: limit - 1, resetTime: newRecord.resetTime };
  }

  if (record.count >= limit) {
    return { limited: true, remaining: 0, resetTime: record.resetTime };
  }

  record.count += 1;
  return { limited: false, remaining: limit - record.count, resetTime: record.resetTime };
}

/**
 * Periodically clears expired records to prevent memory leaks in long-lived warm instances.
 */
export function pruneCache(): void {
  const now = Date.now();
  rateLimitCache.forEach((record, key) => {
    if (now > record.resetTime) {
      rateLimitCache.delete(key);
    }
  });
}

// Automatically prune every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(pruneCache, 5 * 60 * 1000).unref?.();
}

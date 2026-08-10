'use strict';

// ES module version of retry utilities for environments that use import()

// retryInvoke(callable, options)
// callable: async function that returns { success: boolean, error?: string }
// options: { maxAttempts, backoffBaseMs, statusFn }

export function isRetryableMessage(msg) {
  if (!msg) return false;
  return /rate limit|rate-limited|429|timeout|timed out|network|ECONNRESET|ETIMEDOUT|502|503|504/i.test(msg);
}

export async function retryInvoke(callable, options = {}) {
  const maxAttempts = options.maxAttempts ?? 3;
  const backoffBaseMs = options.backoffBaseMs ?? 1000;
  const statusFn = options.statusFn;

  let attempt = 0;
  let lastRes = null;

  while (attempt < maxAttempts) {
    attempt += 1;
    if (statusFn) statusFn({ phase: 'attempt', attempt, maxAttempts });

    try {
      const res = await callable();
      lastRes = res;
      if (res && res.success) return res;

      // if user explicitly stopped, return immediately
      if (res && res.error === 'Stopped') return res;

      // if non-retryable error, return
      if (!isRetryableMessage(res && res.error)) return res;
    } catch (err) {
      lastRes = { success: false, error: String(err && err.message ? err.message : err) };
      if (!isRetryableMessage(lastRes.error)) return lastRes;
    }

    if (attempt >= maxAttempts) break;

    // exponential backoff with status countdown
    const delayMs = Math.min(30000, backoffBaseMs * Math.pow(2, attempt - 1));
    const secs = Math.ceil(delayMs / 1000);
    for (let s = secs; s >= 1; s--) {
      if (statusFn) statusFn({ phase: 'backoff', attempt, maxAttempts, secondsRemaining: s, message: lastRes && lastRes.error });
      // wait 1s
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return lastRes || { success: false, error: 'Unknown error' };
}

export default retryInvoke;

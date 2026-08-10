'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { retryInvoke, isRetryableMessage } = require('../src/retry');

describe('retryInvoke helper', () => {
  it('retries transient failures then succeeds', async () => {
    let calls = 0;
    const responses = [
      { success: false, error: '429 Too Many Requests' },
      { success: false, error: '502 Bad Gateway' },
      { success: true, data: { id: 1 } }
    ];
    const fn = async () => {
      calls += 1;
      const r = responses.shift();
      // simulate async delay
      await new Promise((r2) => setTimeout(r2, 5));
      return r;
    };

    const statusUpdates = [];
    const res = await retryInvoke(fn, { maxAttempts: 5, backoffBaseMs: 10, statusFn: (i) => statusUpdates.push(i) });
    assert.strictEqual(res.success, true);
    assert.ok(calls >= 3);
    // ensure we received attempt and backoff updates
    assert.ok(statusUpdates.some(u => u.phase === 'attempt'));
    assert.ok(statusUpdates.some(u => u.phase === 'backoff'));
  });

  it('does not retry non-retryable error', async () => {
    let calls = 0;
    const fn = async () => {
      calls += 1;
      return { success: false, error: 'Invalid API key' };
    };
    const res = await retryInvoke(fn, { maxAttempts: 4, backoffBaseMs: 10 });
    assert.strictEqual(res.success, false);
    assert.strictEqual(calls, 1);
  });

  it('isRetryableMessage detects transient errors', () => {
    assert.ok(isRetryableMessage('429'));
    assert.ok(isRetryableMessage('Timeout while connecting'));
    assert.ok(!isRetryableMessage('Invalid API key'));
  });
});
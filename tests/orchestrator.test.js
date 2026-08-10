'use strict';

const assert = require('node:assert');
const { describe, it } = require('node:test');
const { orchestrate } = require('../main/orchestrator');

const samplePrompt = `## Phase plan

0. Inventory
1. Style lock
2. Map generation ($generate2dmap)
3. Sprite generation ($generate2dsprite)
4. QA gate
5. Modular scaffold

## Requirements extracted

### Visual / assets
- maps
- sprites

`;

describe('orchestrator', () => {
  it('returns the plugin invocation plan without writing placeholder assets', async () => {
    const res = await orchestrate(samplePrompt, null);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.mode, 'plan-only');
    assert.ok(Array.isArray(res.steps));
    const plugins = res.steps.map((step) => step.plugin);
    assert.ok(plugins.includes('game-prompt-decomposer'));
    assert.ok(plugins.includes('asf-game-prototype'));
    assert.ok(plugins.includes('asf-style-qa-gate'));
    assert.ok(plugins.includes('canvas-platformer-scaffold'));
  });
});

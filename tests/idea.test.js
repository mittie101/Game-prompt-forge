'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { buildIdeaMessages, parseIdeaResponse } = require('../main/idea');

describe('idea expansion', () => {
  it('parses well-formed JSON response', () => {
    const res = parseIdeaResponse('{"genre": "vertical retro space shooter", "theme": "Alien fleets swarm a chrome nebula."}');
    assert.deepStrictEqual(res, { genre: 'vertical retro space shooter', theme: 'Alien fleets swarm a chrome nebula.' });
  });

  it('strips markdown fences before parsing', () => {
    const res = parseIdeaResponse('```json\n{"genre": "shmup", "theme": "test"}\n```');
    assert.deepStrictEqual(res, { genre: 'shmup', theme: 'test' });
  });

  it('rejects invalid JSON', () => {
    assert.strictEqual(parseIdeaResponse('not json'), null);
  });

  it('rejects empty genre and theme', () => {
    assert.strictEqual(parseIdeaResponse('{"genre": "", "theme": ""}'), null);
  });

  it('rejects null/empty input', () => {
    assert.strictEqual(parseIdeaResponse(''), null);
    assert.strictEqual(parseIdeaResponse(null), null);
  });

  it('buildIdeaMessages fences user input and includes idea text', () => {
    const msgs = buildIdeaMessages('alien spacecraft shmup');
    assert.strictEqual(msgs[0].role, 'system');
    assert.strictEqual(msgs[1].role, 'user');
    assert.ok(msgs[1].content.includes('alien spacecraft shmup'));
    assert.ok(msgs[1].content.includes('USER_INPUT_START'));
  });
});

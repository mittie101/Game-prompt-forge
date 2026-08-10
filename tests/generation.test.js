'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

const storage = require('../main/storage');
const providers = require('../main/providers');
const history = require('../ipc/history');
const generationPath = require.resolve('../ipc/generation');

const GOOD_PROMPT = `Build a complete playable browser-based 2D foo prototype.

You must use the Agent Sprite Forge skill to generate all visual assets needed for the game.

Use:
- $generate2dmap to create the map
- $generate2dsprite to create the hero

Core concept:
A hero explores a world.

Visual direction:
Pixel art style.
- consistent palette

Asset generation requirements:

Use $generate2dmap to create the map.

Use $generate2dsprite to create the hero sprite.

Gameplay:
Move around.

Controls:
WASD to move.

Project structure:
/project
  index.html
  /src
    main.js
  /assets
    /player

Required systems:
- movement
- collision

Polish:
Add:
- sparkle effect

Do not add:
- multiplayer

Very important:
Generate assets before coding.

Final expected result:
A complete playable prototype.`;

function loadHandler(t, { apiKey, streamChunks, streamError, saveGeneration }) {
  t.mock.method(storage, 'getApiKey', () => apiKey);
  t.mock.method(storage, 'loadSettings', () => ({ openai_model: 'gpt-4o', temperature: 0.7 }));
  t.mock.method(providers, 'streamChat', async function* () {
    if (streamError) throw streamError;
    for (const chunk of streamChunks || []) yield chunk;
  });
  t.mock.method(history, 'saveGeneration', saveGeneration || (() => 1));

  // generation.js destructures these at require-time, so re-require it fresh
  // now that the source modules carry the mocked implementations.
  delete require.cache[generationPath];
  const generation = require('../ipc/generation');
  const handlers = {};
  const ipcMain = { handle: (channel, fn) => { handlers[channel] = fn; } };
  generation.register(ipcMain, () => null);
  return handlers['prompt:generate'];
}

describe('prompt:generate handler', () => {
  it('rejects when no API key is set', async (t) => {
    const handle = loadHandler(t, { apiKey: null });
    const res = await handle({}, { genre: 'space shooter', theme: '' });
    assert.strictEqual(res.success, false);
    assert.match(res.error, /API key/);
  });

  it('rejects when genre and theme are both empty', async (t) => {
    const handle = loadHandler(t, { apiKey: 'sk-test' });
    const res = await handle({}, { genre: '  ', theme: '' });
    assert.strictEqual(res.success, false);
    assert.match(res.error, /genre or description/);
  });

  it('returns the generated prompt on success', async (t) => {
    const handle = loadHandler(t, { apiKey: 'sk-test', streamChunks: [GOOD_PROMPT] });
    const res = await handle({}, { genre: 'space shooter', theme: 'derelict station' });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.fullText, GOOD_PROMPT);
    assert.strictEqual(res.data.id, 1);
  });

  it('fails when the response does not match the library format', async (t) => {
    const handle = loadHandler(t, { apiKey: 'sk-test', streamChunks: ['not a valid library prompt'] });
    const res = await handle({}, { genre: 'space shooter', theme: '' });
    assert.strictEqual(res.success, false);
    assert.match(res.error, /did not match the library format/);
  });

  it('maps a 401 provider error to an invalid API key message', async (t) => {
    const err = new Error('Unauthorized');
    err.status = 401;
    const handle = loadHandler(t, { apiKey: 'sk-test', streamError: err });
    const res = await handle({}, { genre: 'space shooter', theme: '' });
    assert.strictEqual(res.success, false);
    assert.match(res.error, /API key invalid or revoked/);
  });

  it('maps a 429 provider error to a rate limit message', async (t) => {
    const err = new Error('Too Many Requests');
    err.status = 429;
    const handle = loadHandler(t, { apiKey: 'sk-test', streamError: err });
    const res = await handle({}, { genre: 'space shooter', theme: '' });
    assert.strictEqual(res.success, false);
    assert.match(res.error, /Rate limited/);
  });

  it('still returns the prompt when saving to history fails', async (t) => {
    const handle = loadHandler(t, {
      apiKey: 'sk-test',
      streamChunks: [GOOD_PROMPT],
      saveGeneration: () => { throw new Error('disk full'); }
    });
    const res = await handle({}, { genre: 'space shooter', theme: '' });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.id, null);
    assert.match(res.data.warning, /Could not save to history/);
  });
});

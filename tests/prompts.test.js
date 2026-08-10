'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { validatePrompt, buildMessages } = require('../main/prompts');

describe('prompt validation', () => {
  const good = `Build a complete playable browser-based 2D top-down cozy island farming RPG prototype.

You must use the Agent Sprite Forge skill to generate all visual assets needed for the game.

Use:
- $generate2dmap to create the island
- $generate2dsprite to create the farmer

Core concept:
A farmer explores a small island.

Visual direction:
Pixel art style.
- consistent palette
- consistent outline

Asset generation requirements:

Use $generate2dmap to create the map.

Use $generate2dsprite to create the farmer sprite.

Gameplay:
Move around and farm.

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

  it('accepts well-formed library-style prompt', () => {
    assert.strictEqual(validatePrompt(good), true);
  });

  it('rejects missing opening line', () => {
    assert.strictEqual(validatePrompt(good.replace('Build a complete playable browser-based 2D top-down cozy island farming RPG prototype.', 'Something else.')), false);
  });

  it('rejects missing Agent Sprite Forge', () => {
    assert.strictEqual(validatePrompt(good.replace(/Agent Sprite Forge/g, 'Sprite Tool')), false);
  });

  it('rejects a single collapsed $generate block instead of two distinct sections', () => {
    const collapsed = good.replace('Use $generate2dmap to create the map.\n\nUse $generate2dsprite to create the farmer sprite.', '');
    assert.strictEqual(validatePrompt(collapsed), false);
  });

  it('rejects missing Core concept section', () => {
    assert.strictEqual(validatePrompt(good.replace('Core concept:\nA farmer explores a small island.\n\n', '')), false);
  });

  it('rejects missing Controls section', () => {
    assert.strictEqual(validatePrompt(good.replace('Controls:\nWASD to move.\n\n', '')), false);
  });

  it('rejects missing Project structure / file tree', () => {
    const withoutStructure = good.replace(
      'Project structure:\n/project\n  index.html\n  /src\n    main.js\n  /assets\n    /player\n\n',
      ''
    );
    assert.strictEqual(validatePrompt(withoutStructure), false);
  });

  it('rejects missing Required systems section', () => {
    assert.strictEqual(validatePrompt(good.replace('Required systems:\n- movement\n- collision\n\n', '')), false);
  });

  it('rejects missing Polish / Do not add sections', () => {
    assert.strictEqual(validatePrompt(good.replace('Polish:\nAdd:\n- sparkle effect\n\nDo not add:\n- multiplayer\n\n', '')), false);
  });

  it('rejects missing Very important reminder', () => {
    assert.strictEqual(validatePrompt(good.replace('Very important:\nGenerate assets before coding.\n\n', '')), false);
  });

  it('rejects missing Final expected result', () => {
    assert.strictEqual(validatePrompt(good.replace('Final expected result:\nA complete playable prototype.', '')), false);
  });

  it('buildMessages includes system + examples + user', () => {
    const msgs = buildMessages({
      genre: 'tower defense',
      theme: 'clockwork',
      examples: [{ genre: 'a', theme: 'b', prompt: good }]
    });
    assert.ok(msgs.length >= 3);
    assert.strictEqual(msgs[0].role, 'system');
    const finalUser = msgs[msgs.length - 1];
    assert.strictEqual(finalUser.role, 'user');
    assert.ok(finalUser.content.includes('tower defense'));
    assert.ok(finalUser.content.includes('clockwork'));
    assert.ok(finalUser.content.includes('USER_INPUT_START'));
  });
});

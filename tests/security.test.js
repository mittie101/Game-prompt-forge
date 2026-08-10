'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

describe('security invariants', () => {
  it('preload only exposes allowed channels', () => {
    const src = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
    assert.ok(src.includes('contextBridge.exposeInMainWorld'));
    assert.ok(src.includes('allowedInvoke'));
    assert.ok(src.includes('allowedOn'));
    assert.ok(!src.includes('nodeIntegration: true'));
  });

  it('window uses secure webPreferences', () => {
    const src = fs.readFileSync(path.join(root, 'main', 'window.js'), 'utf8');
    assert.ok(src.includes('nodeIntegration: false'));
    assert.ok(src.includes('contextIsolation: true'));
    assert.ok(src.includes('sandbox: true'));
  });

  it('api key never sent to renderer via IPC payload shapes', () => {
    const gen = fs.readFileSync(path.join(root, 'ipc', 'generation.js'), 'utf8');
    // ensure we never send the key value over IPC
    assert.ok(!/webContents\.send\([^)]*apiKey/i.test(gen));
    const pre = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
    assert.ok(!pre.includes('getApiKey'));
  });
});

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const index = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');

describe('CSP, accessibility, and settings UI', () => {
  it('removes unsafe-inline from CSP', () => {
    assert.ok(!/unsafe-inline/.test(index), 'unsafe-inline should not appear in index.html CSP');
    assert.ok(/connect-src 'self' https:\/\/api.openai.com/.test(index));
  });

  it('settings modal has proper ARIA attributes', () => {
    assert.ok(/role="dialog"/.test(index), 'modal should have role="dialog"');
    assert.ok(/aria-modal="true"/.test(index), 'modal should have aria-modal="true"');
    assert.ok(/id="settings-title"/.test(index), 'modal should have labelledby id');
  });

  it('api key toggle exists and app binds a toggle function', () => {
    assert.ok(/btn-toggle-api-key/.test(index), 'toggle button should exist in index.html');
    assert.ok(/toggleApiKeyVisibility/.test(appJs), 'app.js should include toggleApiKeyVisibility function');
    assert.ok(/modalKeyHandler/.test(appJs), 'app.js should include modalKeyHandler for trapping focus');
    assert.ok(/globalKeyHandler/.test(appJs), 'app.js should include globalKeyHandler for shortcuts');
  });
});
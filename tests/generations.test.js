'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const config = require('../main/config');
const tmpDb = path.join(os.tmpdir(), `gpf-test-${process.pid}-${Date.now()}.db`);
config.DB_PATH = tmpDb;

const db = require('../main/db');
const generations = require('../main/generations');

describe('generations SQL store', () => {
  before(() => {
    db.getDb();
  });

  after(() => {
    db.close();
    for (const suffix of ['', '-wal', '-shm']) {
      fs.rmSync(tmpDb + suffix, { force: true });
    }
  });

  beforeEach(() => {
    db.getDb().exec('DELETE FROM generations');
    config.HISTORY_CAP = 50;
  });

  it('save then list returns newest first', () => {
    const id1 = generations.save({ genre: 'a', theme: 'x', promptText: 'p1' });
    const id2 = generations.save({ genre: 'b', theme: 'y', promptText: 'p2' });
    const list = generations.list(10);
    assert.strictEqual(list.length, 2);
    assert.strictEqual(list[0].id, id2);
    assert.strictEqual(list[1].id, id1);
  });

  it('get returns the full row including prompt_text', () => {
    const id = generations.save({ genre: 'c', theme: 'z', promptText: 'full text' });
    const row = generations.get(id);
    assert.strictEqual(row.prompt_text, 'full text');
  });

  it('get returns null for a missing id', () => {
    assert.strictEqual(generations.get(999999), null);
  });

  it('remove deletes a row', () => {
    const id = generations.save({ genre: 'd', theme: 'w', promptText: 'gone' });
    generations.remove(id);
    assert.strictEqual(generations.get(id), null);
  });

  it('save trims history beyond HISTORY_CAP', () => {
    config.HISTORY_CAP = 3;
    for (let i = 0; i < 5; i++) {
      generations.save({ genre: 'cap', theme: `t${i}`, promptText: `p${i}` });
    }
    const list = generations.list(10);
    assert.strictEqual(list.length, 3);
  });
});

'use strict';

const Database = require('better-sqlite3');
const config = require('./config');
const path = require('path');
const fs = require('fs');

let db = null;

function getDb() {
  if (db) return db;
  const dbPath = config.dbPath;
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  require('./migrations').run(db);
  migrateJsonHistory(db);
  return db;
}

function migrateJsonHistory(db) {
  const jsonPath = path.join(path.dirname(config.dbPath), 'history.json');
  if (!fs.existsSync(jsonPath)) return;
  const row = db.prepare('SELECT COUNT(*) AS c FROM generations').get();
  if (row.c > 0) return;
  let items;
  try {
    items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch {
    return;
  }
  if (!Array.isArray(items) || !items.length) return;
  const insert = db.prepare(
    'INSERT INTO generations (genre, theme, prompt_text, created_at) VALUES (?, ?, ?, ?)'
  );
  const tx = db.transaction((rows) => {
    for (const it of rows) {
      insert.run(it.genre || '', it.theme || '', it.prompt_text || '', it.created_at || Date.now());
    }
  });
  tx(items);
  fs.renameSync(jsonPath, jsonPath + '.migrated');
}

function close() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, close };

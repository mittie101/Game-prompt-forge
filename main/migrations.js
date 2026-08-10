'use strict';

const TARGET = 1;

function run(db) {
  const row = db.prepare('PRAGMA user_version').get();
  let version = row.user_version || 0;

  if (version < 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS generations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        genre TEXT NOT NULL,
        theme TEXT NOT NULL,
        prompt_text TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_generations_created ON generations(created_at DESC);
    `);
    db.pragma('user_version = 1');
    version = 1;
  }
}

module.exports = { run, TARGET };

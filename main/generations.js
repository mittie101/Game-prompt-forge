'use strict';

const { getDb } = require('./db');
const config = require('./config');

function list(limit = config.HISTORY_CAP) {
  const db = getDb();
  return db.prepare(
    'SELECT id, genre, theme, created_at FROM generations ORDER BY created_at DESC, id DESC LIMIT ?'
  ).all(limit);
}

function get(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM generations WHERE id = ?').get(id) || null;
}

function remove(id) {
  const db = getDb();
  db.prepare('DELETE FROM generations WHERE id = ?').run(id);
}

function save({ genre, theme, promptText }) {
  const db = getDb();
  const info = db.prepare(
    'INSERT INTO generations (genre, theme, prompt_text, created_at) VALUES (?, ?, ?, ?)'
  ).run(genre, theme, promptText, Date.now());
  db.prepare(
    `DELETE FROM generations WHERE id NOT IN (
       SELECT id FROM generations ORDER BY created_at DESC, id DESC LIMIT ?
     )`
  ).run(config.HISTORY_CAP);
  return info.lastInsertRowid;
}

module.exports = { list, get, remove, save };

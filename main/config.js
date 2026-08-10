'use strict';

const path = require('path');

module.exports = {
  APP_NAME: 'Game Prompt Forge',
  DEFAULT_MODEL: 'gpt-4o',
  DEFAULT_TEMPERATURE: 0.7,
  MAX_TOKENS: 8000,
  GENRE_MAX: 120,
  THEME_MAX: 500,
  IDEA_MAX: 200,
  IDEA_MAX_TOKENS: 300,
  HISTORY_CAP: 50,
  OPENAI_BASE: 'https://api.openai.com/v1',
  CSP_CONNECT_SRC: ["'self'", 'https://api.openai.com'],
  USER_DATA_DIR: null, // set at runtime
  DB_PATH: null,
  get dbPath() {
    if (!this.DB_PATH) {
      const { app } = require('electron');
      this.USER_DATA_DIR = app.getPath('userData');
      this.DB_PATH = path.join(this.USER_DATA_DIR, 'game-prompt-forge.db');
    }
    return this.DB_PATH;
  }
};

'use strict';

const { safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const SETTINGS_FILE = () => path.join(config.USER_DATA_DIR || require('electron').app.getPath('userData'), 'settings.json');

function isEncryptionAvailable() {
  return safeStorage.isEncryptionAvailable();
}

function setApiKey(plain) {
  if (!isEncryptionAvailable()) {
    throw new Error('OS secure storage unavailable – cannot save API key');
  }
  const encrypted = safeStorage.encryptString(String(plain || ''));
  const file = path.join(require('electron').app.getPath('userData'), 'api-key.bin');
  fs.writeFileSync(file, encrypted);
}

function getApiKey() {
  if (!isEncryptionAvailable()) return null;
  const file = path.join(require('electron').app.getPath('userData'), 'api-key.bin');
  if (!fs.existsSync(file)) return null;
  try {
    const buf = fs.readFileSync(file);
    return safeStorage.decryptString(buf);
  } catch {
    return null;
  }
}

function hasApiKey() {
  return !!getApiKey();
}

function loadSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return {
      openai_model: config.DEFAULT_MODEL,
      temperature: config.DEFAULT_TEMPERATURE
    };
  }
}

function saveSettings(obj) {
  const dir = path.dirname(SETTINGS_FILE());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE(), JSON.stringify(obj, null, 2));
}

module.exports = {
  isEncryptionAvailable,
  setApiKey,
  getApiKey,
  hasApiKey,
  loadSettings,
  saveSettings
};

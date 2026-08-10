'use strict';

const storage = require('../main/storage');
const config = require('../main/config');

function register(ipcMain) {
  ipcMain.handle('settings:get', () => {
    try {
      const s = storage.loadSettings();
      return {
        success: true,
        data: {
          openai_model: s.openai_model || config.DEFAULT_MODEL,
          temperature: s.temperature ?? config.DEFAULT_TEMPERATURE,
          hasKey: storage.hasApiKey(),
          encryptionAvailable: storage.isEncryptionAvailable()
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('settings:set', (_e, payload) => {
    try {
      const current = storage.loadSettings();
      if (payload.openai_model !== undefined) current.openai_model = String(payload.openai_model);
      if (payload.temperature !== undefined) current.temperature = Number(payload.temperature);
      storage.saveSettings(current);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { register };

'use strict';

const storage = require('../main/storage');

function register(ipcMain) {
  ipcMain.handle('apiKey:set', (_e, key) => {
    try {
      if (!storage.isEncryptionAvailable()) {
        return { success: false, error: 'OS secure storage unavailable – cannot save API key' };
      }
      storage.setApiKey(key);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('apiKey:has', () => {
    try {
      return { success: true, data: storage.hasApiKey() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { register };

'use strict';

const store = require('../main/generations');
const config = require('../main/config');

function register(ipcMain) {
  ipcMain.handle('history:list', () => {
    try {
      return { success: true, data: store.list(config.HISTORY_CAP) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('history:get', (_e, { id }) => {
    try {
      const row = store.get(id);
      if (!row) return { success: false, error: 'Not found' };
      return { success: true, data: row };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('history:delete', (_e, { id }) => {
    try {
      store.remove(id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

function saveGeneration({ genre, theme, promptText }) {
  return store.save({ genre, theme, promptText });
}

module.exports = { register, saveGeneration };

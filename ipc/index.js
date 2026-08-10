'use strict';

function registerAll(ipcMain, getWindow) {
  require('./settings').register(ipcMain);
  require('./api-keys').register(ipcMain);
  require('./history').register(ipcMain);
  require('./generation').register(ipcMain, getWindow);
  require('./idea').register(ipcMain);
}

module.exports = { registerAll };

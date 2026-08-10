'use strict';

const { app, ipcMain } = require('electron');
const { createMainWindow } = require('./main/window');
const { registerAll } = require('./ipc');

let mainWindow = null;

function getWindow() {
  return mainWindow;
}

app.whenReady().then(() => {
  mainWindow = createMainWindow();
  registerAll(ipcMain, getWindow);

  app.on('activate', () => {
    if (mainWindow === null) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

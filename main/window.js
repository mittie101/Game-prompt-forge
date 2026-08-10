'use strict';

const { BrowserWindow, session } = require('electron');
const path = require('path');
const config = require('./config');

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: config.APP_NAME,
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    backgroundColor: '#0f1115',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, '..', 'preload.js')
    }
  });

  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    `connect-src ${config.CSP_CONNECT_SRC.join(' ')}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    });
  });

  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  return win;
}

module.exports = { createMainWindow };

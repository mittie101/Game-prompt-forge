'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const allowedInvoke = [
  'settings:get',
  'settings:set',
  'apiKey:set',
  'apiKey:has',
  'prompt:generate',
  'prompt:cancel',
  'idea:expand',
  'history:list',
  'history:get',
  'history:delete'
];

const allowedOn = [
  'prompt:chunk',
  'prompt:done',
  'prompt:error',
  'orchestrator:step',
  'orchestrator:error'
];

contextBridge.exposeInMainWorld('api', {
  invoke: (channel, ...args) => {
    if (!allowedInvoke.includes(channel)) {
      return Promise.reject(new Error('Invalid channel'));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel, callback) => {
    if (!allowedOn.includes(channel)) return () => {};
    const listener = (_event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  }
});

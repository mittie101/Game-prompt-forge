'use strict';

const { streamChat } = require('../main/providers');
const { buildMessages, validatePrompt } = require('../main/prompts');
const examples = require('../main/examples');
const storage = require('../main/storage');
const config = require('../main/config');
const { saveGeneration } = require('./history');

let currentAbort = null;

function register(ipcMain, getWindow) {
  ipcMain.handle('prompt:generate', async (event, { genre, theme }) => {
    const win = getWindow();
    try {
      const apiKey = storage.getApiKey();
      if (!apiKey) {
        return { success: false, error: 'OpenAI API key required – open Settings' };
      }

      const g = String(genre || '').trim().slice(0, config.GENRE_MAX);
      const t = String(theme || '').trim().slice(0, config.THEME_MAX);
      if (!g && !t) {
        return { success: false, error: 'Enter a genre or description first' };
      }

      const settings = storage.loadSettings();
      const messages = buildMessages({
        genre: g || '2D game',
        theme: t || g,
        examples
      });

      if (currentAbort) {
        currentAbort.abort();
        currentAbort = null;
      }
      const controller = new AbortController();
      currentAbort = controller;

      let full = '';
      try {
        for await (const chunk of streamChat({
          apiKey,
          model: settings.openai_model || config.DEFAULT_MODEL,
          temperature: settings.temperature ?? config.DEFAULT_TEMPERATURE,
          messages,
          maxTokens: config.MAX_TOKENS,
          signal: controller.signal
        })) {
          full += chunk;
          if (win && !win.isDestroyed()) {
            win.webContents.send('prompt:chunk', { text: chunk });
          }
        }
      } catch (err) {
        if (err.name === 'AbortError' || controller.signal.aborted) {
          if (win && !win.isDestroyed()) {
            win.webContents.send('prompt:error', { message: 'Stopped' });
          }
          return { success: false, error: 'Stopped' };
        }
        throw err;
      } finally {
        currentAbort = null;
      }

      const trimmed = full.trim();
      if (!validatePrompt(trimmed)) {
        if (win && !win.isDestroyed()) {
          win.webContents.send('prompt:error', {
            message: 'Generation failed – response did not match the library format'
          });
        }
        return { success: false, error: 'Generation failed – response did not match the library format' };
      }

      let id = null;
      try {
        id = saveGeneration({ genre: g || '2D game', theme: t || g, promptText: trimmed });
      } catch (dbErr) {
        // still return the prompt even if history fails
        if (win && !win.isDestroyed()) {
          win.webContents.send('prompt:done', { id: null, fullText: trimmed });
        }
        return { success: true, data: { id: null, fullText: trimmed, warning: 'Could not save to history' } };
      }

      if (win && !win.isDestroyed()) {
        win.webContents.send('prompt:done', { id, fullText: trimmed });
      }
      return { success: true, data: { id, fullText: trimmed } };
    } catch (err) {
      let msg = err.message || 'Unknown error';
      if (err.status === 401) msg = 'API key invalid or revoked';
      else if (err.status === 429) msg = 'Rate limited – try again shortly';
      else if (msg.includes('fetch') || msg.includes('network')) msg = 'Network error – check connection';

      if (win && !win.isDestroyed()) {
        win.webContents.send('prompt:error', { message: msg });
      }
      return { success: false, error: msg };
    }
  });

  ipcMain.handle('prompt:cancel', () => {
    if (currentAbort) {
      currentAbort.abort();
      currentAbort = null;
    }
    return { success: true };
  });
}

module.exports = { register };

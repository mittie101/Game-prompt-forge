'use strict';

const { chat } = require('../main/providers');
const { buildIdeaMessages, parseIdeaResponse } = require('../main/idea');
const storage = require('../main/storage');
const config = require('../main/config');

function register(ipcMain) {
  ipcMain.handle('idea:expand', async (event, { idea }) => {
    try {
      const apiKey = storage.getApiKey();
      if (!apiKey) {
        return { success: false, error: 'OpenAI API key required – open Settings' };
      }

      const i = String(idea || '').trim().slice(0, config.IDEA_MAX);
      if (!i) {
        return { success: false, error: 'Enter an idea first' };
      }

      const settings = storage.loadSettings();
      const raw = await chat({
        apiKey,
        model: settings.openai_model || config.DEFAULT_MODEL,
        temperature: 0.8,
        messages: buildIdeaMessages(i),
        maxTokens: config.IDEA_MAX_TOKENS
      });

      const parsed = parseIdeaResponse(raw);
      if (!parsed) {
        return { success: false, error: 'Could not expand idea – try rephrasing it' };
      }
      return { success: true, data: parsed };
    } catch (err) {
      let msg = err.message || 'Unknown error';
      if (err.status === 401) msg = 'API key invalid or revoked';
      else if (err.status === 429) msg = 'Rate limited – try again shortly';
      else if (msg.includes('fetch') || msg.includes('network')) msg = 'Network error – check connection';
      return { success: false, error: msg };
    }
  });
}

module.exports = { register };

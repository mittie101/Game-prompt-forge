'use strict';

const OpenAI = require('openai');
const config = require('./config');

function createClient(apiKey) {
  return new OpenAI({ apiKey, baseURL: config.OPENAI_BASE });
}

async function chat({ apiKey, model, temperature, messages, maxTokens, signal }) {
  const client = createClient(apiKey);
  const res = await client.chat.completions.create({
    model: model || config.DEFAULT_MODEL,
    temperature: temperature ?? config.DEFAULT_TEMPERATURE,
    max_tokens: maxTokens || config.MAX_TOKENS,
    messages
  }, { signal });
  return res.choices?.[0]?.message?.content || '';
}

async function* streamChat({ apiKey, model, temperature, messages, maxTokens, signal }) {
  const client = createClient(apiKey);
  const stream = await client.chat.completions.create({
    model: model || config.DEFAULT_MODEL,
    temperature: temperature ?? config.DEFAULT_TEMPERATURE,
    max_tokens: maxTokens || config.MAX_TOKENS,
    messages,
    stream: true
  }, { signal });

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) yield delta;
  }
}

module.exports = { createClient, chat, streamChat };

'use strict';

const $ = (sel) => document.querySelector(sel);

const ideaEl = $('#idea');
const btnExpandIdea = $('#btn-expand-idea');
const genreEl = $('#genre');
const themeEl = $('#theme');
const outputEl = $('#output');
const statusEl = $('#status');
const btnGenerate = $('#btn-generate');
const btnStop = $('#btn-stop');
const btnRegenerate = $('#btn-regenerate');
const btnCopy = $('#btn-copy');
const historyList = $('#history-list');
const settingsModal = $('#settings-modal');
const apiKeyEl = $('#api-key');
const modelEl = $('#model');
const tempEl = $('#temperature');
const settingsMsg = $('#settings-msg');

const btnSettings = $('#btn-settings');
const btnCloseSettings = $('#btn-close-settings');
const btnSaveSettings = $('#btn-save-settings');

let isStreaming = false;
let lastGenre = '';
let lastTheme = '';
let committedText = '';
let stagingText = '';
let unsubs = [];

function cleanupListeners() {
  for (const u of unsubs) {
    try {
      if (typeof u === 'function') {
        u();
      } else if (u && typeof u.off === 'function') {
        u.off();
      } else if (u && typeof u.removeListener === 'function') {
        u.removeListener();
      } else if (u && typeof u.dispose === 'function') {
        u.dispose();
      }
    } catch (e) {
      // swallow cleanup errors but log for diagnostics
      console.error('Error during cleanup listener:', e);
    }
  }
  try { window.removeEventListener('beforeunload', cleanupListeners); } catch (e) {}
}


function setStatus(msg) {
  statusEl.textContent = msg;
}

function setStreaming(on) {
  isStreaming = on;
  btnGenerate.disabled = on;
  btnStop.classList.toggle('hidden', !on);
  btnRegenerate.disabled = on || (!lastGenre && !lastTheme);
  btnCopy.disabled = on || !committedText;
  const spinner = $('#spinner');
  if (spinner) spinner.classList.toggle('hidden', !on);
}

function showSettingsMsg(text, isError) {
  settingsMsg.textContent = text;
  settingsMsg.className = 'msg ' + (isError ? 'error' : 'ok');
}

async function loadSettings() {
  const res = await window.api.invoke('settings:get');
  if (!res.success) return;
  modelEl.value = res.data.openai_model || 'gpt-4o';
  tempEl.value = res.data.temperature ?? 0.7;
  if (!res.data.encryptionAvailable) {
    apiKeyEl.disabled = true;
    apiKeyEl.placeholder = 'Secure storage unavailable';
  }
}

async function loadHistory() {
  const res = await window.api.invoke('history:list');
  if (!res.success) return;
  historyList.innerHTML = '';
  for (const row of res.data) {
    const li = document.createElement('li');
    const title = (row.genre || '') + (row.theme ? ' — ' + row.theme.slice(0, 40) : '');
    const date = new Date(row.created_at).toLocaleString();
    li.innerHTML = `<div>${escapeHtml(title)}</div><div class="meta">${date}</div><button type="button" class="btn-delete-history" title="Delete">&times;</button>`;
    li.addEventListener('click', () => loadHistoryItem(row.id));
    li.querySelector('.btn-delete-history').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteHistoryItem(row.id);
    });
    historyList.appendChild(li);
  }
}

async function deleteHistoryItem(id) {
  const res = await window.api.invoke('history:delete', { id });
  if (!res.success) {
    setStatus(res.error || 'Delete failed');
    return;
  }
  loadHistory();
}

async function loadHistoryItem(id) {
  const res = await window.api.invoke('history:get', { id });
  if (!res.success) return;
  committedText = res.data.prompt_text;
  outputEl.textContent = committedText;
  genreEl.value = res.data.genre || '';
  themeEl.value = res.data.theme || '';
  lastGenre = res.data.genre || '';
  lastTheme = res.data.theme || '';
  btnCopy.disabled = false;
  btnRegenerate.disabled = false;
  setStatus('Loaded from history');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function startGenerate(useLast) {
  if (isStreaming) return;
  const genre = useLast ? lastGenre : genreEl.value.trim();
  const theme = useLast ? lastTheme : themeEl.value.trim();
  if (!genre && !theme) {
    setStatus('Enter a genre or description first');
    return;
  }

  lastGenre = genre;
  lastTheme = theme;
  stagingText = '';
  outputEl.textContent = '';

  // load retryInvoke in a way that works in Electron renderer (require) or browser (dynamic import)
  let retryInvoke;
  try {
    // Prefer ES module dynamic import first (works in sandboxed renderer contexts)
    const mod = await import('./retry.mjs');
    retryInvoke = mod.retryInvoke || mod.default;
  } catch (e1) {
    // Fallback to CommonJS require if available and the dynamic import failed
    try {
      if (typeof require === 'function') {
        retryInvoke = require('./retry').retryInvoke;
      } else {
        throw e1; // rethrow original import error
      }
    } catch (e2) {
      console.error('Failed to load retry module', e1, e2);
      setStatus('Internal error');
      return;
    }
  }
  const invokeFn = () => window.api.invoke('prompt:generate', { genre, theme });

  const res = await retryInvoke(invokeFn, {
    maxAttempts: 3,
    backoffBaseMs: 1000,
    statusFn: (info) => {
      if (info.phase === 'attempt') {
        setStreaming(true);
        setStatus(info.attempt === 1 ? 'Generating…' : `Retrying (attempt ${info.attempt}/${info.maxAttempts})…`);
      } else if (info.phase === 'backoff') {
        setStreaming(false);
        setStatus(`${info.message || 'Transient error'} — retrying in ${info.secondsRemaining}s (attempt ${info.attempt + 1}/${info.maxAttempts})`);
      }
    }
  });

  if (!res || !res.success) {
    setStreaming(false);
    if (res && res.error === 'Stopped') {
      setStatus('Stopped');
      return;
    }
    if (stagingText) {
      outputEl.textContent = stagingText;
      setStatus((res && res.error ? res.error + ' — partial result preserved' : 'Generation failed — partial result preserved'));
    } else {
      setStatus(res && res.error ? res.error : 'Generation failed');
    }
  }
}

function onChunk(data) {
  stagingText += data.text || '';
  outputEl.textContent = stagingText;
  outputEl.scrollTop = outputEl.scrollHeight;
}

function onDone(data) {
  committedText = data.fullText || stagingText;
  outputEl.textContent = committedText;
  stagingText = '';
  setStreaming(false);
  setStatus('Ready');
  btnCopy.disabled = false;
  loadHistory();
}

function onError(data) {
  setStreaming(false);
  const message = data && (data.message || data.error) || 'Error';
  // prefer preserving the last staged text if present
  if (stagingText) {
    outputEl.textContent = stagingText;
    setStatus(`${message} — partial result preserved`);
  } else if (committedText) {
    outputEl.textContent = committedText;
    setStatus(message);
  } else {
    setStatus(message);
  }
}

async function expandIdea() {
  const idea = ideaEl.value.trim();
  if (!idea) {
    setStatus('Enter an idea first');
    return;
  }
  btnExpandIdea.disabled = true;
  setStatus('Expanding idea…');
  const res = await window.api.invoke('idea:expand', { idea });
  btnExpandIdea.disabled = false;
  if (!res.success) {
    setStatus(res.error || 'Idea expansion failed');
    return;
  }
  if (res.data.genre) genreEl.value = res.data.genre;
  if (res.data.theme) themeEl.value = res.data.theme;
  setStatus('Ready');
}

async function copyOutput() {
  if (!committedText) return;
  try {
    await navigator.clipboard.writeText(committedText);
    setStatus('Copied to clipboard');
    showToast('Copied to clipboard');
  } catch {
    setStatus('Copy failed');
    showToast('Copy failed');
  }
}

// Toggle API key visibility
function toggleApiKeyVisibility() {
  const btn = $('#btn-toggle-api-key');
  if (!btn || !apiKeyEl) return;
  const showing = apiKeyEl.type === 'text';
  apiKeyEl.type = showing ? 'password' : 'text';
  btn.textContent = showing ? 'Show' : 'Hide';
  btn.setAttribute('aria-pressed', (!showing).toString());
}

function globalKeyHandler(e) {
  // Ctrl/Cmd+Enter to generate
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    startGenerate(false);
    return;
  }
}


function showToast(text, ms = 2500) {
  let t = $('#toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = text;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), ms);
}

function openSettings() {
  settingsModal.classList.remove('hidden');
  loadSettings();
  showSettingsMsg('');
  // focus first input and trap focus
  apiKeyEl.focus();
  document.addEventListener('keydown', modalKeyHandler);
}

function closeSettings() {
  settingsModal.classList.add('hidden');
  document.removeEventListener('keydown', modalKeyHandler);
}

async function saveSettings() {
  const key = apiKeyEl.value.trim();
  if (key) {
    // simple client-side validation for key format
    if (!/^sk-[A-Za-z0-9]/.test(key)) {
      showSettingsMsg('API key appears invalid', true);
      return;
    }
    const r = await window.api.invoke('apiKey:set', key);
    if (!r.success) {
      showSettingsMsg(r.error, true);
      return;
    }
    apiKeyEl.value = '';
  }
  const r2 = await window.api.invoke('settings:set', {
    openai_model: modelEl.value.trim() || 'gpt-4o',
    temperature: Number(tempEl.value) || 0.7
  });
  if (!r2.success) {
    showSettingsMsg(r2.error, true);
    return;
  }
  showSettingsMsg('Saved', false);
  setTimeout(closeSettings, 600);
}

function modalKeyHandler(e) {
  // trap focus inside modal on Tab
  if (e.key === 'Escape') {
    closeSettings();
    return;
  }
  if (e.key === 'Tab') {
    const focusable = settingsModal.querySelectorAll('input, button, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const arr = Array.from(focusable);
    const idx = arr.indexOf(document.activeElement);
    if (e.shiftKey && idx === 0) {
      e.preventDefault(); arr[arr.length - 1].focus();
    } else if (!e.shiftKey && idx === arr.length - 1) {
      e.preventDefault(); arr[0].focus();
    }
  }
}

function init() {
  unsubs.push(window.api.on('prompt:chunk', onChunk));
  unsubs.push(window.api.on('prompt:done', onDone));
  unsubs.push(window.api.on('prompt:error', onError));

  // DOM event handlers captured so they can be removed on cleanup
  const onExpandClick = expandIdea;
  const onGenerateClick = () => startGenerate(false);
  const onStopClick = () => window.api.invoke('prompt:cancel');
  const onRegenerateClick = () => startGenerate(true);
  const onCopyClick = copyOutput;
  const onOpenSettings = openSettings;
  const onCloseSettings = closeSettings;
  const onSaveSettings = saveSettings;
  const onToggleApiKey = toggleApiKeyVisibility;
  const onGlobalKey = globalKeyHandler;

  btnExpandIdea.addEventListener('click', onExpandClick);
  btnGenerate.addEventListener('click', onGenerateClick);
  btnStop.addEventListener('click', onStopClick);
  btnRegenerate.addEventListener('click', onRegenerateClick);
  btnCopy.addEventListener('click', onCopyClick);
  btnSettings.addEventListener('click', onOpenSettings);
  btnCloseSettings.addEventListener('click', onCloseSettings);
  btnSaveSettings.addEventListener('click', onSaveSettings);

  const toggleBtn = $('#btn-toggle-api-key');
  if (toggleBtn) toggleBtn.addEventListener('click', onToggleApiKey);

  // global keyboard shortcuts
  document.addEventListener('keydown', onGlobalKey);

  // push unsubs to remove DOM listeners on cleanup
  unsubs.push(() => btnExpandIdea.removeEventListener('click', onExpandClick));
  unsubs.push(() => btnGenerate.removeEventListener('click', onGenerateClick));
  unsubs.push(() => btnStop.removeEventListener('click', onStopClick));
  unsubs.push(() => btnRegenerate.removeEventListener('click', onRegenerateClick));
  unsubs.push(() => btnCopy.removeEventListener('click', onCopyClick));
  unsubs.push(() => btnSettings.removeEventListener('click', onOpenSettings));
  unsubs.push(() => btnCloseSettings.removeEventListener('click', onCloseSettings));
  unsubs.push(() => btnSaveSettings.removeEventListener('click', onSaveSettings));
  if (toggleBtn) unsubs.push(() => toggleBtn.removeEventListener('click', onToggleApiKey));
  unsubs.push(() => document.removeEventListener('keydown', onGlobalKey));

  // cleanup on unload
  window.addEventListener('beforeunload', cleanupListeners);
  unsubs.push(() => window.removeEventListener('beforeunload', cleanupListeners));

  loadSettings();
  loadHistory();
  setStatus('Ready');
}

init();

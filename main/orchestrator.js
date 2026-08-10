'use strict';

function extractPhasePlan(promptText) {
  const planMatch = promptText.match(/## Phase plan\s*([\s\S]*?)\n\n/);
  if (!planMatch) return null;
  const planBlock = planMatch[1];
  const lines = planBlock.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines;
}

function extractRequirements(promptText) {
  const reqMatch = promptText.match(/## Requirements extracted\s*([\s\S]*?)\n\n##/);
  if (!reqMatch) {
    // try looser match
    const alt = promptText.match(/## Requirements extracted\s*([\s\S]*)/);
    if (!alt) return {};
    return { raw: alt[1].trim() };
  }
  return { raw: reqMatch[1].trim() };
}

function findGenerateCalls(promptText) {
  const gens = [];
  const mapRegex = /\$generate2dmap[^\n]*/g;
  const spriteRegex = /\$generate2dsprite[^\n]*/g;
  let m;
  while ((m = mapRegex.exec(promptText))) gens.push({ kind: 'map', text: m[0].trim() });
  while ((m = spriteRegex.exec(promptText))) gens.push({ kind: 'sprite', text: m[0].trim() });
  return gens;
}

function validatePromptText(promptText) {
  if (typeof promptText !== 'string') {
    throw new TypeError('promptText must be a string');
  }
  const trimmed = promptText.trim();
  if (!trimmed) {
    throw new Error('promptText is empty');
  }
  return trimmed;
}

function emit(win, payload) {
  if (!win || !win.webContents || win.isDestroyed()) return;
  win.webContents.send('orchestrator:step', payload);
}

async function orchestrate(promptText, win) {
  const prompt = validatePromptText(promptText);
  const phasePlan = extractPhasePlan(promptText) || [];
  const requirements = extractRequirements(promptText) || {};
  const generateCalls = findGenerateCalls(prompt);
  const needsPrototype = phasePlan.some((line) => (
    /Map generation|Sprite generation|Modular scaffold|Inventory|QA gate/i.test(line)
  ));

  const steps = [
    {
      order: 1,
      plugin: 'game-prompt-decomposer',
      status: 'planned',
      outputContract: 'Phase plan and Requirements extracted only',
      result: { phasePlan, requirements }
    }
  ];

  if (needsPrototype) {
    steps.push({
      order: 2,
      plugin: 'asf-game-prototype',
      skill: 'asf-orchestrate-platformer',
      status: 'planned',
      requiredSequence: [
        'Inventory',
        'Style lock',
        'Generate map assets',
        'Generate sprite assets'
      ],
      generateCalls
    });
    steps.push({
      order: 3,
      plugin: 'asf-style-qa-gate',
      status: 'planned',
      requiredAction: 'QA each generated batch and regenerate only failing batches until PASS'
    });
    steps.push({
      order: 4,
      plugin: 'canvas-platformer-scaffold',
      status: 'planned',
      requiredAction: 'Scaffold only after QA PASS and wire real asset paths into assets.js'
    });
  }

  const result = {
    success: true,
    mode: 'plan-only',
    reason: 'Codex plugin execution is external to the Electron runtime; this result records the required invocation plan without writing placeholder assets.',
    steps
  };

  emit(win, { status: 'planned', result });
  return result;
}

module.exports = { orchestrate };

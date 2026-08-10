[![CI](https://github.com/mittie101/Game-prompt-forge/actions/workflows/ci.yml/badge.svg)](https://github.com/mittie101/Game-prompt-forge/actions)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)](https://github.com/mittie101/Game-prompt-forge/actions)

# Game Prompt Forge

Game Prompt Forge generates structured game-prototype prompts (Game Prompt Library style) and helps iterate ideas using OpenAI. It's an Electron app with history, streaming generation, and tools to validate and save prompts.

Quick start

- Install dependencies: `npm install`
- Run (dev): `npm start`
- Run unit tests: `npm test`
- Run e2e tests (Playwright): `npm run test:e2e` (requires `npx playwright install`)
- Clean build/artifacts: `npm run clean`

Development notes

- Store your OpenAI API key via Settings (saved to OS secure storage when available).
- CSP tightened: renderer disallows `unsafe-inline` styles/scripts.
- Playwright e2e and GitHub Actions CI included (see `.github/workflows/ci.yml`).

Dependency: Agent Sprite Forge

This project uses the `agent-sprite-forge` skill for generating 2D sprites and maps. The generator expects the following skills to be available for correct asset generation:

- `$generate2dsprite`
- `$generate2dmap`

Agent Sprite Forge repo: https://github.com/0x0funky/agent-sprite-forge

Quick integration steps:

1. Clone the Agent Sprite Forge repository next to this project (or anywhere accessible):
   ```bash
   git clone https://github.com/0x0funky/agent-sprite-forge.git
   ```
2. Follow the Agent Sprite Forge README for installation details (Python, Pillow, and other local processors may be required). Typical steps include installing dependencies and running its local processors or server.
3. Ensure any local skill paths or environment variables expected by the skill are configured so the prompt generation can reference `$generate2dsprite` / `$generate2dmap`.

Example prompt

Use the following minimal example to ask the generator to create a playable character sprite and a short description for a cozy farming hero. Replace or expand details as needed:

```text
Build a 2D top-down cozy farming RPG playable protagonist.

You must use the Agent Sprite Forge skill to generate the character art.
Use: $generate2dsprite to create a 32x32 animated hero (walk N/S/E/W, idle, interact).

Core concept:
A resilient farmer who cultivates moon-flowers and befriends lost spirits.

Visual direction:
Pixel art, limited palette, warm colors, slightly oversized head for readability.

Required assets:
- Hero sprite sheet (32x32, 4 directions, 8 frames per walk cycle)
- Idle animation (breathing + tool hold)
- Simple walking sound hints in metadata

Final expected result:
A sprite sheet archive and metadata describing frame names, pivot points, and a short gameplay blurb.
```

Contributing

Open issues or PRs. Tests run locally with `npm test`; CI runs tests and e2e on pushes/pull requests.

Changelog

See [CHANGELOG.md](CHANGELOG.md) for recent changes.

License

See package.json for license information.

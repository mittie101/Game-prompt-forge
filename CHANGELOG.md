# Changelog

All notable changes to this project are documented in this file.

## Unreleased

### Added
- Unsubscribe cleanup for IPC and DOM event listeners to prevent memory leaks.
- retryInvoke helper with exponential backoff and status updates for transient generation failures.
- Streaming resilience and UI spinner for generation flows.
- Accessibility improvements: settings modal focus trap, ARIA attributes, keyboard shortcuts (Esc, Ctrl/Cmd+Enter), API key show/hide.
- Copy toast notification and partial-result preservation on errors.
- Playwright e2e test and GitHub Actions CI workflow.
- Unit tests for prompt generation, validation, idea parsing, retry helper, and security invariants.
- Packaging cleanup: .gitignore and npm run clean script.

### Changed
- Tightened Content-Security-Policy by removing `unsafe-inline`.
- Improved error mapping and user-facing messages for provider errors.


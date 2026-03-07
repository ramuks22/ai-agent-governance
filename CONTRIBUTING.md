# Contributing

Thanks for contributing to the AI Agent Governance Framework.

## Requirements

- Follow `AGENTS.md` and `.agent/workflows/governance.md`.
- All changes must map to a tracker ID or documented exception.
- Update tracker phase/state as work progresses.
- For feature-level work, complete requirements workshop before implementation (or document approved hotfix exception).
- Run local gates before pushing.

## Quick start

```bash
npm install
node scripts/governance-check.mjs --init
node scripts/install-githooks.mjs
git config core.hooksPath .githooks
npm run governance:check
```

## PRs

- Use the PR template and include tracker references.
- If using merge-by-command, include the quoted command in the PR body.

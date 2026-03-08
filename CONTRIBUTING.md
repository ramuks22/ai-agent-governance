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
npm run governance:check
npm run governance:ci-check
npm run governance:doctor
```

Canonical release/maintenance policy and compatibility guidance:

- `docs/development/release-maintenance-policy.md`

## PRs

- Use the PR template and include tracker references.
- If using merge-by-command, include the quoted command in the PR body.

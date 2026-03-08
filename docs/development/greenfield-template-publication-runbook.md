# Greenfield Template Publication Runbook

This runbook is operational guidance for Stage 7 distribution. It does not override governance policy. Canonical governance policy remains in `.agent/workflows/governance.md`.

## Scope

- Publish and maintain a greenfield starter from `templates/greenfield/`.
- Support both distribution paths:
  - degit path (`ramuks22/ai-agent-governance/templates/greenfield`)
  - GitHub Template repository path
- Keep existing-repo migration on the Stage 6 `adopt` path.

## Prerequisites

- Access to this repository and the template repository.
- Current governance package version confirmed in `templates/greenfield/package.json`.
- Stage tracker updates prepared in `docs/tracker.md`.

## Distribution Paths

### 1) degit (direct from this repository)

Consumer command:

```bash
npx degit ramuks22/ai-agent-governance/templates/greenfield my-new-project
cd my-new-project
npm install
npm run governance:bootstrap
```

### 2) GitHub Template repository (manual publication)

Create or update a dedicated template repository from `templates/greenfield`:

1. Sync `templates/greenfield/` contents into the template repository root.
2. Commit with a message that includes the source version (example: `sync: greenfield template from ai-agent-governance v1.1.0`).
3. Enable GitHub template mode on that repository.
4. Verify bootstrap flow in a fresh clone:
   - `npm install`
   - `npm run governance:bootstrap`
5. Record publication evidence in `docs/tracker.md` with PR reference.

## Version Pin Policy

- `templates/greenfield/package.json` must keep a pinned governance package version (`@ramuks22/ai-agent-governance@<exact-version>`).
- When bumping this version:
  - update the template package file,
  - run template bootstrap verification,
  - update publication evidence with the release/version used.

## Decision Rule for Adopters

- Greenfield project: use template path (degit or GitHub Template).
- Existing repository: use Stage 6 migration path (`adopt`).

## Validation Checklist

1. `templates/greenfield/package.json` contains pinned package version.
2. `templates/greenfield/package.json` contains `governance:bootstrap`.
3. Fresh scaffold run completes:
   - `npm install`
   - `npm run governance:bootstrap`
4. Onboarding docs keep explicit greenfield vs existing split.

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
git init
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
   - `git init` (required for degit scaffolds)
   - `npm install`
   - `npm run governance:bootstrap`
4. Onboarding docs keep explicit greenfield vs existing split.

## Deterministic Validation Commands (AG-GOV-035)

Run from repository root:

1. Template pin + script contract:

```bash
node -e '
const pkg = require("./templates/greenfield/package.json");
const version = pkg.devDependencies?.["@ramuks22/ai-agent-governance"];
const scripts = pkg.scripts ?? {};
const requiredScripts = ["governance:init", "governance:check", "governance:doctor", "governance:bootstrap"];
const missingScripts = requiredScripts.filter((name) => !scripts[name]);
if (!version || !/^\\d+\\.\\d+\\.\\d+$/.test(version)) {
  console.error("Expected pinned @ramuks22/ai-agent-governance version.");
  process.exit(1);
}
if (missingScripts.length > 0) {
  console.error("Missing scripts:", missingScripts.join(", "));
  process.exit(1);
}
'
```

2. Onboarding split guidance present:

```bash
rg -n "Onboarding Paths \\(Stage 7\\)|Greenfield Path \\(Template\\)|Existing Repository Path \\(Migration\\)" README.md
rg -n "Onboarding split|Greenfield repos: scaffold from `templates/greenfield`|Existing repos: use Stage 6 migration \\(`adopt`\\) commands\\." docs/README.md
```

3. Runbook includes both distribution methods:

```bash
rg -n "degit|GitHub Template repository" docs/development/greenfield-template-publication-runbook.md
```

4. Local smoke test for unpublished package state (this repository):

```bash
REPO_ROOT="$PWD"
PACK_FILE="$(npm pack --silent)"
TMP_DIR="$(mktemp -d)"
cp -R templates/greenfield/. "$TMP_DIR"
cd "$TMP_DIR"
git init -q
npm install --save-dev "$REPO_ROOT/$PACK_FILE" --silent
npm run governance:bootstrap
cd "$REPO_ROOT"
rm -f "$PACK_FILE"
```

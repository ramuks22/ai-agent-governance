# Release and Maintenance Policy (Canonical)

This document is the canonical source for ongoing release/maintenance policy for this repository.

## Authority and Legacy Boundary

- Canonical (current): `docs/development/release-maintenance-policy.md`
- Historical baseline artifact: `plans/ag-gov-003-stage0-decision-doc.md` (v1.0 scope record)
- The Stage 0 artifact is not the canonical source for ongoing maintenance policy.

Stage 8 scope note:

- Stage 8 is documentation + deterministic validation only.
- Stage 8 does not add runtime warning behavior or `doctor` contract changes.

## Support Ownership and Escalation

- Default owner: governance maintainer.
- Escalation owner: repository owner/maintainer.
- Required issue metadata: tracker ID, impacted command/path, reproducible steps, expected vs actual behavior.

## Support SLA

| Severity | Example Impact | First Response Target | Triage Decision Target | Owner |
|---|---|---|---|---|
| `P0` | Governance enforcement blocks critical delivery or causes broad breakage | 4 hours | 1 business day | Governance maintainer (escalate to repo owner) |
| `P1` | Major workflow regression with known workaround | 1 business day | 2 business days | Governance maintainer |
| `P2` | Non-critical defect or docs gap | 2 business days | 5 business days | Governance maintainer |
| `P3` | Enhancement/clarification request | 5 business days | 10 business days | Governance maintainer |

## Breaking Changes and Deprecation Workflow

- Semantic Versioning governs release behavior.
- Breaking behavior changes require a major-version release.
- Before removing established behavior:
  - add deprecation guidance in `CHANGELOG.md`,
  - provide at least one minor-release notice window,
  - create/update tracker item with replacement path and planned removal milestone.
- Deprecation handling in Stage 8 is process-only (docs/changelog/tracker), not runtime warning logic.

## Compatibility Matrix (Current Contract)

| Dimension | Current Support |
|---|---|
| Runtime | Node.js only |
| Node versions | 20.x and 22.x validated; package engine floor is `>=20` |
| OS support | macOS, Linux, Windows |
| Package manager (install/runtime) | npm first-class |
| Preset generation (`init`) | `node-npm-cjs`, `node-npm-esm`, `node-pnpm-monorepo`, `node-yarn-workspaces`, `generic` |
| Runtime non-goals | Bun and Deno |

## Install and Upgrade Paths

### Online installation (connected)

```bash
npm install -D @ramuks22/ai-agent-governance
npx @ramuks22/ai-agent-governance init --preset node-npm-cjs --hook-strategy auto
npx @ramuks22/ai-agent-governance check
npx @ramuks22/ai-agent-governance ci-check --gate all
npx @ramuks22/ai-agent-governance doctor
```

### Offline fallback installation (air-gapped or restricted network)

Prepare artifact on a connected machine:

```bash
npm pack @ramuks22/ai-agent-governance@<VERSION>
```

Install and verify in target repository:

```bash
npm install -D ./ai-agent-governance-<VERSION>.tgz
npx ai-governance init --preset node-npm-cjs --hook-strategy auto
npx ai-governance check
npx ai-governance ci-check --gate all
npx ai-governance doctor
```

### Upgrade path alignment

- Greenfield repository: `templates/greenfield` path (degit or GitHub Template).
- Existing repository: Stage 6 `adopt` path.
- Ongoing managed updates: `upgrade` for forward changes and `rollback` for recovery.

## Deterministic Validation Commands (AG-GOV-038)

Run from repository root:

1. Canonical section presence:

```bash
rg -n "^## (Authority and Legacy Boundary|Support Ownership and Escalation|Support SLA|Breaking Changes and Deprecation Workflow|Compatibility Matrix \\(Current Contract\\)|Install and Upgrade Paths|Deterministic Validation Commands \\(AG-GOV-038\\))$" docs/development/release-maintenance-policy.md
```

2. Pointer consistency in source-of-truth docs:

```bash
rg -n "docs/development/release-maintenance-policy.md" README.md docs/README.md docs/development/delivery-governance.md CONTRIBUTING.md
```

3. Compatibility alignment with package contract + Stage 0 baseline statements:

```bash
node -e '
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const policy = fs.readFileSync("docs/development/release-maintenance-policy.md", "utf8");
const stage0 = fs.readFileSync("plans/ag-gov-003-stage0-decision-doc.md", "utf8");
if ((pkg.engines || {}).node !== ">=20") process.exit(1);
if (!/Node versions \\| 20\\.x and 22\\.x/.test(policy)) process.exit(1);
if (!/Package manager \\(install\\/runtime\\) \\| npm first-class/.test(policy)) process.exit(1);
if (!/Node versions: 20\\.x and 22\\.x/.test(stage0)) process.exit(1);
'
```

4. Offline install guidance presence:

```bash
rg -n "Offline fallback installation|npm pack @ramuks22/ai-agent-governance@<VERSION>|npx ai-governance init" docs/development/release-maintenance-policy.md
```

5. Deprecation process includes explicit Stage 8 no-runtime-warning contract:

```bash
rg -n "Deprecation handling in Stage 8 is process-only \\(docs/changelog/tracker\\), not runtime warning logic\\." docs/development/release-maintenance-policy.md
```

6. Governance gates:

```bash
npm run governance:check
npm run gate:precommit
npm run gate:prepush
```

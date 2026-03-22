# AG-GOV-051 Workshop Artifact

Applicability: Required — Reason: behavior-changing adopt inference hardening for hybrid npm repos with nested operational packages.

## Input Summary

- Tracker ID: `AG-GOV-051`
- Related issue: GH #27 (`adopt` overconfidently infers `node-npm-esm` for npm repos with operational nested packages such as `backend/package.json`)
- Current defect:
  - `detectAdoptRepoProfile()` only classifies repos using `packageManager + layout + moduleType`.
  - `adopt` does not distinguish a root npm package from a repo with a root package plus operational nested packages.
  - blocked inference still risks falling through to preset-dependent planned writes if ambiguity is not surfaced explicitly.
- Intended outcome: `adopt` must mark hybrid npm repos as ambiguous, require explicit `--preset`, and avoid planning preset-dependent generated writes until the user resolves that ambiguity.

## Decision Scope

In scope:

- Detect hybrid npm repos using operational nested package roots referenced from root scripts.
- Add `inferenceStatus`, `packageRoots`, and `operationalPackageRoots` to the adopt report contract.
- Fail closed for hybrid inference and require explicit `--preset`.
- Suppress generated config/tracker/hooks while hybrid inference remains unresolved.
- Update tests and docs for hybrid inference behavior.

Out of scope:

- No new preset design for hybrid repos.
- No `governance.config.json` schema change.
- No tracker-path behavior changes beyond preserving AG-GOV-050 behavior.
- No shell-script delegation or workspace-targeting inference.
- No fixes for GH #28 in this item.

## Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns adoption safety guarantees | `adopt` must not nudge users into a wrong preset for existing repos | Maintainer |
| 2 | CLI Maintainer | Owns inference/runtime behavior | Keep the fail-closed path deterministic without inventing a new preset | Builder |
| 3 | Repo Operator | Runs `adopt --report` against real repos | Needs a clear blocked state plus explicit next-step commands | Operator |
| 4 | Skeptical Reviewer | Challenges overconfident heuristics | Ambiguous inference must block instead of silently falling back to `generic` | Dissenter |

## Decision Matrix

| Inference State | Detection Rule | `layout` | `inferredPreset` | Default Behavior | Escape Hatch |
| --- | --- | --- | --- | --- | --- |
| `confident` | Existing supported repo shape with no inference blockers | `single-package` or `monorepo/workspaces` | supported preset | proceed normally | optional CLI override |
| `ambiguous` | npm repo with base layout `single-package` plus operational nested package roots | `hybrid` | `none` | block via existing `failBlocked` path; require explicit `--preset`; suppress generated config/tracker/hooks | `--preset <name>` or manifest preset |
| `unsupported` | Existing unsupported stack outside hybrid scope | existing computed layout | `none` | preserve current fallback + blocker behavior | `--preset <name>` |

## Evidence Commands

Run from repository root:

```bash
node bin/ai-governance.mjs adopt --report .governance/adopt-report.md
```

```bash
node bin/ai-governance.mjs adopt --preset generic --report .governance/adopt-report.md
```

```bash
npm test
npm run governance:check
npm run gate:precommit
npm run gate:prepush
```

## Acceptance Criteria

1. Hybrid npm repos report `layout: hybrid`, `inferenceStatus: ambiguous`, and `selectedPreset: none (explicit --preset required)`.
2. Blocked hybrid reports exit with code `2` through the existing `failBlocked` path.
3. Blocked hybrid report/patch output must not propose generated config, generated tracker, or generated hooks.
4. Explicit CLI presets and manifest presets continue to unblock hybrid repos.
5. Non-operational nested `package.json` files do not trigger hybrid mode.
6. No new preset, no schema change, and no regression to AG-GOV-050 tracker-path handling.

## Traceability

- Epic: `AG-GOV-003` Stage 12+ installable-distribution follow-up.
- Source issue: GH #27.
- Affected runtime: `scripts/governance-check.mjs`, `scripts/__tests__/cli.test.mjs`.
- User-facing docs: `README.md`, `docs/README.md`.

## Output Contract

Adopt reports must expose:

- `layout: single-package|monorepo/workspaces|hybrid`
- `inferenceStatus: confident|ambiguous|unsupported`
- `packageRoots: <comma-separated list|none>`
- `operationalPackageRoots: <comma-separated list|none>`
- `inferredPreset: <preset|none>`
- `selectedPreset: <preset or explicit --preset required>`

Data handling note:

- No secrets or environment-derived values may appear in package-root or operational-root output.

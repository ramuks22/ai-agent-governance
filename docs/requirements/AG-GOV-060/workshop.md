# AG-GOV-060 Workshop Artifact

Applicability: Required — Reason: behavior-changing adopt preset inference for existing mixed-language repos.

## Input Summary

- Tracker ID: `AG-GOV-060`
- Related issue: GH #39 (`Adopt preset inference can prefer a nested Node package over a mixed-language repo`)
- Current defect:
  - `detectAdoptRepoProfile()` can treat a repository with no root `package.json` as an npm single-package repo.
  - Nested `package.json` files can then drive `node-npm-cjs` inference even when the repository is mixed Java/Python/Node.
  - The generated adopt report can recommend Node npm governance gates for a repo whose root project is not a Node package.
- Intended outcome: root Node preset inference requires root Node package evidence; rootless mixed or nested-package repos default to staged `generic`.

## Decision Scope

In scope:

- Require a valid root `package.json` before inferring `node-npm-cjs` or `node-npm-esm`.
- Detect rootless mixed-language and nested-package signals using deterministic repository file markers.
- Preserve CLI and manifest preset precedence over inference.
- Document that staged `generic` is the safe default for rootless or mixed-language adoption.
- Add regression tests for the issue #39 shape and explicit override behavior.

Out of scope:

- No broad language classifier.
- No new config schema.
- No package-manager-specific orchestration for nested Node subprojects.
- No change to AG-GOV-051 hybrid npm blocking for root npm repos with operational nested packages.
- No generic overlay or generated-doc merge system.

## Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns adopt safety and tracker evidence | Existing repos must not receive misleading governance defaults | Maintainer |
| 2 | CLI Maintainer | Owns inference implementation and report contract | Keep the heuristic deterministic and small | Builder |
| 3 | Repo Operator | Runs `adopt --report` on mixed-language repos | Needs an understandable safe default and explicit escape hatch | Operator |
| 4 | Skeptical Reviewer | Challenges over-broad inference changes | Avoid public contract drift and AG-GOV-051 regressions | Dissenter |

## Decision Matrix

| Repository Shape | Detection Rule | Default Preset | Inference Status | Behavior |
| --- | --- | --- | --- | --- |
| Root npm package | Valid root `package.json`, npm package manager, no operational nested package blockers | `node-npm-cjs` or `node-npm-esm` | `confident` | Preserve existing single-package inference |
| Root npm package with operational nested packages | Root npm scripts target nested package roots | none | `ambiguous` | Preserve AG-GOV-051 blocker; require explicit `--preset` |
| Root pnpm/yarn workspace | Root workspace markers supported by existing presets | workspace preset | `confident` | Preserve existing workspace inference |
| Rootless mixed/nested package repo | No valid root `package.json` plus language or nested package signals | `generic` | `confident` | Safe staged adoption; no placeholder lint/test/build gates |

## Evidence Commands

Run from repository root:

```bash
node --test scripts/__tests__/cli.test.mjs
npm test
npm run governance:check
npm run gate:precommit
npm run gate:prepush
```

## Acceptance Criteria

1. A mixed Java/Python repo with only a nested Node `package.json` selects `generic`, not `node-npm-cjs`.
2. A rootless repo with only nested Node packages also selects staged `generic`.
3. Explicit `--preset node-npm-cjs` still wins when an adopter intentionally wants Node gates.
4. Existing AG-GOV-051 hybrid npm behavior remains unchanged.
5. Adopt docs explain the rootless mixed-repo fallback and explicit-preset escape hatch.

## Traceability

- Epic: `AG-GOV-003` Stage 12+ installable-distribution follow-up.
- Source issue: GH #39.
- Affected runtime: `scripts/governance-check.mjs`, `scripts/__tests__/cli.test.mjs`.
- User-facing docs: `README.md`, `docs/README.md`.

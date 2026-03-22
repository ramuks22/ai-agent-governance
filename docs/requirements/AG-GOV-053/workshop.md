# AG-GOV-053 Workshop Artifact

Applicability: Required — Reason: behavior-changing ci-check contract for optional pre-CI codegen command.

## Input Summary

- Tracker ID: `AG-GOV-053`
- Related issue: GH #30 (`Support pre-build codegen hooks in Governance CI for Prisma repos`)
- Current defect:
  - Governance CI workflows install dependencies and call `ci-check`, but `ci-check` has no way to run repo-specific codegen prerequisites first.
  - Codegen-dependent repos such as Prisma can pass `npm ci` and still fail later build steps because generated client artifacts are missing in fresh CI environments.
  - A workflow-input-only fix would create a second source of truth and break local `ci-check` parity.
- Intended outcome: one optional config-driven pre-CI command runs once per `ci-check` invocation before selected gate commands, with no workflow-input overrides and no Prisma-specific logic.

## Decision Scope

In scope:

- Add optional `ci.preCiCommand` to `governance.config.json`.
- Execute `ci.preCiCommand` inside `ci-check` before selected CI gate commands.
- Preserve valid `ci.preCiCommand` values across `adopt` and `upgrade` config regeneration.
- Document the new config contract and add tests for execution order, failure, recursion protection, and regeneration safety.

Out of scope:

- No Prisma auto-detection or framework-specific inference.
- No new workflow inputs or workflow-specific precedence rules.
- No local git-hook behavior changes.
- No doctor workflow-shape validation beyond existing invocation-based CI parity checks.
- No new `ci` subfields beyond `preCiCommand`.

## Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns config contract and shipped CI parity story | New CI prerequisite support must stay generic and audit-friendly | Maintainer |
| 2 | CLI Maintainer | Owns `ci-check`, `adopt`, and `upgrade` behavior | Hook must run once, fail hard, and preserve valid repo-specific config safely | Builder |
| 3 | Repo Operator | Runs Governance CI in codegen-dependent repos | Needs one config entry that works locally and in GitHub Actions without YAML fork logic | Operator |
| 4 | Skeptical Reviewer | Challenges scope creep and hidden precedence | Workflow inputs and Prisma-specific logic must stay out of scope | Dissenter |

## Decision Matrix

| Config State | `ci-check` Behavior | Regeneration Behavior | Exit Behavior |
| --- | --- | --- | --- |
| `ci` absent | skip pre-CI hook | preserve nothing | unchanged |
| `ci: {}` | skip pre-CI hook | preserve nothing | unchanged |
| valid `ci.preCiCommand` | run once before selected gate commands | preserve the command across adopt/upgrade | hard fail (`exit 1`) if command fails |
| invalid JSON config during adopt/upgrade | do not rewrite config | fail before regeneration | hard fail (`exit 1`) |
| invalid `ci.preCiCommand` during adopt/upgrade | do not rewrite config | fail before regeneration | hard fail (`exit 1`) |

## Evidence Commands

Run from repository root:

```bash
node bin/ai-governance.mjs ci-check --gate precommit
```

```bash
node bin/ai-governance.mjs ci-check --gate all
```

```bash
npm test
npm run governance:check
npm run gate:precommit
npm run gate:prepush
```

## Acceptance Criteria

1. `ci-check` runs a configured `ci.preCiCommand` once per invocation before any selected gate commands.
2. `--gate precommit`, `--gate prepush`, and `--gate all` all honor the same once-per-invocation contract.
3. `ci.preCiCommand` failures stop `ci-check` before any gate command executes and use the normal hard-failure path.
4. `adopt` and `upgrade` preserve a valid `ci.preCiCommand` when regenerating config from presets.
5. `adopt` and `upgrade` fail safely rather than discarding overrides when the existing config is unreadable or the preserved command is invalid.
6. Shipped Governance CI workflows require no new inputs and continue to work by virtue of calling `ci-check`.

## Traceability

- Epic: `AG-GOV-003` Stage 12+ installable-distribution follow-up.
- Source issue: GH #30.
- Affected runtime: `scripts/governance-check.mjs`, `scripts/__tests__/cli.test.mjs`.
- User-facing docs: `README.md`, `docs/README.md`.

## Output Contract

The new config contract is:

```json
{
  "ci": {
    "preCiCommand": "npm run codegen"
  }
}
```

Behavior notes:

- `ci.preCiCommand` is a single optional string, not an array or stage matrix.
- `ci-check` validates config, node version, and tracker presence first, then runs `ci.preCiCommand`, then runs the selected gates.
- Recursion protection must treat `ci.preCiCommand` the same as gate commands and reject self-invocation of `ci-check`.
- `doctor` remains invocation-based; it validates that CI uses `ci-check`, not the semantics of `ci.preCiCommand` independently.
- `ci.additionalProperties: false` remains consistent with the existing schema style; future `ci` fields require deliberate schema evolution.

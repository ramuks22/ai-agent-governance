# Input Summary

## Idea

- Tracker IDs: `AG-GOV-003` (epic), `AG-GOV-024`, `AG-GOV-025`, `AG-GOV-026`
- Problem statement: Stage 3 shipped install/upgrade/rollback, but Stage 4 preset expansion and guided setup remain roadmap-only, forcing avoidable manual config edits.
- Proposed change: add pnpm/yarn workspace presets, add `init --wizard` with deterministic mapping, and document strict fail-closed generic behavior.
- Intended outcome: adopters can initialize correctly in one pass for npm, pnpm monorepo, and yarn workspaces while preserving safe defaults.

## Context

- Known constraints: Node runtime `>=20`, no telemetry, Stage 5+ features out of scope.
- Related systems: `scripts/governance-check.mjs`, `bin/ai-governance.mjs`, manifest-based init workflow, docs quickstart.
- Source artifacts: `docs/tracker.md`, `README.md`, `docs/README.md`, Stage 0 and Stage 3 workshop artifacts.

# Ambiguities and Risks

## Facts

- Existing presets: `node-npm-cjs`, `node-npm-esm`, `generic`.
- `generic` currently emits passing commands instead of strict placeholders.
- `init` currently has no interactive wizard and depends on manual `--preset`.

## Assumptions

- Stage 4 can be delivered in one cycle with shared workshop coverage across three child items.
- Wizard should fail immediately outside TTY and present `--preset` fallback guidance.
- Package manager commands should be conservative (`pnpm run <script>`, `yarn run <script>`).

## Risks

- Interactive logic can deadlock in CI/non-TTY usage if not explicitly blocked.
- Preset matrix can drift between parser/help/docs/tests.
- Generic permissive defaults can re-open the no-op loophole.

## Missing Information

- None blocking for Stage 4 implementation.

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns scope boundaries and tracker traceability | Prevent Stage 4 from drifting into Stage 5+ | maintainer |
| 2 | CLI Engineer | Implements parser, wizard, and preset generation | Deterministic mapping and argument exclusivity | builder |
| 3 | Release Operator | Uses init flow in real repos | Non-interactive safety and actionable failure output | operator |
| 4 | Security Reviewer | Validates enforcement safety | Fail-closed generic behavior and no silent bypass | reviewer |
| 5 | Skeptical Adopter | Represents migration friction | Unsupported wizard combos must fail with explicit remediation | dissenter |

# Simulated Workshop Output

## Role 1: Governance Maintainer

- What they care about: Stage 4 stays within preset/wizard/docs only.
- Assumptions challenged: docs updates can be deferred until after behavior changes.
- Risks identified: roadmap drift if Stage 4 completion is not reflected in tracker/docs.
- Constraints imposed: keep AG-GOV-003 epic open and defer Stage 5+ features.
- Requirement(s) insisted: child tracker IDs + shared workshop artifact + PR-linked evidence.
- Disagreements: rejects adding CI adapter or adopt flow in Stage 4.

## Role 2: CLI Engineer

- What they care about: predictable argument parsing and deterministic preset selection.
- Assumptions challenged: wizard and preset flags can coexist.
- Risks identified: ambiguous option precedence and unsupported matrix combinations.
- Constraints imposed: hard error for `--wizard` + `--preset`; matrix-driven resolver.
- Requirement(s) insisted: split pure mapping logic from I/O prompts and unit-test mapping.
- Disagreements: rejects hidden fallback behavior for invalid combinations.

## Role 3: Release Operator

- What they care about: smooth initialization in terminal and clear failure in automation.
- Assumptions challenged: wizard will only be used interactively.
- Risks identified: CI hangs if wizard waits for input on non-TTY stdin.
- Constraints imposed: non-TTY fail-fast with explicit fallback commands.
- Requirement(s) insisted: wizard prompt order and fallback examples in error output.
- Disagreements: rejects silent downgrade from wizard to default preset.

## Role 4: Security Reviewer

- What they care about: governance checks remain fail-closed.
- Assumptions challenged: generic preset can stay permissive for convenience.
- Risks identified: soft defaults enable false governance confidence.
- Constraints imposed: generic uses explicit placeholder commands that fail with guidance.
- Requirement(s) insisted: keep governance self-check in generic gates and fail closed for lint/format/test/build.
- Disagreements: rejects permissive generic defaults.

## Role 5: Skeptical Adopter

- What they care about: transparent supported matrix and clear setup guidance.
- Assumptions challenged: users infer valid combinations from prompt wording.
- Risks identified: users choose unsupported combinations and cannot diagnose failures.
- Constraints imposed: unsupported-combination errors list valid mappings and `--preset` alternatives.
- Requirement(s) insisted: docs include wizard examples and preset recommendations.
- Disagreements: rejects vague "unsupported" errors without matrix details.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-001 | Add presets `node-pnpm-monorepo` and `node-yarn-workspaces` to init generation flow. | CLI Engineer, Governance Maintainer | Must | `--preset` accepts new values and generated `governance.config.json` contains expected gate commands. |
| FR-002 | Add `init --wizard` interactive flow with prompt order: package manager -> module type (npm only) -> repo layout. | CLI Engineer, Release Operator | Must | Wizard presents deterministic prompt order and produces a resolved preset or explicit error. |
| FR-003 | Enforce `--wizard` and `--preset` mutual exclusivity with hard error. | CLI Engineer | Must | CLI exits non-zero with actionable message when both flags are used. |
| FR-004 | Enforce non-TTY `--wizard` fail-fast with fallback examples. | Release Operator | Must | Running wizard via non-TTY exits non-zero with `--preset` guidance. |
| FR-005 | Harden `generic` preset to fail-closed placeholders except governance self-check. | Security Reviewer | Must | Generated generic preCommit/prePush commands include `noop.mjs` for lint/format/test/build. |
| FR-006 | Update user-facing docs to include preset matrix, wizard usage, and strict generic behavior. | Skeptical Adopter, Governance Maintainer | Should | README/docs index show new commands/examples consistent with CLI help. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-001 | Wizard mapping logic must be deterministic and unit-testable independent of I/O. | CLI Engineer | Must | Pure resolver tests cover all valid and invalid combinations. |
| NFR-002 | Stage 4 implementation must preserve existing Stage 0-3 behavior and tests. | Governance Maintainer | Must | Existing init/check/doctor/upgrade/rollback tests remain passing. |
| NFR-003 | Error messages must include explicit remediation commands. | Release Operator, Skeptical Adopter | Should | CLI failures include concrete `--preset` examples. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-001 | No Stage 5+ features (`ci-check`, `adopt`, provider adapters, template repo) in this item. | Governance Maintainer | Must | Code and docs changes are limited to Stage 4 behavior. |
| CON-002 | No schema/version/telemetry/runtime policy changes. | Governance Maintainer, Security Reviewer | Must | `governance.config.schema.json`, package version, and telemetry posture remain unchanged. |
| CON-003 | Tracker evidence and merge protocol rules stay unchanged. | Governance Maintainer | Must | Child items use Phase/State with PR-linked evidence on merge. |

## Dependencies

| Dependency ID | Dependency | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| DEP-001 | Existing init generation pipeline and manifest write path from Stage 2/3. | CLI Engineer | Must | New presets and wizard resolve through current init path without duplicate write logic. |
| DEP-002 | Existing `noop.mjs` placeholder contract. | Security Reviewer | Must | Generic commands point to packaged noop script path. |

## Risks

| Risk ID | Risk | Source Role(s) | Priority | Monitoring / Mitigation |
| --- | --- | --- | --- | --- |
| R-001 | Non-TTY wizard usage causes blocked automation runs. | Release Operator | Must | Hard fail on non-TTY and test coverage for this path. |
| R-002 | Preset names drift across parser/help/docs/tests. | Governance Maintainer | Should | Canonical preset list reused in validation/help and checked by tests. |
| R-003 | Generic defaults become permissive again in future edits. | Security Reviewer | Should | Tests assert noop placeholder commands in generated generic config. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-001 | `init --preset` supports five presets with deterministic config generation. | CLI Engineer | Must | CLI tests assert new preset acceptance and generated gate commands. |
| AC-002 | `init --wizard` resolves supported combinations and fails unsupported or non-TTY cases clearly. | Release Operator, Skeptical Adopter | Must | Wizard resolver unit tests + CLI non-TTY integration test pass. |
| AC-003 | Generic preset is fail-closed by default for lint/format/test/build. | Security Reviewer | Must | Generated generic config includes noop placeholders and test coverage. |
| AC-004 | Tracker and docs reflect Stage 4 execution while keeping AG-GOV-003 open for Stage 5+. | Governance Maintainer | Must | Tracker rows and roadmap text updated with Stage 4 child items and status. |

# Open Questions

- OQ-001: None blocking.
- OQ-002: None blocking.

# Priority and Next Actions

## MoSCoW Summary

- Must: FR-001..FR-005, NFR-001..NFR-002, CON-001..CON-003, DEP-001..DEP-002, R-001, AC-001..AC-004
- Should: FR-006, NFR-003, R-002, R-003
- Could: none
- Won't: Stage 5+ features in Stage 4 execution

## Next Actions

1. Implement presets + generic hardening in init generation.
2. Implement wizard resolver + non-TTY protections and argument exclusivity.
3. Update tests/docs/tracker and run governance gates.

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: No

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials (for example `YOUR_API_KEY`)

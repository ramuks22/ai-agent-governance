# Input Summary

## Idea

- Tracker ID: `AG-GOV-003` (shared artifact for AG-GOV-012 and AG-GOV-013)
- Problem statement: framework adoption currently requires manual copy/clone behavior with no installable package entrypoint.
- Proposed change: ship package-first install and CLI-based initialization for v1.0 Stage 0-2.
- Intended outcome: adopters run `npx @ramuks22/ai-agent-governance <command>` instead of copying files.

## Context

- Known constraints: maintain existing governance behavior; no telemetry; Node runtime only; no Stage 3+ scope.
- Related systems: npm package distribution, git hooks (`core.hooksPath` and `.git/hooks`), existing scripts (`gates.mjs`, `commit-msg.mjs`).
- Source artifacts: `docs/tracker.md` AG-GOV-003 roadmap and prior critic audits in `plans/`.

# Ambiguities and Risks

## Facts

- Current quickstart requires copy/clone and local script wiring.
- Existing hook logic assumes repo-local scripts.
- Prior audits identified namespace, hook conflict, and smoke-test timing gaps.

## Assumptions

- v1.0 scope is limited to Stage 0-2.
- Package name is `@ramuks22/ai-agent-governance`.
- Existing manual mode remains available as fallback.

## Risks

- Hook-manager conflicts (Husky/lefthook) can break setup.
- Re-running init can overwrite local edits without guardrails.
- Cross-platform shell differences can break first-run adoption.

## Missing Information

- None blocking for Stage 0-2 execution.

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns framework rules and source-of-truth docs | Packaging changes must preserve governance semantics | maintainer |
| 2 | CLI/Runtime Engineer | Implements command routing and install behavior | Cross-platform command behavior and stable CLI interface | builder |
| 3 | DevEx Operator | Operates hooks and CI in real repos | Hook-manager conflicts and idempotent reruns | operator |
| 4 | Security Reviewer | Evaluates execution and side-effect boundaries | Prevent implicit arbitrary command execution | reviewer |
| 5 | Adopter (Skeptical) | Represents existing repo migration friction | Must work in existing repos, not only greenfield | dissenter |

# Simulated Workshop Output

## Role 1: Governance Maintainer

- What they care about: preserving current governance enforcement and auditability.
- Assumptions challenged: package migration should not require schema/rule rewrites.
- Risks identified: drift between package CLI and existing `governance:check` behavior.
- Constraints imposed: keep compatibility shims for existing script entrypoints.
- Requirement(s) insisted: `check` must behave equivalently to current governance validation.
- Disagreements: rejects v1.0 scope expansion into upgrade engine.

## Role 2: CLI/Runtime Engineer

- What they care about: deterministic command UX (`init`, `check`, `doctor`).
- Assumptions challenged: init can safely overwrite unknown files.
- Risks identified: rerun overwrite risk and weak error messaging.
- Constraints imposed: manifest checksums and `--force` gate for destructive paths.
- Requirement(s) insisted: normalized checksums + dry-run output.
- Disagreements: opposes delaying smoke tests to later phases.

## Role 3: DevEx Operator

- What they care about: safe hook installation in mixed toolchains.
- Assumptions challenged: `core.hooksPath` is always safe to set.
- Risks identified: collisions with Husky/lefthook.
- Constraints imposed: hook strategy modes and conflict detection in `auto` mode.
- Requirement(s) insisted: non-destructive default in conflict scenarios.
- Disagreements: rejects hidden hook overrides.

## Role 4: Security Reviewer

- What they care about: runtime execution boundaries and least privilege.
- Assumptions challenged: package CLI can run arbitrary commands from config.
- Risks identified: command-injection surface if execution model is vague.
- Constraints imposed: explicit local command list, no implicit network calls.
- Requirement(s) insisted: Stage 0 security model and doctor diagnostics.
- Disagreements: rejects telemetry in v1.0.

## Role 5: Adopter (Skeptical)

- What they care about: migration without replatforming entire repos.
- Assumptions challenged: this only works for greenfield repos.
- Risks identified: existing repos blocked by installer conflicts.
- Constraints imposed: keep manual mode fallback and migration note.
- Requirement(s) insisted: package-first quickstart plus legacy/manual fallback path.
- Disagreements: opposes removing manual path in v1.0.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-001 | Provide package CLI commands `init`, `check`, and `doctor` via `ai-governance`. | CLI/Runtime Engineer, Governance Maintainer | Must | `npx @ramuks22/ai-agent-governance init|check|doctor` executes successfully in test scenarios. |
| FR-002 | Keep existing script-based entrypoints compatible for current repo usage. | Governance Maintainer | Must | `npm run governance:init` and `npm run governance:check` still function. |
| FR-003 | `init` must support `--dry-run`, `--force`, `--preset`, `--hook-strategy`. | CLI/Runtime Engineer, DevEx Operator | Must | Help output and smoke tests confirm option parsing and behavior. |
| FR-004 | `init` must create `.governance/manifest.json` with normalized checksums for managed files. | CLI/Runtime Engineer | Must | Manifest exists and checksum verification passes in `doctor`. |
| FR-005 | In `auto` hook mode, detect Husky/lefthook and avoid overwriting existing hook manager configuration. | DevEx Operator | Must | Conflict scenario test shows warning and no forced `core.hooksPath` change. |
| FR-006 | Keep package-first quickstart and explicit legacy/manual mode fallback in docs. | Adopter (Skeptical) | Should | README/docs show package-first path and manual fallback label. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-001 | CLI behavior must be deterministic and cross-platform for Node 20+ execution. | CLI/Runtime Engineer | Must | Smoke tests run in CI/local without shell-specific assumptions. |
| NFR-002 | Security model must be explicit: local command execution only, no implicit network side effects. | Security Reviewer | Must | Stage 0 decision doc documents model and commands. |
| NFR-003 | Init reruns must be idempotent for unchanged managed files. | DevEx Operator | Must | Second init run without changes results in no-op/clean action list. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-001 | v1.0 scope is Stage 0-2 only; Stage 3+ remains deferred. | Governance Maintainer | Must | Tracker/docs explicitly state deferred phases. |
| CON-002 | No telemetry collection in v1.0. | Security Reviewer | Must | No telemetry code or runtime calls added. |
| CON-003 | Node runtime only in v1.0 (no Bun/Deno support). | Governance Maintainer | Must | Stage 0 decision doc and README state Node-only support. |

## Dependencies

| Dependency ID | Dependency | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| DEP-001 | npm scope publish permissions for `@ramuks22`. | Governance Maintainer | Must | Stage 0 preflight checklist includes `npm whoami` and access checks. |
| DEP-002 | Existing governance scripts remain available for compatibility shims. | Governance Maintainer | Must | CLI routing invokes existing validation paths. |

## Risks

| Risk ID | Risk | Source Role(s) | Priority | Monitoring / Mitigation |
| --- | --- | --- | --- | --- |
| R-001 | Hook-manager collision causes broken commits/pushes. | DevEx Operator | Must | `auto` strategy conflict detection + warning + explicit opt-in path. |
| R-002 | Installer overwrites customized governance files unexpectedly. | CLI/Runtime Engineer | Must | Manifest drift detection + `--force` requirement + dry-run preview. |
| R-003 | CLI drift from existing script behavior creates regressions. | Governance Maintainer | Should | Add CLI smoke tests and retain compatibility script entrypoints. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-001 | Fresh repo can initialize governance via package CLI without manual file copy. | Adopter (Skeptical), CLI/Runtime Engineer | Must | Smoke test scenario passes for fresh repo setup. |
| AC-002 | Existing repos with Husky/lefthook are not force-overwritten in `auto` mode. | DevEx Operator | Must | Conflict scenario logs warning and preserves existing manager. |
| AC-003 | `doctor` reports actionable PASS/FAIL diagnostics for config, hooks, tracker, and manifest integrity. | Security Reviewer, Governance Maintainer | Must | Doctor output contract test passes. |
| AC-004 | AG-GOV-011/012/013 each have tracker evidence and merge via governance protocol. | Governance Maintainer | Must | Tracker reflects child IDs with PR evidence at completion. |

# Open Questions

- OQ-001: None blocking for Stage 0-2 implementation.
- OQ-002: None blocking for Stage 0-2 implementation.

# Priority and Next Actions

## MoSCoW Summary

- Must: FR-001..FR-005, NFR-001..NFR-003, CON-001..CON-003, DEP-001..DEP-002, R-001..R-002, AC-001..AC-004
- Should: FR-006, R-003
- Could: none for Stage 0-2
- Won't: Stage 3+ features in v1.0

## Next Actions

1. Implement package CLI and compatibility shims (AG-GOV-012).
2. Implement installer manifest and hook conflict strategy (AG-GOV-013).
3. Update docs quickstart and roadmap boundary notes for package-first adoption.

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: No

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials (for example `YOUR_API_KEY`)

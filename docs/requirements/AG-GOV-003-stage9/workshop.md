# Input Summary

## Idea

- Tracker IDs: `AG-GOV-041`, `AG-GOV-042`, `AG-GOV-043`
- Problem statement: Stage 8 defined deterministic validation commands, but execution is still manual and release/distribution preflight checks are not codified into one repeatable command.
- Proposed change: add `release-check` automation for maintenance and distribution preflight, with on-demand workflow execution and no publish side effects.
- Intended outcome: reproducible release-readiness checks with auditable output and consistent docs/workflow enforcement.

Applicability: Required — Reason: behavior-changing governance automation for release maintenance and distribution preflight.

## Context

- Known constraints:
  - No scheduled cron automation in Stage 9.
  - Distribution scope is dry-run only (no automated publish/tagging).
  - AG-GOV-039 timeline remains separate and unchanged.
- Related systems:
  - CLI router (`bin/ai-governance.mjs`)
  - Governance command runtime (`scripts/governance-check.mjs`)
  - CI workflows (`.github/workflows/`)
- Source artifacts:
  - `docs/development/release-maintenance-policy.md`
  - `docs/development/greenfield-template-publication-runbook.md`
  - `docs/tracker.md`

# Ambiguities and Risks

## Facts

- Stage 8 tracker items (`AG-GOV-036/037/038`) are complete.
- Existing commands include `check`, `ci-check`, `doctor`, `upgrade`, `adopt`, and `rollback`.
- Existing deterministic maintenance validation commands are documented but not automated behind a single CLI entrypoint.

## Assumptions

- Stage 9 is behavior-changing and workshop-required.
- Release checks should fail fast and produce deterministic pass/fail output.
- On-demand workflow is preferred over scheduled automation.

## Risks

- Drift risk if Stage 8 manual commands and Stage 9 automation diverge.
- Publishing risk if distribution checks mutate release state.
- Documentation drift if Stage 8/9 wording remains inconsistent.

## Missing Information

- None blocking implementation.

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns policy and tracker consistency | Canonical validation contract must remain single-source and auditable | maintainer |
| 2 | CLI Maintainer | Owns command routing and deterministic runtime behavior | `release-check` scope semantics and failure contract must be explicit | builder |
| 3 | Release Operator | Owns pre-release verification in practice | Checks must be actionable and side-effect-free for release dry-runs | operator |
| 4 | Security Reviewer (Dissenter) | Challenges unsafe automation defaults | Prevent accidental publish/tag side effects and floating ref drift | dissenter |

# Simulated Workshop Output

## Role 1: Governance Maintainer

- What they care about: no parallel policy authority and explicit tracker evidence.
- Assumptions challenged: Stage 9 can skip normalization of stale Stage 8 wording.
- Risks identified: false audit posture if docs still state Stage 8 in progress.
- Constraints imposed: normalize Stage 8 complete wording before Stage 9 closure.
- Requirement(s) insisted: Stage 9 workshop artifact, tracker child IDs, and evidence-ready state transitions.
- Disagreements: none.

## Role 2: CLI Maintainer

- What they care about: predictable command parsing and clear scope contract.
- Assumptions challenged: reusing `--gate` for release checks.
- Risks identified: ambiguous options and inconsistent failures.
- Constraints imposed: new option must be `--scope maintenance|distribution|all` and mode-specific.
- Requirement(s) insisted: `release-check` command with deterministic scope behavior and explicit invalid-option errors.
- Disagreements: none.

## Role 3: Release Operator

- What they care about: one command for release readiness.
- Assumptions challenged: manual command lists are sufficient for recurring release checks.
- Risks identified: skipped checks during busy release windows.
- Constraints imposed: include both maintenance and distribution checks with clear output.
- Requirement(s) insisted: on-demand workflow and CLI parity for local/CI runs.
- Disagreements: none.

## Role 4: Security Reviewer (Dissenter)

- What they care about: safety boundaries.
- Assumptions challenged: preflight automation can include publish steps.
- Risks identified: accidental release mutation and floating reference drift.
- Constraints imposed: distribution checks must stay dry-run only and reject floating refs in pinned contexts.
- Requirement(s) insisted: `npm pack --dry-run` preflight plus `@main/@latest` guardrails where pinning is required.
- Disagreements: no publish/tag automation in Stage 9.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-041-001 | Add `release-check` CLI command with `--scope maintenance|distribution|all` (default `all`). | CLI Maintainer | Must | Help output and parser enforce valid scopes and mode-specific option usage. |
| FR-041-002 | Implement `maintenance` scope by codifying Stage 8 deterministic validation contract from release-maintenance policy. | Governance Maintainer, Release Operator | Must | Command reports deterministic PASS/FAIL for policy sections, pointer docs, compatibility alignment, offline guidance, and deprecation contract line. |
| FR-041-003 | Add on-demand GitHub workflow for release-check execution only (`workflow_dispatch` + `workflow_call`). | Release Operator | Must | Workflow runs `ai-governance release-check` without cron scheduling. |
| FR-042-001 | Implement `distribution` scope with dry-run-only checks (template pin, script contract, floating-ref guardrails, `npm pack --dry-run`). | Security Reviewer, CLI Maintainer | Must | Distribution scope fails on pin/script/floating-ref violations and never publishes/tags artifacts. |
| FR-042-002 | Update distribution runbook/docs to include Stage 9 preflight invocation. | Release Operator | Should | Runbook includes `release-check --scope distribution` as publication preflight step. |
| FR-043-001 | Add deterministic test coverage for new command behavior and scope outcomes. | Governance Maintainer, CLI Maintainer | Must | Tests cover help text, option guardrails, negative maintenance case, and positive scope runs. |
| FR-043-002 | Normalize stale Stage 8 wording in tracker/onboarding docs before Stage 9 closure. | Governance Maintainer | Must | Docs no longer claim Stage 8 is active/in progress. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-041-001 | Output ordering and check names are deterministic for CI/audit readability. | CLI Maintainer | Must | Repeated runs produce stable check ordering and labels. |
| NFR-041-002 | Stage 9 automation remains on-demand only. | Governance Maintainer | Must | No scheduled (`cron`) workflow trigger introduced. |
| NFR-042-001 | Distribution preflight remains non-mutating. | Security Reviewer | Must | No publish/tag commands are executed by release-check or workflow. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-041-001 | Keep AG-GOV-039 separate and unchanged in this stage. | Governance Maintainer | Must | No enforcement-policy decision changes under AG-GOV-039. |
| CON-041-002 | Keep Stage 9 distribution scope dry-run only. | Security Reviewer | Must | No `npm publish` or release-tag automation added. |
| CON-041-003 | Keep AG-GOV-003 epic open after Stage 9. | Governance Maintainer | Must | Tracker shows Stage 9 child progress while epic remains active. |

## Dependencies

| Dependency ID | Dependency | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| DEP-041-001 | Stage 8 canonical policy remains the source for maintenance checks. | Governance Maintainer | Must | release-check maintenance aligns with release-maintenance-policy content. |
| DEP-042-001 | Template package contract in `templates/greenfield/package.json` remains pinned and script-complete. | Release Operator | Must | Distribution scope validates template version/script contract. |

## Risks

| Risk ID | Risk | Source Role(s) | Priority | Monitoring / Mitigation |
| --- | --- | --- | --- | --- |
| R-041-001 | Maintenance checks drift from canonical policy text. | Governance Maintainer | Must | Validate required sections and key policy strings directly from canonical doc. |
| R-042-001 | Distribution checks inadvertently mutate release artifacts. | Security Reviewer | Must | Use dry-run-only checks and prohibit publish/tag actions. |
| R-043-001 | Stage wording drift confuses roadmap status. | Governance Maintainer | Should | Normalize Stage 8 completion language in README/docs/tracker. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-041-001 | `release-check --scope maintenance` passes in repository baseline and fails with actionable output when canonical policy contract is missing. | CLI Maintainer, Governance Maintainer | Must | CLI test coverage for positive and negative maintenance outcomes. |
| AC-042-001 | `release-check --scope distribution` validates template pin/script contract, floating-ref guardrails, and `npm pack --dry-run` success. | Security Reviewer, Release Operator | Must | CLI test + local run confirm deterministic pass/fail behavior. |
| AC-043-001 | On-demand workflow executes release-check without schedule trigger. | Release Operator | Must | Workflow definition contains `workflow_dispatch`/`workflow_call` only. |
| AC-043-002 | Stage 8 wording drift is removed and Stage 9 activation is reflected in tracker/onboarding docs. | Governance Maintainer | Must | Updated docs show Stage 8 complete and Stage 9 active. |

# Open Questions

- None.

# Priority and Next Actions

## MoSCoW Summary

- Must: `release-check` command/scopes, maintenance + distribution checks, on-demand workflow, deterministic tests, Stage wording normalization.
- Should: runbook preflight guidance update.
- Could: additional provider-specific preflight adapters (deferred).
- Won't: publish/tag automation in Stage 9.

## Next Actions

1. Add tracker Stage 9 child items and workshop completion evidence.
2. Implement `release-check` command with maintenance scope and on-demand workflow.
3. Implement distribution dry-run preflight checks and update runbook/docs.
4. Add tests, run governance gates, and advance Stage 9 child items to validation.

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: No

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials (for example `YOUR_API_KEY`)

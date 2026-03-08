# Input Summary

## Idea

- Tracker IDs: `AG-GOV-047`, `AG-GOV-048`, `AG-GOV-049`
- Problem statement: Stage 10 added deterministic release evidence artifacts, but there is still no controlled publish execution path with strict preconditions and audit-safe failure handling.
- Proposed change: add `release-publish` with dry-run default, explicit `--apply`, deterministic release-plan/release-result artifacts, and manual workflow execution.
- Intended outcome: complete the release lifecycle without introducing auto-publish or scheduled automation.

Applicability: Required — Reason: behavior-changing release execution contract (publish/tag) for governance automation.

## Context

- Known constraints:
  - No cron scheduling.
  - No auto-publish on tag.
  - AG-GOV-039 remains unchanged (`NextDue=2026-04-04`).
- Related systems:
  - CLI router (`bin/ai-governance.mjs`)
  - Governance runtime (`scripts/governance-check.mjs`)
  - Release workflows (`.github/workflows/release-check.yml`)
- Source artifacts:
  - `docs/development/release-maintenance-policy.md`
  - `docs/tracker.md`
  - `README.md`
  - `docs/README.md`

# Ambiguities and Risks

## Facts

- Stage 9 introduced `release-check` maintenance/distribution preflight.
- Stage 10 introduced deterministic `release-check` report artifacts.
- Package metadata is source-of-truth for version (`package.json`) and publish identity.

## Assumptions

- Stage 11 should keep publish execution human-triggered.
- Blocked preconditions should exit with code `2` and no side effects.
- Publish-side failures after mutation should exit with code `1` and include deterministic remediation guidance.

## Risks

- Accidental publish if apply path is not strongly gated.
- Secret leakage in release-plan/release-result artifacts.
- Partial release state if publish succeeds but tag push fails.

## Missing Information

- None blocking implementation.

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns tracker evidence and scope boundaries | Enforces Stage 11-only boundaries and deterministic closure criteria | maintainer |
| 2 | Release Operator | Executes release workflows | Needs reliable preconditions and deterministic recovery instructions | operator |
| 3 | CLI Maintainer | Owns command parsing/runtime side effects | Ensures dry-run default and option semantics remain backward-safe | builder |
| 4 | Security Reviewer (Dissenter) | Challenges unsafe release automation defaults | Prevents token leakage and rejects implicit publish behavior | dissenter |

# Simulated Workshop Output

## Role 1: Governance Maintainer

- What they care about: explicit precondition gating and tracker traceability.
- Assumptions challenged: release preflight implies publish readiness without separate execution contract.
- Risks identified: scope creep into scheduled release automation.
- Constraints imposed: manual triggers only and AG-GOV-039 isolation.
- Requirement(s) insisted: deterministic plan/result artifacts and PR-linked evidence.
- Disagreements: none.

## Role 2: Release Operator

- What they care about: a predictable apply flow and clear rollback/recovery guidance.
- Assumptions challenged: operators can infer recovery from logs.
- Risks identified: ambiguous remediation during partial failures.
- Constraints imposed: fixed remediation fields and step-level output.
- Requirement(s) insisted: no hidden side effects in dry-run mode.
- Disagreements: none.

## Role 3: CLI Maintainer

- What they care about: strict option validation and execution order.
- Assumptions challenged: existing release-check option parsing is sufficient for publish execution.
- Risks identified: command misuse if `--apply` is not explicit and scoped.
- Constraints imposed: locked option contract and deterministic artifact names.
- Requirement(s) insisted: package/version checks must read local `package.json` for fork-safe behavior.
- Disagreements: none.

## Role 4: Security Reviewer (Dissenter)

- What they care about: minimizing irreversible or unsafe release outcomes.
- Assumptions challenged: successful publish implies all release steps are safe.
- Risks identified: leaked credentials in failure diagnostics; unsafe auto-unpublish behavior.
- Constraints imposed: redact all artifact text and never auto-unpublish.
- Requirement(s) insisted: partial failure includes explicit manual steps and rollback guidance fields.
- Disagreements: rejects scheduled or auto-tag-triggered publish.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-047-001 | Add `release-publish` command with dry-run default and explicit `--apply` mutation path. | CLI Maintainer, Governance Maintainer | Must | Command defaults to no publish/tag side effects unless `--apply` is present. |
| FR-047-002 | Enforce preconditions before apply: clean tree, `main` branch, semver version, tag availability, npm auth, version-unpublished check, release-check pass, npm pack dry-run pass. | Release Operator | Must | Failed preconditions exit `2` with no publish/tag side effects. |
| FR-047-003 | Generate deterministic `release-plan.json` and `release-plan.md` for every invocation. | Governance Maintainer | Must | Plan artifacts are always written and include deterministic field ordering. |
| FR-047-004 | On apply, execute in locked order: publish -> create tag -> push tag; write deterministic `release-result.*`. | Release Operator, CLI Maintainer | Must | Step order and statuses are explicit in result artifacts. |
| FR-048-001 | Add manual-only Stage 11 workflow (`workflow_dispatch` + `workflow_call`) with artifact upload for release-plan/release-result files only. | Release Operator | Must | Workflow has no cron trigger and uploads only Stage 11 release artifacts with 14-day retention. |
| FR-048-002 | Update docs with dist-tag vs git-tag semantics and tag-push failure recovery guidance. | Governance Maintainer | Must | Policy and README/docs index include explicit guidance and command examples. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-047-001 | Redact sensitive values in release-plan/release-result artifacts and CLI diagnostics. | Security Reviewer | Must | Tests verify no raw token-like values leak into artifacts. |
| NFR-047-002 | Deterministic failure contract fields for apply/runtime failures: `failureStage`, `reason`, `safeToRetry`, `manualSteps[]`, `rollbackGuidance`. | Release Operator | Must | Result artifact includes fixed remediation shape when failures occur. |
| NFR-048-001 | Maintain backward compatibility for existing commands and options. | CLI Maintainer | Must | Existing `init/check/ci-check/release-check/doctor/upgrade/adopt/rollback` tests stay green. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-047-001 | No cron schedule or auto-publish-on-tag in Stage 11. | Governance Maintainer | Must | Workflow triggers remain manual and reusable only. |
| CON-047-002 | Do not change AG-GOV-039 policy/timeline in this stage. | Governance Maintainer | Must | AG-GOV-039 row/evidence remains unchanged. |
| CON-047-003 | Publish identity uses local package metadata (`name`, `version`) for fork-safe behavior. | CLI Maintainer | Must | Version/publish checks read from target repo `package.json`. |

## Dependencies

| Dependency ID | Dependency | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| DEP-047-001 | Stage 9/10 release-check contract remains canonical precondition input. | Governance Maintainer | Must | `release-publish` dry-run invokes release-check all-scope report mode before apply. |
| DEP-048-001 | NPM auth token provided via workflow secret for apply runs. | Release Operator | Must | Workflow docs and job env reference explicit secret requirement. |

## Risks

| Risk ID | Risk | Source Role(s) | Priority | Monitoring / Mitigation |
| --- | --- | --- | --- | --- |
| R-047-001 | Accidental publish due to wrong defaults. | Security Reviewer | Must | Default dry-run + explicit `--apply` enforced in parser and tests. |
| R-047-002 | Partial failure after publish creates ambiguous state. | Release Operator | Must | Deterministic remediation contract includes manual tag push path and no auto-unpublish. |
| R-048-001 | Stage wording drift across docs and tracker. | Governance Maintainer | Should | Stage 10 wording normalized and Stage 11 activation reflected consistently. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-047-001 | Dry-run mode writes release-plan artifacts and performs no publish/tag mutations. | Governance Maintainer | Must | Test verifies no publish/tag steps occur without `--apply`. |
| AC-047-002 | Blocked preconditions return exit `2` and prevent publish/tag side effects. | Release Operator | Must | Test covers blocked path (`dirty tree`, `wrong branch`, `auth missing`, or `version published`). |
| AC-047-003 | Apply failures return exit `1` and include deterministic remediation fields. | Security Reviewer | Must | Result artifact includes required failure contract fields with redact-safe content. |
| AC-048-001 | Stage 11 workflow is manual/reusable only and uploads only release-plan/release-result artifacts for 14 days. | Release Operator | Must | Workflow definition matches trigger and artifact constraints. |
| AC-049-001 | Stage 11 docs explicitly define dist-tag/git-tag semantics and tag-push recovery guidance. | Governance Maintainer | Must | Policy + README/docs index include consistent Stage 11 guidance. |

# Open Questions

- None.

# Priority and Next Actions

## MoSCoW Summary

- Must: release-publish command, strict preconditions, deterministic plan/result artifacts, apply step ordering, manual workflow, docs updates, redaction, failure contract.
- Should: stage wording normalization and tracker/doc consistency updates.
- Could: additional publish telemetry or provider adapters (deferred).
- Won't: cron or auto-publish-on-tag in Stage 11.

## Next Actions

1. Implement `release-publish` runtime and CLI routing.
2. Add Stage 11 workflow and update release docs.
3. Add deterministic tests and run governance gates.

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: No

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials (for example `YOUR_API_KEY`)

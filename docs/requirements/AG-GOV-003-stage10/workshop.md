# Input Summary

## Idea

- Tracker IDs: `AG-GOV-044`, `AG-GOV-045`, `AG-GOV-046`
- Problem statement: Stage 9 `release-check` validates release readiness but does not emit deterministic audit artifacts for local and workflow evidence retention.
- Proposed change: extend `release-check` with optional report output (`json|md|both`) and deterministic artifact generation under a controlled output directory.
- Intended outcome: keep existing dry-run behavior while enabling reproducible, redact-safe release evidence artifacts for governance audits.

Applicability: Required — Reason: behavior-changing release evidence contract for governance automation.

## Context

- Known constraints:
  - No publish or tag automation in Stage 10.
  - No cron scheduling additions.
  - Keep AG-GOV-039 owner-exception re-evaluation timeline unchanged (`NextDue=2026-04-04`).
- Related systems:
  - CLI router (`bin/ai-governance.mjs`)
  - Governance runtime (`scripts/governance-check.mjs`)
  - Release-check workflow (`.github/workflows/release-check.yml`)
- Source artifacts:
  - `docs/development/release-maintenance-policy.md`
  - `docs/tracker.md`
  - `README.md`
  - `docs/README.md`

# Ambiguities and Risks

## Facts

- Stage 9 delivered `release-check --scope maintenance|distribution|all`.
- Current `--report` option is reserved for `adopt` path output and cannot be reused without mode-aware parsing.
- Workflow currently runs release-check without report upload artifacts.

## Assumptions

- Default `release-check` invocation must remain backward-compatible (no artifact writes unless explicitly requested).
- Artifact outputs must be deterministic and parseable for future automation.
- Redaction requirements apply to both JSON and Markdown report outputs.

## Risks

- Secret leakage if check details are emitted without redaction.
- Audit inconsistency if report schema drifts between releases.
- Repository noise if generated report directory is not ignored.

## Missing Information

- None blocking implementation.

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns tracker, policy, and audit evidence expectations | Must preserve compatibility and evidence traceability while extending release-check behavior | maintainer |
| 2 | CLI Maintainer | Owns command parsing/runtime behavior | Must avoid `--adopt --report` regression when adding release-check report modes | builder |
| 3 | Release Operator | Uses workflow outputs for release readiness decisions | Needs deterministic artifacts and retention-safe workflow upload contract | operator |
| 4 | Security Reviewer (Dissenter) | Challenges leakage and unsafe defaults | Requires explicit redaction for secret-like values and no publish/tag side effects | dissenter |

# Simulated Workshop Output

## Role 1: Governance Maintainer

- What they care about: deterministic, auditable report format with schema versioning.
- Assumptions challenged: release-check stdout alone is sufficient evidence.
- Risks identified: schema drift and evidence inconsistency across runs.
- Constraints imposed: single schema version constant in runtime and docs.
- Requirement(s) insisted: report generation must be opt-in and traceable.
- Disagreements: none.

## Role 2: CLI Maintainer

- What they care about: mode-safe option parsing and backwards compatibility.
- Assumptions challenged: existing `--report` parsing can be reused without separation.
- Risks identified: breaking `adopt --report <path>` behavior.
- Constraints imposed: mode-aware `--report` semantics and `--out-dir` only for release-check.
- Requirement(s) insisted: deterministic file names and atomic writes.
- Disagreements: none.

## Role 3: Release Operator

- What they care about: portable evidence artifacts from local and workflow runs.
- Assumptions challenged: workflow logs alone meet review requirements.
- Risks identified: inability to retain structured evidence for release sign-off.
- Constraints imposed: workflow uploads only `report.json` and `report.md` with explicit retention window.
- Requirement(s) insisted: artifact upload on both pass and fail outcomes.
- Disagreements: none.

## Role 4: Security Reviewer (Dissenter)

- What they care about: preventing sensitive token leaks in generated artifacts.
- Assumptions challenged: release-check details never contain sensitive values.
- Risks identified: accidental inclusion of credential-like strings from command output.
- Constraints imposed: mandatory redaction patterns and test coverage.
- Requirement(s) insisted: no publish/tag automation and no environment dumps in reports.
- Disagreements: rejects any report format that can emit raw secrets.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-044-001 | Add optional release-check report output mode via `--report json|md|both`. | Governance Maintainer, CLI Maintainer | Must | Parser accepts valid values only for `release-check`; invalid values fail with actionable error. |
| FR-045-001 | Add optional output directory via `--out-dir <path>` for release-check report files. | CLI Maintainer | Must | Default is `.governance/release-check`; custom path writes report files there. |
| FR-045-002 | Generate deterministic `report.json` and `report.md` with fixed file names and stable ordering. | Release Operator | Must | Repeated runs with same repo state produce byte-stable logical output ordering. |
| FR-045-003 | Preserve `adopt --report <path>` behavior unchanged. | CLI Maintainer | Must | Existing adopt tests continue to pass without behavioral drift. |
| FR-046-001 | Update workflow to run report mode and upload only report artifacts with 14-day retention. | Release Operator | Must | `release-check.yml` uploads only `report.json` and `report.md` with `retention-days: 14`. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-045-001 | Reports must redact secret-like patterns in both JSON and Markdown output. | Security Reviewer | Must | Redaction tests cover AWS, GitHub, Slack, bearer, private key, and generic secret assignment patterns. |
| NFR-045-002 | Report writes must be atomic to prevent partial artifacts. | CLI Maintainer | Must | Writes use temp-file + rename pattern. |
| NFR-046-001 | Default `release-check` behavior remains non-mutating when `--report` is omitted. | Governance Maintainer | Must | No report directory/files created without `--report`. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-044-001 | No publish/tag automation is introduced in Stage 10. | Security Reviewer | Must | No publish/tag command additions in CLI or workflow. |
| CON-044-002 | No scheduled cron automation is introduced in Stage 10. | Governance Maintainer | Must | Workflow triggers remain `workflow_dispatch` and `workflow_call` only. |
| CON-044-003 | AG-GOV-039 remains unchanged in this stage. | Governance Maintainer | Must | Tracker evidence for AG-GOV-039 remains intact with due date `2026-04-04`. |

## Dependencies

| Dependency ID | Dependency | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| DEP-045-001 | Existing release-check check IDs remain stable for fixed severity mapping. | CLI Maintainer | Must | Report generation maps known IDs to severity metadata without rename drift. |
| DEP-046-001 | Workflow runner has artifact upload capability (`actions/upload-artifact@v4`). | Release Operator | Must | Workflow succeeds and uploads report artifacts. |

## Risks

| Risk ID | Risk | Source Role(s) | Priority | Monitoring / Mitigation |
| --- | --- | --- | --- | --- |
| R-045-001 | Report schema drift breaks downstream tooling. | Governance Maintainer | Must | Lock schema version constant and include it in tests/docs. |
| R-045-002 | Redaction misses token formats and leaks credentials. | Security Reviewer | Must | Add explicit regex set and negative tests for raw token presence. |
| R-046-001 | Generated artifacts get accidentally committed. | Release Operator | Should | Add `.governance/release-check/` to `.gitignore`. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-045-001 | `release-check` without `--report` behaves as before and creates no report files. | Governance Maintainer | Must | CLI test verifies no output directory when flag is absent. |
| AC-045-002 | `release-check --report json|md|both` creates parseable deterministic artifacts. | CLI Maintainer, Release Operator | Must | CLI tests validate schema shape, deterministic ordering, and file creation behavior. |
| AC-045-003 | Report artifacts contain no raw secret/token patterns covered by policy. | Security Reviewer | Must | Redaction tests pass for both JSON and Markdown output. |
| AC-046-001 | Release-check workflow uploads only report artifacts with 14-day retention. | Release Operator | Must | Workflow definition contains explicit artifact paths and retention days. |

# Open Questions

- None.

# Priority and Next Actions

## MoSCoW Summary

- Must: report mode/output directory, deterministic report schema/content, redaction coverage, workflow artifact upload, backward compatibility.
- Should: `.gitignore` update for report directory.
- Could: future schema expansion after Stage 10.
- Won't: publish/tag/cron automation in Stage 10.

## Next Actions

1. Implement mode-aware report parsing and release-check artifact generation.
2. Add deterministic tests and redaction coverage.
3. Update workflow/docs/tracker evidence and run full gates.

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: No

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials (for example `YOUR_API_KEY`)

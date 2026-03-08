# Input Summary

## Idea

- Tracker IDs: `AG-GOV-030`, `AG-GOV-031`, `AG-GOV-032`
- Problem statement: existing repositories without manifest baselines still need a safe migration path to package-managed governance artifacts.
- Proposed change: add `ai-governance adopt` with report-first default and explicit apply mode.
- Intended outcome: migration decisions are auditable, deterministic, and reversible.

## Context

- Scope: Stage 6 only under `AG-GOV-003`; Stage 7+ remains deferred.
- Key components: `bin/ai-governance.mjs`, `scripts/governance-check.mjs`, CLI tests, README/docs index, tracker.
- Existing baseline: `init/check/ci-check/doctor/upgrade/rollback` are already delivered.

# Ambiguities and Risks

## Facts

- Stage 5 is complete and Stage 6 is the next open installable-distribution milestone.
- Many existing adopters may already have governance files but no `.governance/manifest.json`.
- Existing `init` blocks unmanaged file drift by default.

## Assumptions

- Stage 6 is behavior-changing and workshop-required.
- Report-first migration reduces accidental file overwrites.
- Stage 6 should not introduce Stage 7 template/degit scope.

## Risks

- Data-loss risk if apply mode overwrites unmanaged changes without safeguards.
- False confidence risk if report output is not actionable.
- Drift risk if docs and CLI behavior diverge.

## Missing Information

- None blocking for Stage 6 implementation.

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns tracker/process contract | Phase+State and applicability evidence discipline | maintainer |
| 2 | CLI Maintainer | Owns command parser/runtime behavior | Deterministic command semantics and compatibility | builder |
| 3 | Repo Operator | Runs migration in real repos | Practical detection and actionable remediation output | operator |
| 4 | Security Reviewer (Dissenter) | Challenges fail-open behavior | Prevent unsafe apply behavior and enforce rollback safety | dissenter |

# Simulated Workshop Output

## Governance Maintainer

- Cares about: tracker traceability, workshop evidence, and non-scope drift.
- Challenges assumption: Stage 6 can be implemented without explicit child IDs and workshop linkage.
- Identifies risks: unclear phase transitions and missing audit trail.
- Imposes constraints: child IDs and shared workshop artifact required before implementation.
- Insists on requirements: Stage 6 child items with explicit applicability evidence.
- Disagrees with: combining Stage 6+Stage 7 in one milestone.

## CLI Maintainer

- Cares about: deterministic CLI contracts and non-breaking extensions.
- Challenges assumption: default apply mode is acceptable.
- Identifies risks: ambiguous precedence for preset/hook strategy resolution.
- Imposes constraints: precedence must be explicit and tested.
- Insists on requirements: `adopt` report mode default, explicit `--apply`, deterministic exit codes.
- Disagrees with: implicit repo mutation in default mode.

## Repo Operator

- Cares about: actionable migration plan and predictable artifact outputs.
- Challenges assumption: plain console output is enough for migration handoff.
- Identifies risks: manual interpretation errors when many files are involved.
- Imposes constraints: report sections and stable patch output path.
- Insists on requirements: report includes blockers, command guidance, per-file action table.
- Disagrees with: report output that lacks specific next-step commands.

## Security Reviewer (Dissenter)

- Cares about: fail-closed write path and rollback readiness.
- Challenges assumption: conflict warnings alone are sufficient.
- Identifies risks: overwrite/data-loss on dirty tree or unmanaged drift.
- Imposes constraints: clean-tree guard, pre-write snapshot, force-gated bypass only.
- Insists on requirements: blockers return explicit code and rollback guidance is printed.
- Disagrees with: apply path that writes before backups are created.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-030-001 | Add `ai-governance adopt` command with report-first default. | CLI Maintainer | Must | CLI help includes `adopt`; running without `--apply` writes report/patch only. |
| FR-030-002 | Resolve preset/hook strategy by precedence: CLI overrides -> existing manifest -> repo inference. | CLI Maintainer | Must | Tests cover each precedence source and expected selection. |
| FR-030-003 | Produce deterministic migration report and patch artifacts. | Repo Operator | Must | Report path defaults to `.governance/adopt-report.md`; patch path is stable and sorted by file path. |
| FR-031-001 | Add `adopt --apply` with fail-closed blocker behavior unless `--force`. | Security Reviewer | Must | Blocked migrations return code `2`; no writes occur before explicit override. |
| FR-031-002 | Require clean git tree before apply unless `--force`. | Security Reviewer | Must | Dirty-tree apply fails with actionable message and non-zero exit. |
| FR-031-003 | Capture pre-write snapshot before any apply writes and print rollback command. | Security Reviewer | Must | Successful apply logs snapshot ID and rollback guidance. |
| FR-032-001 | Update docs and tests to reflect Stage 6 behavior and keep Stage 7+ deferred. | Governance Maintainer, Repo Operator | Must | README/docs index mention adopt workflow and roadmap boundary; tests cover report/apply scenarios. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-030-001 | Keep existing commands backward-compatible. | CLI Maintainer | Must | Existing CLI regression tests remain green. |
| NFR-030-002 | Report format must be human-readable and deterministic. | Repo Operator | Must | Stable section order and deterministic file/action ordering. |
| NFR-031-001 | Safety checks must fail closed by default. | Security Reviewer | Must | Apply path blocks unsafe states without `--force`. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-030-001 | Stage 6 only; Stage 7 template/degit work is out-of-scope. | Governance Maintainer | Must | No Stage 7 features implemented. |
| CON-030-002 | No branch-protection policy changes in Stage 6. | Governance Maintainer | Must | No branch-protection workflow/policy edits in this item. |

## Dependencies

| Dependency ID | Dependency | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| DEP-030-001 | Tracker activation for AG-GOV-030/031/032 before implementation. | Governance Maintainer | Must | Tracker rows exist with active phase/state and workshop path evidence. |
| DEP-030-002 | Existing init/manifest/snapshot helpers are reused for apply safety. | CLI Maintainer | Must | Adopt apply flow uses existing managed-file and backup patterns. |

## Risks

| Risk ID | Risk | Source Role(s) | Priority | Monitoring / Mitigation |
| --- | --- | --- | --- | --- |
| R-030-001 | Inference ambiguity can produce wrong preset recommendations. | CLI Maintainer | Must | Explicit unsupported-combo blockers and precedence tests. |
| R-031-001 | Apply mode may overwrite unmanaged local edits. | Security Reviewer | Must | Blockers + clean-tree guard + snapshots + force gate. |
| R-032-001 | Docs drift can reduce migration adoption quality. | Repo Operator | Should | Update onboarding docs and keep examples aligned with CLI behavior. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-030-001 | `adopt` report mode generates actionable report and deterministic patch without writing managed files. | CLI Maintainer, Repo Operator | Must | Integration tests verify artifact creation and no managed-file mutations. |
| AC-031-001 | `adopt --apply` enforces blockers/dirty-tree checks and snapshot-before-write behavior. | Security Reviewer | Must | Tests verify blocked/non-blocked apply flows and snapshot evidence. |
| AC-032-001 | Stage 6 docs and tracker stay aligned; Stage 7+ remains deferred. | Governance Maintainer | Should | README/docs/tracker reflect Stage 6 active delivery boundaries. |

# Open Questions

- None.

# Priority and Next Actions

## MoSCoW Summary

- Must: adopt command, precedence resolution, report/patch artifacts, fail-closed apply, clean-tree guard, snapshot-before-write.
- Should: docs/test closure and clear migration troubleshooting guidance.
- Could: additional provider-specific migration helpers.
- Won't: Stage 7 template/degit functionality in Stage 6.

## Next Actions

1. Add Stage 6 tracker rows and shared workshop artifact.
2. Implement `adopt` report mode, then apply mode safeguards.
3. Expand tests and docs, then run full governance gates.

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: No

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials

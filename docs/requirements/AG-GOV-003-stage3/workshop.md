# Input Summary

## Idea

- Tracker IDs: `AG-GOV-003` (epic), `AG-GOV-014`, `AG-GOV-015`, `AG-GOV-016`
- Problem statement: v1.0 package mode adds init/check/doctor but lacks an upgrade path, rollback flow, and managed-block corruption detection.
- Proposed change: implement Stage 3 commands (`upgrade`, `rollback`) and deterministic managed-block integrity checks in doctor.
- Intended outcome: adopters can safely update framework artifacts, recover from bad updates, and detect corrupted managed markers.

## Context

- Known constraints: Node 20+ runtime, no telemetry, Stage 4+ features remain out of scope.
- Related systems: `.governance/manifest.json`, git hooks, package CLI routing, governance doctor diagnostics.
- Source artifacts: `docs/tracker.md`, `scripts/governance-check.mjs`, `bin/ai-governance.mjs`, `scripts/__tests__/cli.test.mjs`.

# Ambiguities and Risks

## Facts

- Stage 0-2 shipped in PR #6 with `init`, `check`, and `doctor`.
- Current manifest is version `1.0` and stores checksum-only file entries.
- Existing adopters can modify managed files locally, so upgrade safety must be conflict-aware.

## Assumptions

- Stage 3 may change CLI behavior but must remain backward-compatible for existing commands.
- Managed-block validation applies only to files with strategy `managed-block`.
- Backups are local repo artifacts and are not auto-pruned in Stage 3.

## Risks

- Manifest migration mistakes can break existing adopters.
- Rollback without safety checks can overwrite unrelated work.
- Marker corruption handling can generate false negatives without deterministic parsing.

## Missing Information

- None blocking for Stage 3 implementation.

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns policy compatibility and tracker discipline | Stage 3 must preserve governance guarantees and merge protocol | maintainer |
| 2 | CLI Engineer | Implements new command and argument flows | Deterministic command behavior across platforms | builder |
| 3 | Release Operator | Handles adoption and failure recovery in real repos | Upgrade conflict handling and rollback operability | operator |
| 4 | Security Reviewer | Reviews integrity and data-loss controls | Safe defaults for overwrite/restore paths | reviewer |
| 5 | Skeptical Adopter | Represents existing repos with custom edits | Upgrade must not destroy local customizations silently | dissenter |

# Simulated Workshop Output

## Role 1: Governance Maintainer

- What they care about: backward compatibility and auditable tracker evidence.
- Assumptions challenged: all adopters can tolerate forced file replacement.
- Risks identified: Stage 3 commands drift from governance docs if command contracts are vague.
- Constraints imposed: explicit CLI options and deterministic manifest contract.
- Requirement(s) insisted: read-compatible manifest migration and PR-linked tracker evidence.
- Disagreements: rejects introducing Stage 4 features in Stage 3.

## Role 2: CLI Engineer

- What they care about: stable command parser and predictable output.
- Assumptions challenged: patch output can be left undefined.
- Risks identified: ambiguous `--patch` behavior and mode routing regressions.
- Constraints imposed: non-interactive patch generation with deterministic pathing.
- Requirement(s) insisted: `upgrade`, `rollback`, and doctor checks covered by CLI tests.
- Disagreements: opposes interactive patch editing in this stage.

## Role 3: Release Operator

- What they care about: safe update and recovery under time pressure.
- Assumptions challenged: rollback can run safely on dirty working trees.
- Risks identified: accidental overwrite of uncommitted work.
- Constraints imposed: clean-tree requirement for rollback unless explicit `--force`.
- Requirement(s) insisted: pre-write backup snapshots before upgrade writes.
- Disagreements: rejects silent rollback target selection when backup IDs are available.

## Role 4: Security Reviewer

- What they care about: integrity checks that fail closed on corruption.
- Assumptions challenged: missing markers can be treated as non-fatal warnings.
- Risks identified: corrupted or tampered managed blocks bypass detection.
- Constraints imposed: doctor must fail deterministicly for marker corruption.
- Requirement(s) insisted: marker begin/end validation and checksum verification on managed block payload.
- Disagreements: rejects broad ignore behavior for malformed markers.

## Role 5: Skeptical Adopter

- What they care about: non-destructive defaults and clear remediation steps.
- Assumptions challenged: users will always rerun with `--force` without review.
- Risks identified: opaque conflict output leads to accidental loss of local edits.
- Constraints imposed: conflict summaries and optional patch file for manual review.
- Requirement(s) insisted: no-overwrite default and explicit conflict reasoning.
- Disagreements: opposes destructive updates without backup artifacts.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-001 | Add CLI `upgrade` command with options `--dry-run`, `--force`, and `--patch[=<path>]`. | CLI Engineer, Skeptical Adopter | Must | Command appears in help output and options are parsed deterministically. |
| FR-002 | Add CLI `rollback` command with options `--to <backup-id>`, `--dry-run`, and `--force`. | Release Operator, CLI Engineer | Must | Rollback can target latest or explicit backup ID with predictable output. |
| FR-003 | Migrate manifest contract to `manifestVersion: "2.0"` with read compatibility for `1.0`. | Governance Maintainer, CLI Engineer | Must | Existing v1 manifest is accepted; successful Stage 3 write emits v2 manifest. |
| FR-004 | Create backup snapshots before upgrade writes and record them in `.governance/backups/index.json`. | Release Operator, Security Reviewer | Must | Upgrade write path records immutable backup entry and restorable files. |
| FR-005 | Implement file strategy policy: `managed-block` for `.md/.yml/.yaml/.sh` and hooks; `full-file` for `.json`/unknown. | Governance Maintainer, Security Reviewer | Must | Manifest file entries include strategy consistent with policy. |
| FR-006 | Extend doctor with deterministic `managed-blocks` integrity check and corruption reasons. | Security Reviewer | Must | Doctor returns FAIL when marker pair is missing/malformed or managed payload checksum mismatches. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-001 | Stage 3 commands must default to non-destructive behavior. | Skeptical Adopter, Security Reviewer | Must | Upgrade without `--force` never overwrites conflicts; rollback blocks dirty-tree execution unless forced. |
| NFR-002 | All command outputs must be deterministic and script-friendly. | CLI Engineer | Must | Identical inputs produce stable action ordering and path formatting. |
| NFR-003 | Stage 3 must preserve existing `init/check/doctor` contracts for current adopters. | Governance Maintainer | Must | Existing Stage 0-2 tests continue passing after Stage 3 changes. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-001 | Stage 3 scope excludes presets/wizard/CI adapters/adopt command. | Governance Maintainer | Must | No Stage 4+ command or workflow is added. |
| CON-002 | Node runtime remains `>=20` with no telemetry. | Governance Maintainer, Security Reviewer | Must | No telemetry paths or non-Node runtime logic added. |
| CON-003 | Tracker evidence must remain PR-linked and merge-protocol compliant. | Governance Maintainer | Must | Tracker rows reference PRs and finalization uses merge-by-command protocol. |

## Dependencies

| Dependency ID | Dependency | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| DEP-001 | Existing Stage 0-2 manifest/init logic is the baseline for migration. | CLI Engineer | Must | Stage 3 reads old manifest entries without forced re-init. |
| DEP-002 | Git repository availability for clean-tree checks and restore workflows. | Release Operator | Should | Rollback safety check only enforces when inside git repo. |

## Risks

| Risk ID | Risk | Source Role(s) | Priority | Monitoring / Mitigation |
| --- | --- | --- | --- | --- |
| R-001 | Upgrade conflict handling still allows accidental overwrite under force. | Skeptical Adopter | Must | Force path always creates backup snapshot and prints overwrite summary first. |
| R-002 | Marker parsing edge cases create false corruption failures. | Security Reviewer | Should | Add tests for intact, missing, duplicate, and out-of-order markers. |
| R-003 | Rollback target ambiguity restores wrong snapshot. | Release Operator | Should | Backup IDs are explicit; default target is latest index entry. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-001 | `upgrade` supports dry run, conflict fail-closed behavior, force update, and patch file output. | CLI Engineer, Skeptical Adopter | Must | CLI tests cover no-op, conflict, force, and patch output scenarios. |
| AC-002 | `rollback` restores manifest and managed files from backup index entries. | Release Operator | Must | CLI test validates failed rollback without backups and successful forced restore with snapshot. |
| AC-003 | Doctor reports `managed-blocks` PASS/FAIL deterministically. | Security Reviewer | Must | CLI test validates PASS on intact markers and FAIL on corrupted markers. |
| AC-004 | AG-GOV-014/015/016 retain tracker traceability and remain governed by merge protocol. | Governance Maintainer | Must | Tracker rows reference workshop artifact and PR evidence on completion. |

# Open Questions

- OQ-001: None blocking.
- OQ-002: None blocking.

# Priority and Next Actions

## MoSCoW Summary

- Must: FR-001..FR-006, NFR-001..NFR-003, CON-001..CON-003, DEP-001, R-001, AC-001..AC-004
- Should: DEP-002, R-002, R-003
- Could: none
- Won't: Stage 4+ features in this implementation

## Next Actions

1. Implement command routing and parser updates for `upgrade` and `rollback`.
2. Implement manifest v2 + backup index + rollback execution in governance check script.
3. Add CLI test coverage for upgrade/rollback/managed-block integrity and update docs.

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: No

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials (for example `YOUR_API_KEY`)

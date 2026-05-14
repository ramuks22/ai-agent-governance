# Input Summary

## Idea

- Tracker ID: `AG-GOV-061`
- Problem statement: Repositories can declare a structured source of truth, such as `docs/tracker.json`, plus a generated markdown mirror, but governance does not detect stale generated outputs after source edits.
- Proposed change: Add config-backed generated artifact sync rules and enforce them from `check` and `ci-check`.
- Intended outcome: Stale source/generated relationships fail fast with actionable messages instead of relying on contributor memory.
- Applicability: Required — Reason: behavior-changing validation for generated source-of-truth relationships.

## Context

- Known constraints: No new dependencies; no generic merge engine; no automatic Git staging or commit behavior; generators are trusted repo-local commands.
- Related systems: `governance.config.schema.json`, `scripts/governance-check.mjs`, `scripts/__tests__/cli.test.mjs`, `README.md`, `docs/README.md`.
- Source artifacts: GitHub issue #42, `docs/tracker.md`, `.agent/workflows/requirements-workshop.md`.

# Ambiguities and Risks

## Facts

- Existing config already supports repo-owned commands through gates and `ci.preCiCommand`.
- Existing `check` and `ci-check` are the narrowest enforcement points that feed local hooks and CI parity.
- Running a generator can mutate local files before the validator reports drift.

## Assumptions

- Repos that configure a generated-artifact sync rule accept the generator command as trusted repo-local code.
- Source and generated files should be tracked or staged in Git when validation runs inside a Git repository.
- Configured generated paths are explicit; governance should not infer relationships from filenames.

## Risks

- A generator may be nondeterministic and cause repeated failures.
- A generator may rewrite more files than the configured source/generated paths.
- Running sync validation after `ci.preCiCommand` could let pre-CI generation mask stale artifacts.
- Comparing only the working tree could let a second local run pass after the first run updates generated files without staging them.

## Missing Information

- No additional CI-provider-specific diff contract is required for the first version.
- No adopter requested multiple commands per rule in this issue.

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns source-of-truth and generated artifact boundaries | Generated mirrors must not silently drift | Maintainer |
| 2 | CLI Maintainer | Owns config parsing and validation runtime | Keep execution deterministic and fail-closed without new dependencies | Builder |
| 3 | Repo Adopter | Configures repo-specific tracker generators | Needs a small explicit contract and actionable failures | Operator |
| 4 | Skeptical Reviewer | Challenges validation side effects | Avoid false passes, mutation surprises, and CI-only assumptions | Dissenter |

# Simulated Workshop Output

## Role 1: Governance Maintainer

- What they care about: Canonical source files and generated mirrors remain auditable.
- Assumptions challenged: Contributors will remember to run generators after source edits.
- Risks identified: Stale generated markdown can mislead reviewers and adopters.
- Constraints imposed: Sync relationships must be explicitly declared in config and validated by existing gates.
- Requirement(s) insisted: Drift must block `check` and `ci-check`.
- Disagreements: Does not want generated markdown to become canonical.

## Role 2: CLI Maintainer

- What they care about: Small config shape, schema validation, and deterministic execution.
- Assumptions challenged: A broad overlay or merge engine is needed.
- Risks identified: Running commands from validation can mutate files and mask later checks.
- Constraints imposed: Use one trusted shell command per rule; no new parser dependency.
- Requirement(s) insisted: Validate before `ci.preCiCommand` and compare generated outputs against the Git index when available.
- Disagreements: Rejects inferred/generated relationship discovery for this issue.

## Role 3: Repo Adopter

- What they care about: Clear setup for `docs/tracker.json` -> generated markdown.
- Assumptions challenged: Governance package defaults know adopter-specific generator names.
- Risks identified: Failure messages that do not say which command or generated files need action.
- Constraints imposed: Config must name the source path, generated paths, and command.
- Requirement(s) insisted: Messages must tell users to run the command and add/commit generated files.
- Disagreements: Accepts explicit config over magic detection.

## Role 4: Skeptical Reviewer

- What they care about: Prevent false confidence after local mutation.
- Assumptions challenged: Comparing only pre-run and post-run working tree content is sufficient.
- Risks identified: A failed run can leave generated files changed, then a second run can pass if the Git index is ignored.
- Constraints imposed: Inside Git, generated files must match the index after the generator runs.
- Requirement(s) insisted: Source mutation checks must be byte-exact, and pre-CI generation must not mask drift.
- Disagreements: Does not require a whole-repo dirty-tree policy in the first version.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-001 | Add optional `generatedArtifacts.syncRules` config with `name`, `sourcePath`, `generatedPaths`, and `command`. | Governance Maintainer, CLI Maintainer, Repo Adopter | Must | Config schema accepts valid rules and rejects malformed rules. |
| FR-002 | `check` must run configured sync commands and fail if generated outputs drift. | Governance Maintainer, CLI Maintainer | Must | CLI test proves current output passes and stale output fails. |
| FR-003 | `ci-check` must enforce sync before running pre-CI or gate commands. | CLI Maintainer, Skeptical Reviewer | Must | CLI test proves stale generated output fails before `ci.preCiCommand` and gates run. |
| FR-004 | Validation must fail when source or generated files are missing. | Governance Maintainer, Repo Adopter | Must | CLI test proves missing generated file fails before command execution. |
| FR-005 | Validation must fail when the generator exits non-zero. | CLI Maintainer | Must | CLI test proves command failure returns a sync-specific error. |
| FR-006 | Validation must fail if the generator mutates the canonical source. | Skeptical Reviewer | Must | CLI test proves source-only whitespace mutation is detected. |
| FR-007 | Forced adopt/upgrade regeneration must preserve configured sync rules. | Repo Adopter, Governance Maintainer | Must | CLI tests prove `generatedArtifacts` survives adopt and upgrade regeneration. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-001 | Do not add runtime dependencies. | CLI Maintainer | Must | Implementation uses existing Node and Git command patterns only. |
| NFR-002 | Failure messages must be actionable. | Repo Adopter | Must | Errors include rule name, command, and affected generated paths where applicable. |
| NFR-003 | Validation should avoid broad whole-repo dirty-tree enforcement. | Skeptical Reviewer | Should | Validator checks only configured source/generated files. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-001 | Do not infer generated relationships from filenames. | CLI Maintainer | Must | Only configured sync rules are evaluated. |
| CON-002 | Do not stage or commit generated outputs automatically. | Governance Maintainer, Repo Adopter | Must | Docs state manual add/commit is required. |
| CON-003 | Do not make generated markdown canonical. | Governance Maintainer | Must | Docs describe generated outputs as mirrors of configured sources. |

## Dependencies

| Dependency ID | Dependency | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| DEP-001 | Existing `check` and `ci-check` commands remain the enforcement entry points. | CLI Maintainer | Must | New validation is called from both paths. |
| DEP-002 | Git index is available when running inside a Git repo. | Skeptical Reviewer | Should | Validator falls back to working-tree baseline outside Git. |

## Risks

| Risk ID | Risk | Source Role(s) | Priority | Monitoring / Mitigation |
| --- | --- | --- | --- | --- |
| R-001 | Nondeterministic generators repeatedly fail validation. | Repo Adopter | Must | Document deterministic generator expectation through failure behavior. |
| R-002 | Generator mutates files outside configured paths. | Skeptical Reviewer | Should | First version scopes enforcement to declared paths; broader dirty-tree policy deferred. |
| R-003 | Old docs imply only `ci` is preserved through upgrade. | Governance Maintainer | Must | README migration notes include `generatedArtifacts`. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-001 | Config schema accepts explicit generated-artifact sync rules and rejects malformed rules. | CLI Maintainer | Must | `node --test scripts/__tests__/cli.test.mjs`. |
| AC-002 | `check` and `ci-check` fail on stale generated outputs. | Governance Maintainer, CLI Maintainer | Must | CLI tests cover both commands. |
| AC-003 | A second local run after a failed sync still fails until generated files are added to the Git index. | Skeptical Reviewer | Must | CLI stale-output test reruns validation and still fails. |
| AC-004 | `ci.preCiCommand` cannot mask stale generated outputs. | Skeptical Reviewer | Must | CLI test proves sync validation runs before pre-CI. |
| AC-005 | Source mutation is detected byte-for-byte. | Skeptical Reviewer | Must | CLI test covers trailing-whitespace-only source mutation, and checksum logic hashes file bytes. |
| AC-006 | Docs explain the source/generated contract and manual add/commit requirement. | Repo Adopter | Must | README and docs index updated. |

# Open Questions

- OQ-001: Should a future version support non-mutating check commands that emit generated content to stdout? Deferred.
- OQ-002: Should a future version enforce whole-repo dirty-tree checks after generators run? Deferred.

# Priority and Next Actions

## MoSCoW Summary

- Must: schema, check/ci-check enforcement, Git-index drift detection, source mutation detection, docs, tests.
- Should: focused actionable failure messages.
- Could: future non-mutating generator mode.
- Won't: auto-stage, auto-commit, generated relationship inference, or generic merge engine.

## Next Actions

1. Implement schema and validation runtime.
2. Add CLI tests for pass, stale output, second-run failure, missing files, command failure, source mutation, CI order, and preservation.
3. Run local validation and create PR evidence with `Closes #42`.

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: Yes, deferred future policy questions are explicitly listed.

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials

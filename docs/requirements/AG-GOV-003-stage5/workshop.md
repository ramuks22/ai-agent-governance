# Input Summary

## Idea

- Tracker ID: `AG-GOV-027`, `AG-GOV-028`, `AG-GOV-029`
- Problem statement: Stage 5 CI integration is still roadmap-only; adopters lack a deterministic CLI CI entrypoint and diagnostics to verify parity.
- Proposed change: add `ci-check`, reusable CI workflow guidance, and doctor parity checks across supported CI providers.
- Intended outcome: CI integration is reproducible, pinned, and auditable across GitHub/GitLab/Bitbucket without drifting from local governance gates.

## Context

- Known constraints: keep Stage 5 scoped to CI integration only; no Stage 6+ migration tooling.
- Related systems: CLI command router (`bin/ai-governance.mjs`), governance engine (`scripts/governance-check.mjs`), docs/workflows, tracker.
- Source artifacts: `docs/tracker.md`, `README.md`, `docs/README.md`, `.github/workflows/governance-ci.yml`.

# Ambiguities and Risks

## Facts

- Stage 4 was merged; Stage 5 remained as future scope.
- Current CLI has `init/check/doctor/upgrade/rollback` but no `ci-check`.
- Current doctor output has no CI parity status.

## Assumptions

- Stage 5 is behavior-changing and workshop-required.
- Pinned-version docs are required for reproducible CI setups.
- Backward compatibility must be preserved for existing commands.

## Risks

- CI recursion risk if a gate invokes `ci-check` itself.
- Provider drift risk if docs diverge between GitHub and non-GitHub examples.
- False confidence risk if doctor cannot detect missing `ci-check` invocations.

## Missing Information

- None blocking for Stage 5 implementation.

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns workflow contracts and tracker policy | Ensures phase/state + applicability evidence remain compliant | maintainer |
| 2 | CLI Maintainer | Owns command parser/runtime behavior | Ensures `ci-check` semantics are deterministic and backward-compatible | builder |
| 3 | CI Operator | Runs and debugs CI pipelines | Ensures provider docs/workflows are actionable and pinned | operator |
| 4 | Security Reviewer (Dissenter) | Challenges fail-open behavior | Prevents recursive checks and floating references from weakening enforcement | dissenter |

# Simulated Workshop Output

## Role 1: Governance Maintainer

- What they care about: tracker discipline, workshop traceability, and Phase+State correctness.
- Assumptions challenged: CI docs-only changes are enough without behavior checks.
- Risks identified: Stage 5 work shipped without explicit child tracking.
- Constraints imposed: child IDs required and evidence must link workshop artifact.
- Requirement(s) insisted: add AG-GOV-027/028/029 with active phases and applicability evidence.
- Disagreements: none.

## Role 2: CLI Maintainer

- What they care about: deterministic command behavior and compatibility.
- Assumptions challenged: CI command can be loosely defined.
- Risks identified: ambiguous `--gate` behavior and recursive command loops.
- Constraints imposed: fixed order `preCommit -> prePush`, fail-fast, explicit exit codes.
- Requirement(s) insisted: `ci-check` command + `--gate` contract + recursion guard.
- Disagreements: none.

## Role 3: CI Operator

- What they care about: practical integration in GitHub/GitLab/Bitbucket.
- Assumptions challenged: GitHub-only examples are sufficient.
- Risks identified: floating refs and docs drift cause non-reproducible CI.
- Constraints imposed: pinned references only; one canonical reusable workflow artifact.
- Requirement(s) insisted: reusable GitHub workflow + pinned cross-provider examples.
- Disagreements: none.

## Role 4: Security Reviewer (Dissenter)

- What they care about: fail-closed verification and anti-drift diagnostics.
- Assumptions challenged: existing doctor checks imply CI parity.
- Risks identified: CI files exist but do not invoke governance gates.
- Constraints imposed: deterministic CI parity check with clear remediation output.
- Requirement(s) insisted: add `doctor` check `ci-parity` with explicit pass/fail rules.
- Disagreements: none.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-027-001 | Add `ai-governance ci-check` command with `--gate precommit|prepush|all` (default `all`). | CLI Maintainer | Must | Help output and parser accept command/option; invalid `--gate` fails with allowed values. |
| FR-027-002 | `ci-check --gate all` runs `preCommit` then `prePush` in deterministic order and fails fast. | CLI Maintainer, Security Reviewer | Must | Test proves preCommit failure prevents prePush execution and returns non-zero. |
| FR-027-003 | Prevent recursion when gate command invokes `ci-check` directly or indirectly. | Security Reviewer | Must | `ci-check` exits with clear recursion error when configured gate contains self-invocation pattern. |
| FR-028-001 | Add a single reusable GitHub workflow artifact using `workflow_call`. | CI Operator | Should | Workflow file exists and is documented as canonical reusable integration path. |
| FR-028-002 | Update CI docs/examples for GitHub, GitLab, and Bitbucket with pinned package invocation. | CI Operator, Governance Maintainer | Must | Docs include pinned usage and no floating `@main`/latest references. |
| FR-029-001 | Add `doctor` check `ci-parity` for supported CI files and `ci-check` invocation detection. | Security Reviewer, CLI Maintainer | Must | Doctor outputs PASS/FAIL for `ci-parity` using deterministic matching rules and remediation guidance. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-027-001 | Keep existing commands (`init/check/doctor/upgrade/rollback`) backward-compatible. | CLI Maintainer | Must | Existing CLI tests remain green after Stage 5 changes. |
| NFR-028-001 | CI documentation must be deterministic and reproducible. | CI Operator | Must | Examples use pinned ref/version only; no floating ref remains. |
| NFR-029-001 | Diagnostics must be actionable and concise. | Security Reviewer | Should | `ci-parity` failures include exact next-step command/snippet pointer. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-027-001 | Stage 5 only; no Stage 6+ (`adopt`, templates, provider adapters beyond docs examples). | Governance Maintainer | Must | Scope of touched features remains `ci-check`, reusable workflow/docs, doctor parity only. |
| CON-027-002 | AG-GOV-003 epic stays open after Stage 5 delivery. | Governance Maintainer | Must | Tracker keeps AG-GOV-003 active until Stage 6+ explicitly resolved. |

## Dependencies

| Dependency ID | Dependency | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| DEP-027-001 | Tracker activation for AG-GOV-027/028/029 before implementation edits. | Governance Maintainer | Must | Tracker rows exist with active phase/state and applicability evidence. |
| DEP-027-002 | Existing gate command lists in governance config remain source for `ci-check`. | CLI Maintainer | Must | `ci-check` reads config gate arrays instead of hardcoded commands. |

## Risks

| Risk ID | Risk | Source Role(s) | Priority | Monitoring / Mitigation |
| --- | --- | --- | --- | --- |
| R-027-001 | Recursive gate execution can create infinite loops. | Security Reviewer | Must | Add recursion guard + negative test coverage. |
| R-028-001 | CI integration drifts across docs/providers. | CI Operator | Must | Maintain one canonical reusable workflow and aligned examples. |
| R-029-001 | False parity signals from doctor if CI files are present but not invoking `ci-check`. | Security Reviewer | Must | Match supported file set and require explicit invocation token detection. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-027-001 | `ci-check` command behaves per contract and supports gate scoping. | CLI Maintainer | Must | CLI tests for help, invalid gate, all/precommit/prepush paths pass. |
| AC-028-001 | Reusable GitHub workflow + pinned provider examples are documented and consistent. | CI Operator | Must | README/docs entries include canonical workflow + pinned commands. |
| AC-029-001 | `doctor` reports `ci-parity` pass/fail deterministically for supported files. | Security Reviewer | Must | Tests cover no-file, missing-invocation, and valid-invocation scenarios. |

# Open Questions

- OQ-001: None.
- OQ-002: None.

# Priority and Next Actions

## MoSCoW Summary

- Must: `ci-check` command semantics, recursion guard, doctor `ci-parity`, pinned docs, tracker activation.
- Should: reusable GitHub workflow artifact and concise remediation messages.
- Could: additional CI provider templates beyond snippets.
- Won't: Stage 6+ migration tooling in this stage.

## Next Actions

1. Add tracker rows and keep AG-GOV-003 epic open.
2. Implement CLI `ci-check` + doctor `ci-parity` with tests.
3. Add reusable workflow and pinned cross-provider CI docs.

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: No

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials (for example `YOUR_API_KEY`)

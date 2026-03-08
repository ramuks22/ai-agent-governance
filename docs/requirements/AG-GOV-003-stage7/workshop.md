# Input Summary

This workshop defines Stage 7 of AG-GOV-003: a greenfield project template distribution path that avoids manual copy/paste setup. Stage 7 must deliver a template artifact inside this repo, dual distribution guidance (degit + GitHub Template), and deterministic validation before closure.

# Ambiguities and Risks

Facts:
- Stage 0-6 of AG-GOV-003 are complete and merged.
- Existing repositories already have Stage 6 `adopt` migration path.
- Stage 7 must stay within docs/template scope (no new CLI mode).

Assumptions:
- Stage 7 is workshop-required due to onboarding behavior change.
- Template bootstrap uses existing CLI commands (`init`, `check`, `doctor`).
- Distribution guidance should support both degit and GitHub Template publication.

Risks:
- Template drift if governance artifacts are copied statically.
- Onboarding confusion between greenfield and existing repository paths.
- Version drift if template dependency pinning is not explicit.
- Ambiguous completion if publication runbook is incomplete.

# Required Workshop Roles

| Role | Why Needed | Unique Concern | Type |
|---|---|---|---|
| Governance Maintainer | Owns policy consistency and tracker discipline | Ensures Stage 7 does not conflict with governance source-of-truth docs | maintainer |
| CLI Maintainer | Owns install/init/check/doctor behavior | Ensures template bootstrap composes existing commands without new CLI mode | builder |
| Repository Operator | Represents adopter setup experience | Validates scaffold usability and minimal setup steps | affected user |
| Security Reviewer | Verifies safe defaults and pinning expectations | Prevents supply chain/version ambiguity in template dependency policy | reviewer |
| Dissenter (Skeptical Adopter) | Challenges friction and ambiguity | Flags confusing flows and hidden manual steps in distribution guidance | dissenter |

# Simulated Workshop Output

Governance Maintainer:
- Cares about canonical policy staying in workflow docs.
- Challenges assumption that examples/runbook cannot become normative drift.
- Requires explicit statement that runbook is operational guidance and does not override governance rules.

CLI Maintainer:
- Cares about reusing existing command contract.
- Challenges adding new Stage 7 CLI behavior.
- Requires template to call existing commands via scripts and keep package version pinned.

Repository Operator:
- Cares about fast time-to-first-commit for greenfield projects.
- Challenges multi-step setup if guidance is split or vague.
- Requires direct scaffold and bootstrap instructions that work end-to-end.

Security Reviewer:
- Cares about deterministic dependencies and minimum trust surface.
- Challenges floating version references.
- Requires pinned governance package version in template and explicit update policy in runbook.

Dissenter (Skeptical Adopter):
- Cares about avoiding duplicate onboarding paths with conflicting recommendations.
- Challenges dual-method docs if decision rule is missing.
- Requires explicit split: greenfield -> template path; existing repo -> adopt path.

# Detailed Requirements

## Functional Requirements

| ID | Requirement | Source Role(s) | Priority | Acceptance Criterion |
|---|---|---|---|---|
| FR-033-001 | Add `templates/greenfield/` as a self-contained project root. | Repository Operator, CLI Maintainer | Must | Scaffolded directory is runnable as standalone project root. |
| FR-033-002 | Template `package.json` includes pinned devDependency `@ramuks22/ai-agent-governance@1.1.0`. | Security Reviewer, CLI Maintainer | Must | Template package manifest contains exact pinned version string. |
| FR-033-003 | Template scripts include `governance:init`, `governance:check`, `governance:doctor`, and `governance:bootstrap`. | CLI Maintainer | Must | Scripts exist and `governance:bootstrap` composes `init -> check -> doctor`. |
| FR-034-001 | Onboarding docs must explicitly route greenfield users to template path and existing repos to `adopt`. | Repository Operator, Dissenter | Must | README + docs index contain explicit split guidance. |
| FR-034-002 | Stage 7 docs include both degit quickstart and manual GitHub Template publication runbook. | Repository Operator, Governance Maintainer | Must | Docs include both methods with clear usage context. |
| FR-034-003 | Runbook states it is operational guidance only and does not redefine governance policy. | Governance Maintainer | Should | Runbook includes canonical policy pointer and non-normative wording. |
| FR-035-001 | Add deterministic validation checks for Stage 7 template and docs contract. | Governance Maintainer, Security Reviewer | Must | Validation commands verify scripts/version pin/guidance text presence. |

## Non-Functional Requirements

| ID | Requirement | Source Role(s) | Priority | Acceptance Criterion |
|---|---|---|---|---|
| NFR-033-001 | Keep Stage 7 scope docs/template only (no new CLI mode). | CLI Maintainer, Governance Maintainer | Must | No new command/mode introduced in framework CLI contract. |
| NFR-033-002 | Keep onboarding guidance concise and actionable. | Repository Operator, Dissenter | Should | Greenfield vs existing decision is discoverable in one pass. |
| NFR-034-001 | Preserve canonical terminology for applicability/finalization terms. | Governance Maintainer | Must | Updated docs continue using canonical terms from governance workflow. |
| NFR-035-001 | Deterministic validation steps are reproducible locally. | Governance Maintainer | Must | Validation command set succeeds/fails consistently without manual interpretation. |

## Constraints

| ID | Constraint | Priority | Validation |
|---|---|---|---|
| CON-033-001 | No direct push to `main`; PR workflow required. | Must | All Stage 7 changes land via PRs. |
| CON-033-002 | Stage 8 scope remains deferred. | Must | Tracker/README wording keeps Stage 8 as roadmap. |
| CON-033-003 | Workshop completion required before implementation for AG-GOV-033/034/035. | Must | Tracker shows `Workshop / Complete` before implementation phase updates. |

## Dependencies

| ID | Dependency | Priority | Validation |
|---|---|---|---|
| DEP-033-001 | Existing Stage 6 `adopt` path remains canonical for existing repositories. | Must | Onboarding docs reference adopt for existing repos. |
| DEP-033-002 | Existing `init/check/doctor` command contract is reused by template bootstrap. | Must | Template scripts map to existing commands only. |

## Risks

| ID | Risk | Priority | Mitigation |
|---|---|---|---|
| R-033-001 | Template drift from canonical governance artifacts | Must | Bootstrap-driven generation, avoid static duplication. |
| R-034-001 | Onboarding ambiguity between greenfield and existing flows | Must | Explicit decision split in onboarding docs. |
| R-034-002 | Version drift in template dependency | Must | Pinned package version + runbook update policy. |
| R-035-001 | Validation subjectivity at closure | Should | Deterministic command checks in Stage 7 validation PR. |

# Open Questions

1. None blocking Stage 7 implementation.
2. Stage 8 publication automation remains explicitly deferred.

# Priority and Next Actions

Must-first actions:
1. Add tracker child items AG-GOV-033/034/035 and workshop completion evidence.
2. Build template artifact with pinned dependency and bootstrap scripts.
3. Update docs with greenfield vs existing split and dual distribution guidance.
4. Add deterministic validation checks and close child items.

# Quality Check

- Neutral facilitation preserved: yes.
- Dissenting perspective included: yes.
- Requirements traceable to workshop roles: yes.
- Scope boundaries clear (Stage 7 only, no Stage 8): yes.
- Decisions implementation-complete for Stage 7 execution: yes.

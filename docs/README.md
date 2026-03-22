# Documentation Index

This folder contains the governance framework documentation.

## Installable Distribution (AG-GOV-003 Stage 12+)

Package-first commands:

- `npx @ramuks22/ai-agent-governance init`
- `npx @ramuks22/ai-agent-governance init --wizard`
- `npx @ramuks22/ai-agent-governance check`
- `npx @ramuks22/ai-agent-governance ci-check --gate all`
- `npx @ramuks22/ai-agent-governance release-check --scope all`
- `npx @ramuks22/ai-agent-governance release-check --scope all --report both --out-dir .governance/release-check`
- `npx @ramuks22/ai-agent-governance release-publish --out-dir .governance/release-check`
- `npx @ramuks22/ai-agent-governance release-publish --apply --dist-tag next --tag v1.2.3 --out-dir .governance/release-check`
- `npx @ramuks22/ai-agent-governance doctor`
- `npx @ramuks22/ai-agent-governance upgrade`
- `npx @ramuks22/ai-agent-governance adopt`
- `npx @ramuks22/ai-agent-governance adopt --tracker-path docs/custom-tracker.json`
- `npx @ramuks22/ai-agent-governance adopt --apply --force`
- `npx @ramuks22/ai-agent-governance rollback`

Legacy/manual mode remains supported as fallback.

Onboarding split:

- Greenfield repos: scaffold from `templates/greenfield` (degit or GitHub Template), then run `npm run governance:bootstrap` (`degit` users run `git init` first).
- Existing repos: use Stage 6 migration (`adopt`) commands.
- Existing repos with custom or ambiguous tracker layouts: pass `--tracker-path <path>` so `adopt` preserves the current tracker instead of planning canonical `docs/tracker.md`.
- Existing npm repos with operational nested packages: if `adopt` reports `layout: hybrid` and `inferenceStatus: ambiguous`, rerun with an explicit `--preset`.

CI prerequisite hook:

- Set `ci.preCiCommand` in `governance.config.json` when CI needs a one-time codegen step before `ci-check` executes selected gates.
- The feature is config-driven inside `ci-check`; direct and reusable Governance CI workflows need no extra inputs.
- `doctor` remains invocation-based and does not validate the semantics of `ci.preCiCommand` independently.

### Governance Artifact Ignore Defaults

Recommended ignore entries for local governance artifacts:

```gitignore
.governance/backups/
.governance/release-check/
.governance/adopt-report.md
.governance/patches/adopt.patch
```

- `adopt` guidance is advisory-only and mentions only the current report/patch artifacts for that run.
- Blanket `.governance/patches/` is accepted as existing adopter coverage, but it is not the recommended shipped default.
- Repo-root `.gitignore` is the only file checked at runtime; global excludes, nested `.gitignore`, and `.git/info/exclude` can still cause false-positive guidance.

## Source of Truth

- `docs/development/delivery-governance.md` - delivery rules and quality gates
- `docs/development/release-maintenance-policy.md` - canonical release/maintenance contract (support SLA, compatibility matrix, offline install, deprecation workflow)
- `docs/development/greenfield-template-publication-runbook.md` - manual publication process for GitHub Template distribution (operational guidance)
- `.agent/workflows/governance.md` - workflow rules and stop conditions
- `.agent/workflows/governance.md` -> `Terminology Contract (Canonical)` - canonical governance terminology
- `.agent/workflows/requirements-workshop.md` - feature requirements workshop workflow
- `.agent/workflows/merge-pr.md` - merge-by-command protocol
- `docs/tracker.md` - tracker used by this repo

## Templates

- `docs/templates/tracker-template.md` - blank tracker template for adopters
- `docs/templates/requirements-workshop-template.md` - workshop output template

## Root-Level Files

- `governance.config.example.json` - example config (copy to `governance.config.json`)
- `.github/pull_request_template.md` - PR checklist template
- `.github/workflows/governance-ci.yml` - direct CI parity workflow
- `.github/workflows/governance-ci-reusable.yml` - reusable GitHub workflow (`workflow_call`)
- `.github/workflows/release-check.yml` - on-demand release preflight workflow (`workflow_dispatch` + `workflow_call`)
- `.github/workflows/release-publish.yml` - manual release execution workflow (`workflow_dispatch` + `workflow_call`)

## Examples

- `docs/examples/AG-GOV-004-workshop.md` - canonical workshop example
- `docs/examples/AG-GOV-009-workshop-adoption-examples.md` - concise workshop adoption examples for applicability, hotfix exception, and tracker evidence linkage
- `docs/requirements/AG-GOV-003/workshop.md` - workshop artifact for installable distribution v1.0 scope
- `docs/requirements/AG-GOV-003-stage3/workshop.md` - shared workshop artifact for Stage 3 upgrade/rollback/corruption handling
- `docs/requirements/AG-GOV-003-stage4/workshop.md` - shared workshop artifact for Stage 4 presets/wizard delivery
- `docs/requirements/AG-GOV-003-stage5/workshop.md` - shared workshop artifact for Stage 5 CI integration
- `docs/requirements/AG-GOV-003-stage6/workshop.md` - shared workshop artifact for Stage 6 adopt migration flow
- `docs/requirements/AG-GOV-003-stage7/workshop.md` - shared workshop artifact for Stage 7 greenfield template distribution
- `docs/requirements/AG-GOV-003-stage9/workshop.md` - shared workshop artifact for Stage 9 maintenance automation and distribution preflight
- `docs/requirements/AG-GOV-003-stage10/workshop.md` - shared workshop artifact for Stage 10 release evidence artifacts
- `docs/requirements/AG-GOV-003-stage11/workshop.md` - shared workshop artifact for Stage 11 controlled publish execution

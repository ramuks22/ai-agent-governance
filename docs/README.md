# Documentation Index

This folder contains the governance framework documentation.

## Installable Distribution (AG-GOV-003 Stage 6)

Package-first commands:

- `npx @ramuks22/ai-agent-governance init`
- `npx @ramuks22/ai-agent-governance init --wizard`
- `npx @ramuks22/ai-agent-governance check`
- `npx @ramuks22/ai-agent-governance ci-check --gate all`
- `npx @ramuks22/ai-agent-governance doctor`
- `npx @ramuks22/ai-agent-governance upgrade`
- `npx @ramuks22/ai-agent-governance adopt`
- `npx @ramuks22/ai-agent-governance adopt --apply --force`
- `npx @ramuks22/ai-agent-governance rollback`

Legacy/manual mode remains supported as fallback.

## Source of Truth

- `docs/development/delivery-governance.md` - delivery rules and quality gates
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

## Examples

- `docs/examples/AG-GOV-004-workshop.md` - canonical workshop example
- `docs/examples/AG-GOV-009-workshop-adoption-examples.md` - concise workshop adoption examples for applicability, hotfix exception, and tracker evidence linkage
- `docs/requirements/AG-GOV-003/workshop.md` - workshop artifact for installable distribution v1.0 scope
- `docs/requirements/AG-GOV-003-stage3/workshop.md` - shared workshop artifact for Stage 3 upgrade/rollback/corruption handling
- `docs/requirements/AG-GOV-003-stage4/workshop.md` - shared workshop artifact for Stage 4 presets/wizard delivery
- `docs/requirements/AG-GOV-003-stage5/workshop.md` - shared workshop artifact for Stage 5 CI integration
- `docs/requirements/AG-GOV-003-stage6/workshop.md` - shared workshop artifact for Stage 6 adopt migration flow

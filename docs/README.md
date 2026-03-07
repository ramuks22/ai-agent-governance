# Documentation Index

This folder contains the governance framework documentation.

## Installable Distribution (AG-GOV-003 v1.0)

Package-first commands:

- `npx @ramuks22/ai-agent-governance init`
- `npx @ramuks22/ai-agent-governance check`
- `npx @ramuks22/ai-agent-governance doctor`

Legacy/manual mode remains supported as fallback.

## Source of Truth

- `docs/development/delivery-governance.md` - delivery rules and quality gates
- `.agent/workflows/governance.md` - workflow rules and stop conditions
- `.agent/workflows/requirements-workshop.md` - feature requirements workshop workflow
- `.agent/workflows/merge-pr.md` - merge-by-command protocol
- `docs/tracker.md` - tracker used by this repo

## Templates

- `docs/templates/tracker-template.md` - blank tracker template for adopters
- `docs/templates/requirements-workshop-template.md` - workshop output template

## Root-Level Files

- `governance.config.example.json` - example config (copy to `governance.config.json`)
- `.github/pull_request_template.md` - PR checklist template

## Examples

- `docs/examples/AG-GOV-004-workshop.md` - canonical workshop example
- `docs/requirements/AG-GOV-003/workshop.md` - workshop artifact for installable distribution v1.0 scope

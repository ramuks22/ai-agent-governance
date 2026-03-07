# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-08

### Critical Fixes & Refinements

- **CI Parity**: Gates now run identical checks in CI/local (removed `noop` bypass).
- **Branch Protection**: Blocks pushes based on refspecs (not just current branch) to prevent bypass.
- **Secret Scan Safety**: "Fail safe" mode—scans ALL files in HEAD if git diff fails in CI.
- **Anchored Regex**: Automatically strips anchors from ID patterns for flexible validation.
- **Early Warning**: Added STOP checks for tracker ID, doc sync, and feature workflow.
- **Workflow**: Added "New Feature/Issue" flow (Investigate → Tracker → Fix).

## [1.0.0] - 2026-01-08

### Added

- **Core Governance Framework**
  - `AGENTS.md` – Non-negotiable rules for AI agents (tool-agnostic)
  - `.agent/workflows/governance.md` – Core governance checklist
  - `.agent/workflows/merge-pr.md` – Merge-By-Command Protocol
  - `docs/development/delivery-governance.md` – Full SAFe/PMP lifecycle framework

- **Configurable Enforcement**
  - `governance.config.json` – Project-specific configuration
  - `governance.config.schema.json` – JSON Schema for validation
  - Config-driven gates for pre-commit and pre-push hooks
  - Branch protection settings (block direct push to main/master)
  - Tracker ID pattern validation

- **Scripts**
  - `scripts/governance-check.mjs` – Self-check with `--init` bootstrap
  - `scripts/gates.mjs` – Pre-commit and pre-push gate execution
  - `scripts/commit-msg.mjs` – Commit message validator (tracker ID enforcement)
  - `scripts/install-githooks.mjs` – Automated hook installation

- **Git Hooks**
  - `pre-commit` – Runs pre-commit gates (format, lint, secret scan)
  - `pre-push` – Runs pre-push gates (tests, build) + branch protection
  - `commit-msg` – Validates tracker ID in commit messages

- **Templates**
  - `docs/templates/tracker-template.md` – Blank tracker structure

- **CI Parity**
  - `.github/workflows/governance-ci.yml` – GitHub Actions workflow mirroring local gates
  - `.github/ISSUE_TEMPLATE/governance-issue.md` – Issue template for governance issues

- **Multi-Tool Support**
  - Documentation for Cursor, GitHub Copilot, Claude Code, Antigravity, and other AI tools
  - Tool-agnostic design works with any AI coding assistant

- **Documentation**
  - Comprehensive README with quickstart guide
  - Source of Truth map
  - Configuration reference
  - Merge-by-command protocol documentation

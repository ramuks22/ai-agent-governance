# Governance Tracker

**Last Updated**: 2026-03-07

## How to Use

- Track each item using `Phase + State`.
- Phase values: `Idea`, `Discovery`, `Workshop`, `Design`, `Implementation`, `Validation`, `Merge`.
- State values: `Not Started`, `In Progress`, `Complete`, `Blocked`, `Cancelled`.
- `Done` is represented by `Phase=Merge` and `State=Complete` with PR reference in evidence.
- For feature-level work, `Workshop=Complete` is required before `Design` or `Implementation` starts (unless documented hotfix exception is approved).
- Update phase/state when work starts and finishes, and add PR references when merged.

## Findings (Prioritized)

| ID           | Priority | Persona | Finding / Impact | Evidence | Recommended Fix | Phase | State |
| ----------- | -------- | ------- | ---------------- | -------- | --------------- | ----- | ----- |
| AG-GOV-001  | Low      | Governance | **Initialize governance framework**: establish templates and configuration. | PR merged | Bootstrap config and confirm hooks are installed. | Merge | Complete |
| AG-GOV-002  | Critical | Governance | **v1.1 Critical Fixes**: CI parity, branch protection bypass, template drift, noop hard-fail, tests. | PR merged | See implementation plan. | Merge | Complete |
| AG-GOV-003  | High     | Governance | **Installable distribution and upgrade path**: adoption requires manual copy and has no upgrade story. | Manual copy instructions | Implement revised multi-phase installable distribution plan (see Future Scope). | Discovery | In Progress |
| AG-GOV-004  | High     | Governance | **Requirements workshop governance artifact**: workshop process, template, and Phase+State tracker model are missing. | Initial push to `main` (bootstrap) | Add workflow/template/docs updates only (no tooling expansion), aligned to governance source-of-truth docs. | Merge | Complete |
| AG-GOV-005  | High     | Governance | **Security gate review follow-up**: close final review gaps before push (workflow compliance + test coverage + cleanup). | Feature branch created (`codex/AG-GOV-005-secret-scan-finalize`), tests `43/43`, `governance:check`, `gate:precommit`, and `gate:prepush` all pass (2026-03-07). | Use feature branch + tracker mapping, add unquoted assignment test coverage, remove minor code drift, and re-run all gates. | Validation | Complete |

## Future Scope: Installable Distribution Plan (v1.1)

Phase 0 - Decision doc (required before Phase 1)
- Publish a one-page scope and support matrix: Node versions, OS support (Windows yes/no), Deno/Bun stance, offline install stance.
- Choose package name and namespace; verify npm availability before coding.
- Define breaking-change policy and deprecation window.
- Document CLI security model (what commands run, least-privilege approach).
- Decide telemetry policy (default off unless explicit opt-in).

Phase 1 - Package the core (release gate)
- Publish @org/governance (or final name) with a governance CLI that wraps gate logic and config parsing.
- Run gate logic from node_modules (no copied scripts).
- Add governance doctor to validate config, hooks, and CI parity.
- Add CLI smoke tests in this phase (init, doctor, basic gate run) as a release requirement.

Phase 2 - Installer (idempotent, conflict-aware)
- Implement governance init with --dry-run, --force, --preset, --hook-strategy.
- Write a manifest (.governance/manifest.json) with version, normalized checksums, and preset.
- Hook strategy:
  - Default to repo-local .githooks with core.hooksPath when safe.
  - Detect existing hook managers (Husky, lefthook) and prompt for opt-in.
  - Provide fallback to .git/hooks via explicit flag; document CI caveats.

Phase 3 - Upgrade, rollback, and corruption handling
- governance upgrade updates files that match normalized checksums (line endings and trailing whitespace normalized).
- For modified files, show diff and require explicit --force or --patch.
- Use managed template blocks (BEGIN/END markers) and have governance doctor flag block corruption.
- Provide governance rollback to restore prior manifest versions and backups.

Phase 4 - Presets and wizard
- Provide scoped presets (node-npm-cjs, node-npm-esm, node-pnpm-monorepo, node-yarn-workspaces).
- Add an interactive wizard to select package manager, module type, and monorepo layout.
- Generic preset keeps placeholders but adds TODO markers and guidance.

Phase 5 - CI integration (platform-agnostic)
- Publish a version-pinned GitHub Action/workflow.
- Provide a generic governance ci-check command with sample configs for GitLab and Bitbucket.
- Ensure governance doctor reports CI parity and points to docs.

Phase 6 - Migration for existing repos
- Add governance adopt to map existing hooks and configs into governance equivalents.
- Provide a report-only mode that outputs a migration checklist and diffs.

Phase 7 - Greenfield template
- Provide a GitHub template repo and/or degit template for new projects.
- Document that templates are for greenfield only, and point to adopt for existing repos.

Phase 8 - Release hardening and maintenance
- Document offline install (npm i -D @org/governance; npx governance init).
- Maintain an upgrade path section and compatibility matrix.
- Define a support SLA for releases and a policy for breaking changes.

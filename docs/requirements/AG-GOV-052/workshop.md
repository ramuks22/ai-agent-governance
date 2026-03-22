# AG-GOV-052 Workshop Artifact

Applicability: Required — Reason: behavior-changing adopt report artifact guidance and default ignore policy for generated governance artifacts.

## Input Summary

- Tracker ID: `AG-GOV-052`
- Related issue: GH #28 (`adopt --report` leaves adopters uncertain about whether generated report-only artifacts should be ignored by default)
- Current defect:
  - `adopt` writes `.governance/adopt-report.md` and `.governance/patches/adopt.patch` in report-only mode but does not give deterministic ignore guidance.
  - Shipped `.gitignore` defaults are inconsistent between this repo and the greenfield template.
  - A blanket `.governance/patches/` ignore rule would hide other governance patch workflows that should remain visible by default.
- Intended outcome: report-only `adopt` runs should emit advisory ignore guidance only when repo-root `.gitignore` coverage is missing or uncertain, and shipped defaults should align without mutating adopter repos.

## Decision Scope

In scope:

- Add adopt-specific runtime ignore guidance in report-only mode.
- Align shipped `.gitignore` defaults for governance local artifacts in this repo and the greenfield template.
- Document the heuristic limits and exact recommended ignore entries.
- Add CLI tests that cover guidance/no-guidance cases and preserve existing exit-code behavior.

Out of scope:

- No automatic `.gitignore` mutation in adopter repos.
- No new CLI flags or output-path redesign.
- No full gitignore parser or support for global/nested exclude resolution.
- No change to release-check/release-publish output layout.
- No fixes for GH #30 or other future adopt ergonomics in this item.

## Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns shipped defaults and advisory UX | Guidance must be deterministic without mutating adopter repos | Maintainer |
| 2 | CLI Maintainer | Owns `adopt` runtime output | Guidance must print before blocker exits and must not change exit codes | Builder |
| 3 | Repo Operator | Runs report-only migrations in real repos | Needs clear path-level advice on what to ignore and what not to hide | Operator |
| 4 | Skeptical Reviewer | Challenges heuristic overreach | Repo-root `.gitignore` checks must stay narrow and documented as imperfect | Dissenter |

## Decision Matrix

| Repo-Root `.gitignore` Coverage | Report Mode | Guidance Behavior | Exit Behavior |
| --- | --- | --- | --- |
| covers default report + patch paths | `adopt` report-only | no ignore guidance | preserve existing exit code |
| missing or uncertain coverage | `adopt` report-only | print adopt-specific guidance for actual report/patch paths | preserve existing exit code |
| custom `--report` path without exact coverage | `adopt` report-only | print guidance for custom report path and uncovered patch path | preserve existing exit code |
| any coverage state | `adopt --apply` | no ignore guidance | preserve existing apply behavior |

## Evidence Commands

Run from repository root:

```bash
node bin/ai-governance.mjs adopt
```

```bash
node bin/ai-governance.mjs adopt --report custom/adopt-review.md
```

```bash
npm test
npm run governance:check
npm run gate:precommit
npm run gate:prepush
```

## Acceptance Criteria

1. Report-only `adopt` prints deterministic ignore guidance when repo-root `.gitignore` does not clearly cover the current report and patch artifacts.
2. `adopt --apply` never prints ignore guidance.
3. Guidance is adopt-specific only and mentions only the actual report path and adopt patch path for the current run.
4. Shipped `.gitignore` defaults align across the repo root and `templates/greenfield/.gitignore`.
5. Blanket `.governance/patches/` is accepted as existing coverage for heuristic purposes but is not the recommended shipped default.
6. Known false-positive-guidance cases (`core.excludesFile`, nested `.gitignore`, `.git/info/exclude`) are documented explicitly.

## Traceability

- Epic: `AG-GOV-003` Stage 12+ installable-distribution follow-up.
- Source issue: GH #28.
- Affected runtime: `scripts/governance-check.mjs`, `scripts/__tests__/cli.test.mjs`.
- User-facing docs: `README.md`, `docs/README.md`, `templates/greenfield/README.md`.

## Output Contract

Report-only runtime guidance must:

- start with `[governance:adopt] Ignore guidance:`
- state that report-only artifacts are usually local review outputs and should be added to `.gitignore` unless intentionally preserved
- include the actual report path and adopt patch path
- avoid mentioning directory creation or non-adopt governance artifacts

Heuristic note:

- Coverage checks read repo-root `.gitignore` only, trim lines before exact comparison, and ignore blank/comment lines.
- Global gitignore, nested `.gitignore`, and `.git/info/exclude` may already cover these paths; in those cases guidance can still print as a known false-positive advisory.
- Blanket `.governance/patches/` counts as existing coverage if the adopter already has it, but the shipped default recommendation remains `.governance/patches/adopt.patch`.

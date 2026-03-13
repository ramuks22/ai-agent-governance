# AG-GOV-050 Workshop Artifact

Applicability: Required — Reason: behavior-changing adopt safety fix for custom tracker detection and tracker-path resolution.

## Input Summary

- Tracker ID: `AG-GOV-050`
- Related issue: GH #26 (`adopt` reports `hasTracker=false` and plans `docs/tracker.md` for repos that already have a tracker system)
- Current defect:
  - `detectAdoptRepoProfile()` only treats `docs/tracker.md` as tracker evidence.
  - `collectManagedItems()` always stages canonical tracker generation.
  - `upgrade` regenerates config from presets without preserving a custom `tracker.path`.
- Intended outcome: `adopt` must fail safe when tracker mapping is custom or ambiguous instead of creating a second tracker surface.

## Decision Scope

In scope:

- Add explicit tracker-resolution states for `adopt`.
- Add `--tracker-path <path>` for safe override when tracker mapping is ambiguous.
- Suppress canonical tracker/config writes when tracker mapping is unresolved.
- Preserve only `tracker.path` when regenerating config during `adopt` and `upgrade`.
- Update tests and docs for custom tracker handling.

Out of scope:

- No schema changes or manifest-version changes.
- No arbitrary custom-tracker content validation.
- No fixes for GH #27 or GH #28 in this item.
- No hook, CI, or branch-protection changes.

## Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns tracker semantics and repo safety guarantees | Prevent second tracker SSOT surfaces from being created automatically | Maintainer |
| 2 | CLI Maintainer | Owns `adopt` and `upgrade` runtime contracts | Keep detection deterministic without breaking preset-based generation | Builder |
| 3 | Repo Operator | Runs `adopt` against mature existing repos | Needs actionable blocked states and clear override path | Operator |
| 4 | Security Reviewer (Dissenter) | Challenges fail-open mutation behavior | Requires ambiguous detection to block before writes | Dissenter |

## Decision Matrix

| Tracker Status | Detection Rule | `hasTracker` | Default Behavior | Override Path |
| --- | --- | --- | --- | --- |
| `configured` | Valid existing config with existing `tracker.path` | `true` | Use that path; no canonical tracker generation | none |
| `configured-missing` | Valid existing config with missing `tracker.path` target | `false` | Block (`exit 2`); suppress tracker/config writes tied to unresolved mapping | fix config target or pass `--tracker-path` |
| `canonical` | `docs/tracker.md` selected | `true` when file exists | Use canonical path; canonical tracker generation allowed when selected | `--tracker-path docs/tracker.md` |
| `custom` | Exactly one non-canonical tracker candidate or explicit non-canonical override | `true` | Use custom path; suppress canonical tracker generation | none |
| `ambiguous` | Multiple non-canonical tracker candidates | `true` | Block (`exit 2`); suppress tracker/config writes tied to unresolved mapping | pass `--tracker-path` |
| `none` | No tracker evidence found | `false` | Canonical tracker generation allowed | optional `--tracker-path` |

## Evidence Commands

Run from repository root:

```bash
node bin/ai-governance.mjs adopt --report .governance/adopt-report.md
```

```bash
node bin/ai-governance.mjs adopt --tracker-path docs/custom-tracker.json --report .governance/adopt-report.md
```

```bash
node bin/ai-governance.mjs upgrade --dry-run
```

```bash
npm test
npm run governance:check
npm run gate:precommit
npm run gate:prepush
```

## Acceptance Criteria

1. Ambiguous or configured-missing tracker states block `adopt` with `exit 2`.
2. Blocked report/patch output must not propose `docs/tracker.md` or a config write with unresolved tracker mapping.
3. `--tracker-path` resolves ambiguous/custom tracker adoption without creating canonical tracker files.
4. `upgrade` preserves only `tracker.path` from an existing valid config while still regenerating preset defaults.
5. Canonical `docs/tracker.md` repos continue to behave as they do today.
6. No schema, manifest-version, hook, CI, or branch-protection changes are introduced.

## Traceability

- Epic: `AG-GOV-003` Stage 12+ installable-distribution follow-up.
- Source issue: GH #26.
- Affected runtime: `bin/ai-governance.mjs`, `scripts/governance-check.mjs`, `scripts/__tests__/cli.test.mjs`.
- User-facing docs: `README.md`, `docs/README.md`.

## Output Contract

Adopt reports must expose:

- `hasTracker: true|false`
- `trackerStatus: configured|configured-missing|canonical|custom|ambiguous|none`
- `trackerPath: <path|none>`
- `trackerCandidates: <comma-separated list|none>`

Data handling note:

- No secrets, tokens, or personal data may appear in tracker-candidate output or report artifacts.

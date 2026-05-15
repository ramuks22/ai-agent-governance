# Input Summary

## Idea

- Tracker ID: `AG-GOV-063`
- Problem statement: README and template guidance present npm package installation as the primary path, but `@ramuks22/ai-agent-governance` is not currently published to npm.
- Proposed change: Make the currently supported GitHub dependency install path explicit, use the installed local `ai-governance` binary in primary commands, and keep npm package commands behind a publication boundary.
- Intended outcome: Fresh adopters can install and run governance commands today without hitting npm 404s.
- Applicability: Required — Reason: behavior-changing adopter install and bootstrap guidance for unpublished package distribution.

## Context

- Known constraints: Do not publish to npm in this issue; do not remove future npm publication support; keep reusable CI local-runtime behavior from AG-GOV-057.
- Related systems: `README.md`, `docs/README.md`, `docs/development/release-maintenance-policy.md`, `templates/greenfield/package.json`, `scripts/governance-check.mjs`.
- Source artifacts: GitHub issue #34, `package.json`, `docs/tracker.md`.

# Ambiguities and Risks

## Facts

- The package name exists in `package.json`, but no npm release is available.
- GitHub dependency installs have already worked for adoption.
- Reusable CI now runs the caller repo's installed `ai-governance` binary via `npx --no-install`.

## Assumptions

- The current supported source is a pinned GitHub dependency until npm publication is complete.
- Published npm commands should remain documented only as optional/future commands after publication.
- Deterministic verification can assert documented commands and template dependency shape without performing network installs.

## Risks

- Placeholder pins such as `<PINNED_TAG_OR_SHA>` are explicit but not directly copy-paste runnable.
- A greenfield template dependency on a floating branch would restore nondeterminism.
- CLI-generated advisory commands can still point users at npm if not updated with the docs.

## Missing Information

- No npm package publication date is available.
- No release tag exists yet, so templates must use a pinned GitHub SHA or publication tooling must replace the pin later.

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Adopter Operator | Hit the npm 404 path during real adoption | Quickstart must work with the current distribution state | Affected User |
| 2 | Release Maintainer | Owns npm and GitHub distribution contracts | Keep npm publication as future/optional without false current claims | Maintainer |
| 3 | CLI Maintainer | Owns generated advisory command text and release checks | Commands should use installed local binaries where package source is not npm | Builder |
| 4 | Skeptical Reviewer | Challenges drift between docs, template, and validation | Avoid untested docs and floating dependency refs | Dissenter |

# Simulated Workshop Output

## Role 1: Adopter Operator

- What they care about: Running one documented install path that works today.
- Assumptions challenged: npm package availability can be assumed.
- Risks identified: New users fail before `init`, `adopt`, or `doctor`.
- Constraints imposed: README quickstart must start with a GitHub dependency install path.
- Requirement(s) insisted: Use `npx --no-install ai-governance` after install so npm is not queried again.
- Disagreements: Does not require npm publication in this issue.

## Role 2: Release Maintainer

- What they care about: Future npm release docs remain accurate after publication.
- Assumptions challenged: Removing npm references entirely is necessary.
- Risks identified: Optional npm examples may be misread as current.
- Constraints imposed: Label npm package commands as available only after publication or for pinned package pipelines.
- Requirement(s) insisted: Release policy must state the current GitHub dependency source and publication boundary.
- Disagreements: Does not want release-publish workflows changed.

## Role 3: CLI Maintainer

- What they care about: Runtime advisory commands match supported install paths.
- Assumptions challenged: Reports and "next command" output can keep using scoped package `npx`.
- Risks identified: Users follow generated fallback commands into npm 404s.
- Constraints imposed: Keep package name constants for metadata, but use local installed CLI command examples in user-facing guidance.
- Requirement(s) insisted: Tests must cover docs and generated advisory commands.
- Disagreements: Does not add network install tests.

## Role 4: Skeptical Reviewer

- What they care about: Determinism and drift control.
- Assumptions challenged: `github:...#main` is an acceptable supported template dependency.
- Risks identified: Floating refs make greenfield bootstrap nondeterministic.
- Constraints imposed: Greenfield template must use an exact supported dependency source or distribution checks must fail.
- Requirement(s) insisted: Release-check template pin validation must accept pinned GitHub tag/SHA or exact npm version, but reject floating refs.
- Disagreements: Does not require a new dependency parser.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-001 | README quickstart must use a currently supported GitHub dependency install path. | Adopter Operator | Must | Docs test asserts quickstart contains `github:ramuks22/ai-agent-governance#<PINNED_TAG_OR_SHA>` and no primary npm install. |
| FR-002 | Primary command examples must use the installed local `ai-governance` binary. | Adopter Operator, CLI Maintainer | Must | Docs and generated advisory tests assert `npx --no-install ai-governance ...`. |
| FR-003 | Optional npm package commands must be clearly gated on npm publication. | Release Maintainer | Must | README labels direct package commands as optional after publication. |
| FR-004 | Greenfield template dependency must avoid unpublished npm package assumptions. | Skeptical Reviewer | Must | Template package uses a GitHub dependency pin or exact npm version accepted by release-check. |
| FR-005 | Release-check distribution validation must accept exact GitHub pins and reject floating refs. | CLI Maintainer, Skeptical Reviewer | Must | CLI tests and `release-check` continue to pass with current template. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-001 | Do not add network-dependent tests. | CLI Maintainer | Must | Tests inspect docs/template/config deterministically. |
| NFR-002 | Do not remove future npm release support. | Release Maintainer | Must | Release-publish flow and optional pinned package docs remain. |
| NFR-003 | Keep changes incremental and targeted. | Skeptical Reviewer | Must | No new package manager or installer abstraction is introduced. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-001 | Do not publish to npm in this issue. | Release Maintainer | Must | No publish workflow behavior changes. |
| CON-002 | Do not use floating Git refs for published/distribution template pins. | Skeptical Reviewer | Must | Release-check rejects `#main`, `#master`, `#latest`, `@main`, and `@latest`. |
| CON-003 | Keep reusable workflow local-runtime contract unchanged. | CLI Maintainer | Must | Existing reusable CI tests continue to pass. |

## Dependencies

| Dependency ID | Dependency | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| DEP-001 | GitHub dependency installs support package `bin` exposure through local `node_modules/.bin`. | Adopter Operator | Must | Existing local-runtime tests and command examples use `npx --no-install ai-governance`. |
| DEP-002 | Release-check remains the deterministic distribution preflight. | Release Maintainer | Must | `npm run governance:check` and release-check tests pass. |

## Risks

| Risk ID | Risk | Source Role(s) | Priority | Monitoring / Mitigation |
| --- | --- | --- | --- | --- |
| R-001 | Users copy placeholder pins without replacing them. | Adopter Operator | Should | Docs explicitly call out replacing `<PINNED_TAG_OR_SHA>`. |
| R-002 | Template pin ages behind main. | Release Maintainer | Should | Runbook instructs maintainers to update the pin during template publication. |
| R-003 | Historical docs still contain npm-first examples. | Skeptical Reviewer | Low | Historical workshop artifacts are not retro-rewritten; active docs are updated. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-001 | README no longer presents npm package install as the primary current path. | Adopter Operator | Must | CLI docs test. |
| AC-002 | Supported install source is explicit. | Release Maintainer | Must | README/docs/release policy include GitHub dependency source. |
| AC-003 | Documented quickstart command shape is verified deterministically. | CLI Maintainer | Must | CLI docs test inspects quickstart and template dependency. |
| AC-004 | Greenfield template bootstrap dependency avoids npm 404. | Skeptical Reviewer | Must | Template package dependency uses accepted GitHub pin or exact package version. |
| AC-005 | Existing release and governance validation remain green. | CLI Maintainer | Must | `npm test`, `npm run governance:check`, and gates pass. |

# Open Questions

- OQ-001: When will npm publication happen? Deferred to release process.
- OQ-002: Should a release tag be created specifically for GitHub dependency installs? Deferred to release governance.

# Priority and Next Actions

## MoSCoW Summary

- Must: README current install path, docs index command updates, template dependency pin, release-check acceptance, deterministic tests.
- Should: release policy/runbook alignment.
- Could: future live install smoke test against a release tag.
- Won't: npm publish, new package manager abstraction, or network-dependent CI install.

## Next Actions

1. Update active install docs and generated command examples.
2. Update greenfield template dependency and distribution pin validation.
3. Add deterministic docs/template tests.
4. Run validation and create PR evidence with `Closes #34`.

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: Yes, npm publication timing and release tagging are deferred.

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials

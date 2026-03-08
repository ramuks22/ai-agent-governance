# AG-GOV-039 Workshop Artifact

Applicability: Required — Reason: security/governance branch-protection exception re-evaluation affects enforcement policy.

## Input Summary

- Tracker ID: `AG-GOV-039`
- Related item: `AG-GOV-022` (owner merge exception policy)
- Current checkpoint due date: `2026-03-21`
- Current branch-protection baseline (captured `2026-03-08`):
  - `required_contexts=[governance, pr-checklist]`
  - `strict=true`
  - `approvals=1`
  - `dismiss_stale=true`
  - `require_conversation_resolution=true`
  - `allow_force_pushes=false`
  - `allow_deletions=false`
  - `enforce_admins=false` (timeboxed exception active)

## Decision Scope

In scope:

- Re-evaluate owner exception status for `enforce_admins`.
- Confirm whether current protection profile still matches canonical policy (except approved exception field).
- Record deterministic evidence and next due-date decision in tracker/PR.

Out of scope:

- No CLI/script/schema/version changes.
- No hook or CI workflow logic changes.
- No AG-GOV-003 Stage 9 implementation.

## Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns policy execution and tracker evidence quality | Ensures branch-protection contract remains auditable and timeboxed | Maintainer |
| 2 | Repository Owner | Approves/continues owner-specific exception path | Confirms whether owner bypass is still operationally required | Affected User |
| 3 | Security/Compliance Sceptic | Challenges prolonged exception usage | Ensures exception is not silently normalized into permanent policy | Dissenter |

## Decision Matrix

| Decision | Preconditions | Required Actions | AG-GOV-039 Phase/State | Next Due |
| --- | --- | --- | --- | --- |
| `keep_exception` (default) | Protection baseline matches policy and owner still requires bypass | Keep `enforce_admins=false`; update AG-GOV-022 and AG-GOV-039 evidence with current snapshot and rollover | `Validation / In Progress` | `2026-04-04` |
| `restore_enforcement` | Owner bypass no longer required | Set `enforce_admins=true`; verify protection API; update evidence and close item | `Merge / Complete` | `none` |
| `drift_block` | Protection fields drift beyond approved exception | Create `AG-GOV-040` (Critical); set AG-GOV-039 `Blocked`; resolve drift before renewing exception | `Blocked` | `none` |

## Evidence Commands

Run from repository root:

```bash
gh api repos/ramuks22/ai-agent-governance/branches/main/protection
```

```bash
gh api repos/ramuks22/ai-agent-governance/branches/main/protection/enforce_admins
```

```bash
npm run governance:check
npm run gate:precommit
npm run gate:prepush
```

## Acceptance Criteria

1. Re-evaluation outcome is one of: `keep_exception`, `restore_enforcement`, `drift_block`.
2. Evidence is recorded in both `AG-GOV-022` and `AG-GOV-039` rows.
3. Evidence includes branch-protection snapshot values and decision result.
4. If `keep_exception`, next due date is exactly `2026-04-04`.
5. If `restore_enforcement`, `enforce_admins=true` is verified in API output.
6. If `drift_block`, `AG-GOV-040` is created as a critical follow-up before merge.

## Traceability

- Governing policy source: `.agent/workflows/governance.md` -> `Required Branch Protection for main` and `Approved exception policy (timeboxed)`.
- Existing exception record: `AG-GOV-022` in `docs/tracker.md`.
- Current cycle item: `AG-GOV-039` in `docs/tracker.md`.

## Output Contract

Use this single-line evidence format in tracker rows:

`YYYY-MM-DD | ReEval=AG-GOV-039 | contexts=[governance,pr-checklist] | approvals=1 | enforce_admins=<true|false> | Decision=<keep_exception|restore_enforcement|drift_block> | NextDue=<YYYY-MM-DD|none> | PR #<n>`

Data handling note:

- No secrets, tokens, or personal data may be included in the evidence payload.

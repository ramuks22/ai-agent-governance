# AI Agent Governance Workflow

This workflow governs all contributions (human + AI).

## 🛑 STOP — Check Before Any Action

Before each major step, verify:

| Step                   | Check                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **New Feature/Issue**  | Investigate → Create Tracker Item → Fix (Strict Sequence)                                                                   |
| **Before coding**      | Is tracker ID assigned? Is `docs/tracker.md` phase/state updated to active work? Is quick applicability decision completed? |
| **Feature-level gate** | If applicability is `Required`, is requirements workshop complete and linked (or approved hotfix exception documented)?     |
| **Before commit**      | Are all changed files consistent with tracker scope?                                                                        |
| **Before push**        | Did gates pass? Is tracker still accurate?                                                                                  |
| **Before merge**       | Is tracker ready for finalization (`Phase=Merge, State=Complete`)? Are docs updated?                                         |

> ⚠️ **If any check fails**: STOP and resolve before proceeding.

---

## Source of Truth

- Tracker: `docs/tracker.md`
- Delivery governance: `docs/development/delivery-governance.md`

## Terminology Contract (Canonical)

This section is the single canonical source for governance terminology.

Approved terms:

- Exempt category term: `documentation-only changes`
- Tracker finalization term: `Phase=Merge, State=Complete`
- Applicability evidence line: `Applicability: Required|Not Required — Reason: <one line>`

Disallowed aliases in normative guidance:

- shorthand docs/documentation aliases (for example `docs` + `only`) are disallowed (use `documentation-only changes`)
- `` `Merge` + `Complete` `` and `` `Merge / Complete` `` (use `Phase=Merge, State=Complete`)

Legacy boundary:

- Historical tracker evidence text is not retro-rewritten; only active guidance and new evidence must use canonical terms.

## Terminology Validation Commands (Deterministic)

Run these commands to validate terminology alignment:

1. Disallow shorthand in normative docs:

```bash
rg -n "\\bdocs-only\\b" AGENTS.md .agent/workflows/governance.md .agent/workflows/requirements-workshop.md .agent/workflows/merge-pr.md docs/development/delivery-governance.md README.md docs/README.md
```

Expected: no matches.

2. Require canonical exempt phrase:

```bash
rg -n "documentation-only changes" .agent/workflows/governance.md .agent/workflows/requirements-workshop.md docs/development/delivery-governance.md
```

Expected: matches present.

3. Require canonical finalization phrase:

```bash
rg -n "Phase=Merge, State=Complete" AGENTS.md .agent/workflows/governance.md docs/development/delivery-governance.md docs/tracker.md README.md
```

Expected: matches present.

4. Require canonical applicability evidence phrase:

```bash
rg -n "Applicability: Required\\|Not Required — Reason: <one line>" AGENTS.md .agent/workflows/governance.md .agent/workflows/requirements-workshop.md docs/development/delivery-governance.md .github/pull_request_template.md
```

Expected: matches present.

5. Definition-of-Done structure check:

```bash
rg -n "^## Definition of Done" .agent/workflows/governance.md docs/development/delivery-governance.md
```

Expected: canonical + pointer-consistent structure.

## Mandatory Workflow

1. Every change maps to a tracker ID or an explicit exception.
2. Update tracker phase/state when work starts and finishes.
3. Before coding, complete the quick applicability decision and record PR evidence.
4. If applicability is `Required`, complete the requirements workshop before implementation.
5. Use local gates (pre-commit + pre-push).
6. No direct pushes to `main`.

## Requirements Workshop Gate

For feature-level work, run `.agent/workflows/requirements-workshop.md` and store output at:

`docs/requirements/<TRACKER-ID>/workshop.md`

### Applicability

Primary rule (<=60 seconds):

1. Answer the four yes/no checks in `.agent/workflows/requirements-workshop.md`.
2. If any answer is `Yes`, workshop is required.
3. If all answers are `No` and the change is an exempt category, workshop is not required.
4. If uncertain, workshop is required.

Required PR evidence:

- `Applicability: Required|Not Required — Reason: <one line>`
- Tracker evidence must reference the PR containing this line.

Supporting category examples (secondary guidance):

Required examples:

- net-new features
- behavior-changing enhancements
- cross-team, API, or data model changes
- security, privacy, compliance, or legal-impacting work

Not-required examples:

- documentation-only changes
- dependency bumps without behavior change
- cosmetic refactors or chore-only changes

### Hotfix Exception

If urgent production impact requires immediate implementation:

Record the exception in the PR body or tracker using this canonical 4-field contract:

- `Reason`: concise production-impact justification for bypassing workshop-first flow.
- `Approvers`: delivery owner and governance maintainer.
- `Due Date`: `YYYY-MM-DD` for retroactive workshop completion.
- `Retroactive Completion Evidence`: link/path to the completed workshop artifact or equivalent closure proof.

Then complete and link the workshop artifact within 2 business days.

## Before Pushing

Run pre-push gates:

```bash
npm run gate:prepush
```

**Bypass Policy (Non-Negotiable)**: If a `git push` fails and you intend to bypass
checks with `--no-verify`:

- STOP. You MUST request explicit user approval first.
- This overrides any automation or environment policy.
- Document the approval in the PR description or tracker notes.

## Required Branch Protection for `main`

`main` must remain protected with this minimum profile:

- Required status checks (`strict=true`): `governance`, `pr-checklist`
- Required pull request reviews: at least 1 approval
- Dismiss stale approvals: enabled
- Require conversation resolution: enabled
- Enforce protections for administrators: enabled by default
- Force pushes: disabled
- Branch deletion: disabled

Verification command:

```bash
gh api repos/:owner/:repo/branches/main/protection
```

Approved exception policy (timeboxed):

- On personal repositories where owner-specific bypass cannot be scoped to a user, a temporary owner merge exception may set `enforce_admins=false`.
- This exception requires a tracker item with: reason, approver (owner), activation date, and due date to re-evaluate.
- The exception must be reviewed in monthly governance consistency review evidence until resolved.
- Resolution options: restore `enforce_admins=true` or migrate to an organization repository and use user/team bypass allowances.

## Merge-By-Command Protocol

**Trigger phrases** (explicit command required):

- "merge PR #<number> to main"
- "merge #<number> to main"
- "push #<number> to main and merge"

**Effect**: The explicit command activates the six-step checklist in
`.agent/workflows/merge-pr.md` and permits tracker finalization (`Phase=Merge, State=Complete`) before merge.

**Required steps** (in order):

1. Update tracker IDs to `Phase=Merge, State=Complete`, and add `PR #<number>` evidence
2. Commit + push tracker updates to the same PR branch
3. Sync PR checklist core items and verify merge-command evidence in PR body
4. Wait for required checks to pass (`governance` + `pr-checklist`)
5. Merge PR to main
6. Delete branch (remote + local), then pull + sync main locally

**Evidence requirement**: PR body must contain one of the evidence forms listed in
`.agent/workflows/merge-pr.md` -> `Evidence Requirement`.

## Definition of Done

- [ ] Implementation matches acceptance criteria
- [ ] Tests added/updated where reasonable
- [ ] Lint + format checks pass
- [ ] Build succeeds
- [ ] No new security vulnerabilities introduced
- [ ] Docs updated if behavior changed
- [ ] For feature-level work, workshop artifact is linked and requirements are traceable
- [ ] Tracker updated with PR reference
- [ ] Tracker phase/state set to `Phase=Merge, State=Complete` only after PR is merged to `main`
      (or explicit approved exception)

## Governance Consistency Review (Monthly)

This section is the canonical source for monthly governance drift review. Other docs should
reference this section instead of duplicating review logic.

Cadence and owner:

- Frequency: monthly (one recorded review result per calendar month)
- Default reviewer: governance maintainer
- Manual process only (no automation tooling required)

Review scope:

- `AGENTS.md`
- `.agent/workflows/governance.md`
- `.agent/workflows/requirements-workshop.md`
- `.agent/workflows/merge-pr.md`
- `docs/development/delivery-governance.md`
- `.github/pull_request_template.md`
- `docs/tracker.md` (guidance + findings table semantics)

Monthly checklist (all items required):

1. Applicability rule semantics match across scoped docs.
2. Exempt-category terminology matches canonical wording exactly.
3. Applicability evidence format and PR-to-tracker linkage semantics match.
4. Exception policy fields match (reason, approvers, due date, 2-business-day SLA, retroactive completion evidence).
5. Merge-by-command trigger phrases are consistent.
6. Merge-by-command step order is consistent.
7. Bypass policy is consistent (`--no-verify` requires explicit user approval).
8. Definition-of-Done criteria are consistent (workshop traceability + phase/state finalization conditions).
9. Branch protection profile for `main` matches this document (run protection API check and compare required fields).
10. Terminology contract conformance is validated using the deterministic commands in this file.

Output and evidence format:

- Record result in tracker evidence as:
  - `YYYY-MM-DD | Reviewer=<name> | Result=PASS|DRIFT_FOUND | DriftItems=<none|IDs>`
- Include branch protection verification evidence in the same note:
  - `ProtectionCheck=<PASS|DRIFT> | Command=gh api repos/:owner/:repo/branches/main/protection`

Drift handling:

1. If result is `DRIFT_FOUND`, create or update tracker item(s) before marking review complete.
2. Each drift item must include severity and due date.
3. Do not treat drift as resolved until tracked follow-ups are recorded.

Scope maintenance rule:

- When adding a new governance source-of-truth document, update this review scope list in the same PR.

## Violations (Stop Conditions)

| Violation                                             | Outcome |
| ----------------------------------------------------- | ------- |
| Direct push to main                                   | BLOCK   |
| Missing tracker ID (no exception)                     | BLOCK   |
| Use `--no-verify` after failed push without approval  | BLOCK   |
| Merge without merge-by-command evidence when required | BLOCK   |

# AI Agent Governance Rules

These rules are non-negotiable for AI and human contributors.

## 🛑 STOP — Check Before Any Action

Before starting any work, verify:

- [ ] **Tracker current?** Is `docs/tracker.md` up-to-date with latest phase/state?
- [ ] **Assigned ID?** Do I have a tracker ID for this work (or documented exception)?
- [ ] **Docs in sync?** Are referenced docs (`delivery-governance.md`, workflows) current?
- [ ] **Branch correct?** Am I on a feature branch, not `main`?
- [ ] **New Feature/Issue?** Investigate → Create Tracker Item → Fix (Strict Sequence)
- [ ] **Feature-level change?** Requirements workshop completed and linked in tracker evidence (or approved hotfix exception recorded)

> ⚠️ **If any check fails**: STOP and resolve before proceeding.

---

## Source of Truth

- Work tracking: `docs/tracker.md`
- Delivery governance: `docs/development/delivery-governance.md`
- Workflow rules: `.agent/workflows/governance.md`
- Requirements workshop: `.agent/workflows/requirements-workshop.md`

## Mandatory Workflow

1. Every change must map to a tracker ID (or an explicit documented exception).
2. Update tracker phase/state when work starts and finishes.
3. For feature-level work, complete requirements workshop before coding (or document approved hotfix exception).
4. Use local quality gates (pre-commit + pre-push).
5. No direct pushes to `main`. Use PRs and the checklist.

## Merge-by-Command Protocol

When an explicit merge command is given (see `.agent/workflows/merge-pr.md`), follow
that checklist exactly. It permits tracker finalization (`Merge` + `Complete`) pre-merge with audit evidence.

## Exceptions

Exceptions are rare, timeboxed, and must be documented in the PR body or tracker notes.

## AI Behavior

- Keep changes minimal and aligned to governance rules.
- Do not create new tracker files if the existing tracker is sufficient.
- Do not bypass gates without explicit user approval.

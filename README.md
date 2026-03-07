# AI Agent Governance Framework

A standalone, open-source framework for enforcing governance rules on AI coding agents (Cursor, GitHub Copilot, Claude Code, OpenAI Codex, Antigravity, etc.) and human contributors.

## Features

- 📋 Governance policies and workflows (human + AI)
- 🔒 Local enforcement via git hooks
- ⚙️ Config-driven gates and tracker validation
- 🔀 Merge-by-command protocol with auditability
- 🔄 CI parity for local gates

## 5-Minute Quickstart (Package-First)

1. **Install the framework package in your repo:**
   ```bash
   npm install -D @ramuks22/ai-agent-governance
   ```

2. **Initialize governance artifacts:**
   ```bash
   npx @ramuks22/ai-agent-governance init --preset node-npm-cjs --hook-strategy auto
   ```

3. **Verify setup:**
   ```bash
   npx @ramuks22/ai-agent-governance check
   npx @ramuks22/ai-agent-governance doctor
   ```

4. **Start working!** Open `governance.config.json` to customize gates, tracker path, and ID rules.

5. **Upgrade or rollback managed artifacts when needed:**
   ```bash
   npx @ramuks22/ai-agent-governance upgrade --dry-run --patch
   npx @ramuks22/ai-agent-governance rollback --to latest --force
   ```

### Legacy/Manual Mode (Fallback)

If you cannot use package mode yet, you can still use the manual path in this repository:

```bash
npm install
npm run governance:init
node scripts/install-githooks.mjs
npm run governance:check
```

## Source of Truth Map

| Document | Purpose |
|----------|---------|
| `AGENTS.md` | Non-negotiable rules for AI agents |
| `.agent/workflows/governance.md` | Core governance checklist |
| `.agent/workflows/requirements-workshop.md` | Feature requirements workshop workflow |
| `.agent/workflows/merge-pr.md` | Merge-By-Command Protocol |
| `.agent/workflows/governance.md` -> `Terminology Contract (Canonical)` | Canonical governance terminology |
| `docs/development/delivery-governance.md` | Full lifecycle framework |
| `governance.config.json` | Project-specific configuration |

## What's Included

```
├── AGENTS.md                         # Non-negotiable AI rules (tool-agnostic)
├── governance.config.json            # Sample config
├── governance.config.schema.json     # JSON Schema for validation
├── .agent/workflows/
│   ├── governance.md                 # Core governance checklist
│   ├── requirements-workshop.md      # Requirements workshop workflow
│   └── merge-pr.md                   # Merge-By-Command Protocol
├── docs/
│   ├── development/delivery-governance.md
│   ├── templates/
│   │   ├── tracker-template.md       # Blank tracker template
│   │   └── requirements-workshop-template.md
│   ├── examples/
│   │   └── AG-GOV-004-workshop.md    # Example workshop artifact
│   └── tracker.md                    # Active project tracker
├── .githooks/
│   ├── pre-commit                    # Format, lint, secret scan
│   ├── pre-push                      # Tests, build
│   └── commit-msg                    # Tracker ID validation
├── scripts/
│   ├── gates.mjs                     # Pre-push gate logic
│   ├── commit-msg.mjs                # Commit message validator
│   ├── install-githooks.mjs          # Hook installation
│   └── governance-check.mjs          # Self-check script
└── .github/workflows/
    └── governance-ci.yml             # CI parity workflow
```

## Configuration

The framework is driven by `governance.config.json` and validated against `governance.config.schema.json`.

### Key Settings

| Setting | Description |
|---------|-------------|
| `tracker.path` | Path to your tracker file |
| `tracker.idPattern` | Regex pattern for valid tracker IDs |
| `tracker.allowedPrefixes` | Allowed ID prefixes (e.g., `["AG", "SEC"]`) |
| `gates.preCommit` | Commands to run on pre-commit |
| `gates.prePush` | Commands to run on pre-push |
| `branchProtection.blockDirectPush` | Branches that block direct pushes |
| `branchProtection.branchNamePattern` | Regex for allowed branch names |
| `node.minVersion` | Minimum required Node.js version |

### Example Config

```json
{
  "configVersion": "1.0",
  "tracker": {
    "path": "docs/tracker.md",
    "idPattern": "^[A-Z]+-[A-Z]+-\\d{3}$",
    "allowedPrefixes": ["AG", "SEC", "UX", "DOC"]
  },
  "gates": {
    "preCommit": ["npm run -s format:check", "npm run -s lint"],
    "prePush": ["npm run -s test", "npm run -s build"]
  },
  "branchProtection": {
    "blockDirectPush": ["main", "master"],
    "branchNamePattern": "^(feat|fix|hotfix|chore|docs|refactor|test|perf|build|ci|revert|release)\\/[a-z0-9._-]+(?:\\/[a-z0-9._-]+)*$"
  },
  "node": {
    "minVersion": "20.0.0"
  }
}
```

### Branch Naming Enforcement

Pre-push checks enforce branch names against `branchProtection.branchNamePattern`.

Valid examples:

- `feat/add-upgrade-command`
- `fix/branch-protection-regression`
- `hotfix/prod-outage-credentials`
- `docs/update-workshop-guidance`
- `chore/cleanup-config-defaults`
- `refactor/simplify-gate-parser`
- `test/add-rollback-cases`
- `perf/faster-secret-scan`
- `build/update-node-matrix`
- `ci/governance-workflow-tidy`
- `revert/rollback-branch-policy-change`
- `release/v1.2.0`

Invalid examples:

- `codex/ag-gov-017`
- `spike/try-new-hook-runner`

### Tracker ID Presets

Choose an `idPattern` that matches your issue tracker:

| System | Pattern | Example |
|--------|---------|---------|
| **Custom** (default) | `^[A-Z]+-[A-Z]+-\\d{3}$` | `AG-SEC-001` |
| **Jira** | `^[A-Z]+-\\d+$` | `PROJ-1234` |
| **GitHub Issues** | `#\\d+` | `#123` |
| **Linear** | `^[A-Z]+-\\d+$` | `ENG-456` |

Update `tracker.idPattern` and `tracker.allowedPrefixes` accordingly.

## Multi-Tool Compatibility

This framework is tool-agnostic and works with any AI coding assistant that supports custom instructions.

### Cursor

1. Create `.cursorrules` at repo root
2. Reference governance docs:
   ```
   Read and follow AGENTS.md for all contributions.
   Follow .agent/workflows/governance.md for governance rules.
   ```

### GitHub Copilot

1. Create `.github/copilot-instructions.md`
2. Copy rules from `AGENTS.md` or reference it:
   ```markdown
   See AGENTS.md for non-negotiable governance rules.
   Follow .agent/workflows/governance.md for all contributions.
   ```

### Claude Code / Anthropic Tools

1. Include `AGENTS.md` content in your project context
2. Reference `.agent/workflows/*.md` for workflow rules

### Other AI Tools

1. Copy `AGENTS.md` content into the tool's instructions/context
2. Or configure the tool to read from `AGENTS.md` if supported

## Merge-by-Command Protocol

When an explicit merge command is given (e.g., "merge PR #123 to main"), follow the six-step checklist in `.agent/workflows/merge-pr.md`:

1. **Update tracker** – Set IDs to `Phase=Merge, State=Complete`, and add `PR #<number>` evidence
2. **Commit + push** – Push tracker updates to PR branch
3. **Sync checklist + checks** – Ensure checklist/evidence is current and wait for required checks
4. **Merge PR** – Merge to main
5. **Branch cleanup** – Delete remote and local branches
6. **Sync main** – Pull latest changes

This protocol permits tracker finalization (`Phase=Merge, State=Complete`) **before** merge, as a documented exception with audit evidence.

## Requirements Workshop (Feature-Level Work)

Before implementation starts for feature-level work, run the workflow at
`.agent/workflows/requirements-workshop.md` and create:

`docs/requirements/<TRACKER-ID>/workshop.md`

Use `docs/templates/requirements-workshop-template.md` as the canonical structure.

Required for:

- net-new features
- behavior-changing enhancements
- cross-team/API/data model changes
- security/privacy/compliance/legal-impacting work

Hotfix exception:

- document reason and approvals (delivery owner + governance maintainer)
- add retroactive completion due date
- complete workshop artifact within 2 business days

## CI Parity (Required for Adoption)

Local hooks are the first line of defense, but CI is the ultimate gate.

### Setup

1. Copy `.github/workflows/governance-ci.yml` to your repo
2. Ensure your `governance.config.json` gates match CI steps
3. Enable branch protection requiring CI pass

### Why Required?

- Local hooks can be bypassed with `--no-verify`
- CI provides server-side enforcement
- Trust requires both local + CI parity

### CI Workflow Features

The included workflow:
- Uses Node version from `.nvmrc`
- Runs governance self-check
- Executes pre-commit gates (format, lint)
- Executes pre-push gates (test, build)

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run governance:check` | Validate config, hooks, and tracker |
| `npm run governance:doctor` | Detailed diagnostics for config, hooks, tracker, and manifest |
| `npm run governance:init` | Create config and tracker from templates |
| `npm run gate:precommit` | Run pre-commit gates manually |
| `npm run gate:prepush` | Run pre-push gates manually |

CLI equivalent (package mode):

- `npx @ramuks22/ai-agent-governance init`
- `npx @ramuks22/ai-agent-governance check`
- `npx @ramuks22/ai-agent-governance doctor`
- `npx @ramuks22/ai-agent-governance upgrade`
- `npx @ramuks22/ai-agent-governance rollback`

### Stage 3 Upgrade/Rollback Notes

- `upgrade` is conflict-aware by default and writes no files when conflicts are found.
- Use `--force` to overwrite conflicts; a backup snapshot is created before writes.
- Use `--patch` (or `--patch=<path>`) to write deterministic patch output for review.
- `rollback` restores files from `.governance/backups/index.json` (latest by default or `--to <backup-id>`).
- Managed-block strategy applies to `.md/.yml/.yaml/.sh` and hook files; `.json` remains full-file checksum-managed.

Note: The `lint`, `format:check`, and `build` scripts in `package.json` are placeholders. Replace them with your project's real tooling.

## Support and Updates

- See `CHANGELOG.md` for versioned changes
- Use `configVersion` in `governance.config.json` to track upgrades
- Report issues using the governance issue template
- AG-GOV-003 Stage 0-3 is implemented (decision doc + package CLI + installer idempotency + upgrade/rollback/corruption handling). Stage 4+ remains roadmap.

## License

MIT – See [LICENSE](LICENSE) for details.

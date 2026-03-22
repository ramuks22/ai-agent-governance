# Greenfield Governance Template

This template is for net-new repositories.

## Bootstrap

1. Initialize git if this project was scaffolded with `degit`:

```bash
git init
```

2. Install dependencies:

```bash
npm install
```

3. Bootstrap governance artifacts and checks:

```bash
npm run governance:bootstrap
```

This runs:

- `npm run governance:init`
- `npm run governance:check`
- `npm run governance:doctor`

## Next Steps

- Replace placeholder scripts (`format:check`, `lint`, `test`, `build`) with your project commands.
- The template `.gitignore` already ignores governance local artifacts such as backups, release-check reports, and adopt review outputs; force-add them only when you intentionally want to preserve those files in git.
- Start implementation on a compliant feature branch (for example `feat/your-scope`).

## Scope Note

For existing repositories, use the `adopt` migration path instead of this template.

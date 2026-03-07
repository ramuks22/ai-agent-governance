#!/usr/bin/env node
/**
 * Placeholder script for commands not yet configured.
 * This script FAILS by design to force real configuration.
 */
const label = process.argv[2] || 'unknown';

console.error(`
❌ [governance] ${label}: NOT CONFIGURED

This is a placeholder. You must configure real commands.

To fix:
1. Open governance.config.json
2. Replace placeholder commands with your actual tools:
   - format:check → e.g., "npx prettier --check ."
   - lint        → e.g., "npx eslint ."
   - test:unit   → e.g., "npm test"
   - build       → e.g., "npm run build"

Or if you don't need this check, remove it from gates.preCommit/prePush.
`);

process.exit(1);

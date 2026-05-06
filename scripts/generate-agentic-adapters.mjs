#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { validateAgenticArtifacts, writeAgenticAdapters } from './agentic.mjs';

const repoRoot = process.cwd();
const configPath = path.resolve(repoRoot, 'governance.config.json');

function loadConfig() {
  return JSON.parse(readFileSync(configPath, 'utf8'));
}

function printUsage() {
  console.log('Usage: node scripts/generate-agentic-adapters.mjs --write|--check');
}

const args = process.argv.slice(2);
const mode = args[0];

if (!['--write', '--check'].includes(mode)) {
  printUsage();
  process.exit(1);
}

const config = loadConfig();

if (mode === '--check') {
  const result = validateAgenticArtifacts({ repoRoot, config });
  if (result.issues.length > 0) {
    for (const issue of result.issues) {
      console.error(issue);
    }
    process.exit(1);
  }
  console.log(`Agentic adapters verified (${result.expectedAdapters.length} files).`);
  process.exit(0);
}

try {
  const written = writeAgenticAdapters({ repoRoot, config });
  console.log(`Wrote ${written.length} agentic adapters.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

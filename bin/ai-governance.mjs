#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const checkScriptPath = path.resolve(__dirname, '..', 'scripts', 'governance-check.mjs');

function printHelp() {
  console.log(`
ai-governance <command> [options]

Commands:
  init      Initialize governance artifacts and hooks
  check     Validate governance setup
  ci-check  Run configured governance gates for CI parity
  doctor    Print detailed governance diagnostics
  upgrade   Upgrade managed governance artifacts safely
  adopt     Analyze/adopt existing repos into managed governance artifacts
  rollback  Restore governance artifacts from backup
  help      Show this help message

Examples:
  npx @ramuks22/ai-agent-governance init --preset node-npm-cjs --hook-strategy auto
  npx @ramuks22/ai-agent-governance init --wizard --hook-strategy auto
  npx @ramuks22/ai-agent-governance check
  npx @ramuks22/ai-agent-governance ci-check --gate all
  npx @ramuks22/ai-agent-governance doctor
  npx @ramuks22/ai-agent-governance upgrade --dry-run
  npx @ramuks22/ai-agent-governance adopt --report .governance/adopt-report.md
  npx @ramuks22/ai-agent-governance rollback --to latest --force
`);
}

function runCheckScript(args) {
  const result = spawnSync(process.execPath, [checkScriptPath, ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

const [command, ...rest] = process.argv.slice(2);

if (!command || command === 'help' || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

if (command === 'init') runCheckScript(['--init', ...rest]);
if (command === 'check') runCheckScript(rest);
if (command === 'ci-check') runCheckScript(['--ci-check', ...rest]);
if (command === 'doctor') runCheckScript(['--doctor', ...rest]);
if (command === 'upgrade') runCheckScript(['--upgrade', ...rest]);
if (command === 'adopt') runCheckScript(['--adopt', ...rest]);
if (command === 'rollback') runCheckScript(['--rollback', ...rest]);

console.error(`Unknown command: ${command}`);
printHelp();
process.exit(1);

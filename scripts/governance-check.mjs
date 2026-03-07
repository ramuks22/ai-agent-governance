#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import Ajv from 'ajv';
import semver from 'semver';

const args = process.argv.slice(2);
const isCI = process.env.CI === 'true';
const skipHooks = args.includes('--skip-hooks') || isCI;

const configPath = process.env.GOVERNANCE_CONFIG || 'governance.config.json';
const schemaPath = 'governance.config.schema.json';
const exampleConfigPath = 'governance.config.example.json';
const trackerTemplatePath = 'docs/templates/tracker-template.md';
const trackerPath = 'docs/tracker.md';

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function warn(message) {
  process.stderr.write(`⚠ ${message}\n`);
}

function execText(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) return '';
  return (result.stdout || '').trim();
}

function ensureGitRepo() {
  const out = execText('git', ['rev-parse', '--is-inside-work-tree']);
  if (out !== 'true') {
    if (isCI) {
      warn('Not a git repository (may be normal in some CI setups).');
      return false;
    }
    fail('✖ Governance check requires a git repository.');
  }
  return true;
}

function loadJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (err) {
    fail(`✖ Failed to read ${label}: ${filePath}`);
  }
}

function initConfig() {
  if (existsSync(configPath)) {
    fail(`✖ ${configPath} already exists. Remove it if you want to re-init.`);
  }
  if (!existsSync(exampleConfigPath)) {
    fail(`✖ Missing example config: ${exampleConfigPath}`);
  }
  copyFileSync(exampleConfigPath, configPath);

  if (!existsSync(trackerPath)) {
    mkdirSync(path.dirname(trackerPath), { recursive: true });
    if (!existsSync(trackerTemplatePath)) {
      fail(`✖ Missing tracker template: ${trackerTemplatePath}`);
    }
    copyFileSync(trackerTemplatePath, trackerPath);
  }

  console.log('[governance] Created governance.config.json and tracker template.');
  console.log('[governance] Next: node scripts/install-githooks.mjs');
}

function validateConfig() {
  if (!existsSync(configPath)) {
    fail(`✖ Missing ${configPath}. Run: node scripts/governance-check.mjs --init`);
  }
  if (!existsSync(schemaPath)) {
    fail(`✖ Missing schema: ${schemaPath}`);
  }

  const config = loadJson(configPath, 'config');
  const schema = loadJson(schemaPath, 'schema');

  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  const valid = validate(config);
  if (!valid) {
    fail(`✖ Invalid config:\n${ajv.errorsText(validate.errors)}`);
  }

  return config;
}

function checkNodeVersion(minVersion) {
  const current = process.version.replace('v', '');
  if (!semver.gte(current, minVersion)) {
    fail(`✖ Node ${minVersion}+ required. Current: ${current}`);
  }
}

function checkHooksInstalled() {
  if (skipHooks) {
    console.log('[governance] Skipping hook validation (CI mode or --skip-hooks).');
    return;
  }

  const hooksPath = execText('git', ['config', '--get', 'core.hooksPath']);
  if (hooksPath !== '.githooks') {
    fail('✖ core.hooksPath is not set to .githooks. Run: node scripts/install-githooks.mjs');
  }

  const required = ['pre-commit', 'pre-push', 'commit-msg'];
  for (const hook of required) {
    const hookPath = path.join('.githooks', hook);
    if (!existsSync(hookPath)) {
      fail(`✖ Missing hook: ${hookPath}`);
    }
    if (process.platform !== 'win32') {
      try {
        chmodSync(hookPath, 0o755);
      } catch {
        fail(`✖ Hook not executable: ${hookPath}`);
      }
    }
  }
}

function checkTrackerExists(trackerFile) {
  if (!existsSync(trackerFile)) {
    fail(`✖ Missing tracker file: ${trackerFile}`);
  }
}

// Main execution
if (args.includes('--init')) {
  initConfig();
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node scripts/governance-check.mjs [options]

Options:
  --init        Create governance.config.json and tracker from templates
  --skip-hooks  Skip git hook validation (also auto-skipped when CI=true)
  --help, -h    Show this help message

Environment:
  CI=true       Enables CI mode (skips hook validation)
  GOVERNANCE_CONFIG=<path>  Custom config file path
`);
  process.exit(0);
}

const isGitRepo = ensureGitRepo();
const config = validateConfig();
checkNodeVersion(config.node.minVersion);

if (isGitRepo) {
  checkHooksInstalled();
}

checkTrackerExists(config.tracker.path);

console.log('[governance] Configuration valid' + (skipHooks ? '.' : ' and hooks installed.'));

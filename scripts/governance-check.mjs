#!/usr/bin/env node
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import semver from 'semver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '..');
const TARGET_ROOT = process.cwd();
const PACKAGE_NAME = '@ramuks22/ai-agent-governance';

const CONFIG_PATH = 'governance.config.json';
const SCHEMA_PATH = 'governance.config.schema.json';
const EXAMPLE_CONFIG_PATH = 'governance.config.example.json';
const TRACKER_TEMPLATE_PATH = 'docs/templates/tracker-template.md';
const TRACKER_PATH = 'docs/tracker.md';
const MANIFEST_PATH = '.governance/manifest.json';

const PRESETS = {
  'node-npm-cjs': {
    configVersion: '1.0',
    tracker: {
      path: TRACKER_PATH,
      idPattern: '^[A-Z]+-[A-Z]+-\\d{3}$',
      allowedPrefixes: ['AG'],
    },
    gates: {
      preCommit: ['npm run -s governance:check', 'npm run -s format:check', 'npm run -s lint'],
      prePush: ['npm run -s governance:check', 'npm run -s test', 'npm run -s build'],
    },
    branchProtection: {
      blockDirectPush: ['main', 'master'],
    },
    node: {
      minVersion: '20.0.0',
    },
  },
  'node-npm-esm': {
    configVersion: '1.0',
    tracker: {
      path: TRACKER_PATH,
      idPattern: '^[A-Z]+-[A-Z]+-\\d{3}$',
      allowedPrefixes: ['AG'],
    },
    gates: {
      preCommit: ['npm run -s governance:check', 'npm run -s format:check', 'npm run -s lint'],
      prePush: ['npm run -s governance:check', 'npm run -s test', 'npm run -s build'],
    },
    branchProtection: {
      blockDirectPush: ['main', 'master'],
    },
    node: {
      minVersion: '20.0.0',
    },
  },
  generic: {
    configVersion: '1.0',
    tracker: {
      path: TRACKER_PATH,
      idPattern: '^[A-Z]+-[A-Z]+-\\d{3}$',
      allowedPrefixes: ['AG'],
    },
    gates: {
      preCommit: ['npm run -s governance:check', 'npm run -s format:check', 'npm run -s lint'],
      prePush: ['npm run -s governance:check', 'npm run -s test', 'npm run -s build'],
    },
    branchProtection: {
      blockDirectPush: ['main', 'master'],
    },
    node: {
      minVersion: '20.0.0',
    },
  },
};

const ARTIFACT_FILES = [
  'AGENTS.md',
  '.agent/workflows/governance.md',
  '.agent/workflows/requirements-workshop.md',
  '.agent/workflows/merge-pr.md',
  'docs/development/delivery-governance.md',
  'docs/templates/tracker-template.md',
  'docs/templates/requirements-workshop-template.md',
  '.github/pull_request_template.md',
  '.github/workflows/governance-ci.yml',
  EXAMPLE_CONFIG_PATH,
  SCHEMA_PATH,
];

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function warn(message) {
  process.stderr.write(`⚠ ${message}\n`);
}

function info(message) {
  process.stdout.write(`${message}\n`);
}

function loadJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    fail(`✖ Failed to read ${label}: ${filePath}`);
  }
}

function tryLoadJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function execText(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: TARGET_ROOT,
  });
  if (result.status !== 0) return '';
  return (result.stdout || '').trim();
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: TARGET_ROOT,
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
}

function ensureDir(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function normalizeForChecksum(content) {
  return content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n');
}

function checksumText(content) {
  return createHash('sha256').update(normalizeForChecksum(content), 'utf8').digest('hex');
}

function checksumFile(filePath) {
  return checksumText(readFileSync(filePath, 'utf8'));
}

function packageVersion() {
  const pkg = loadJson(path.join(PACKAGE_ROOT, 'package.json'), 'package metadata');
  return pkg.version;
}

function sourcePath(relPath) {
  return path.join(PACKAGE_ROOT, relPath);
}

function targetPath(relPath) {
  return path.join(TARGET_ROOT, relPath);
}

function isGitRepo() {
  return execText('git', ['rev-parse', '--is-inside-work-tree']) === 'true';
}

function parseArgs(argv) {
  const isCI = process.env.CI === 'true';
  const options = {
    mode: 'check',
    skipHooks: isCI,
    dryRun: false,
    force: false,
    preset: 'node-npm-cjs',
    hookStrategy: 'auto',
    configPath: process.env.GOVERNANCE_CONFIG || CONFIG_PATH,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--init') options.mode = 'init';
    else if (arg === '--doctor') options.mode = 'doctor';
    else if (arg === '--skip-hooks') options.skipHooks = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--help' || arg === '-h') options.mode = 'help';
    else if (arg === '--preset' && argv[i + 1]) {
      options.preset = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--preset=')) {
      options.preset = arg.split('=')[1];
    } else if (arg === '--hook-strategy' && argv[i + 1]) {
      options.hookStrategy = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--hook-strategy=')) {
      options.hookStrategy = arg.split('=')[1];
    } else {
      fail(`✖ Unknown option: ${arg}`);
    }
  }

  if (!PRESETS[options.preset]) {
    fail(`✖ Invalid preset '${options.preset}'. Allowed: ${Object.keys(PRESETS).join(', ')}`);
  }

  if (!['auto', 'core-hooks', 'git-hooks'].includes(options.hookStrategy)) {
    fail("✖ Invalid hook strategy. Allowed: auto, core-hooks, git-hooks");
  }

  return options;
}

function printHelp() {
  info(`
+Usage: node scripts/governance-check.mjs [options]
+
+Modes:
+  --init                Initialize governance artifacts
+  --doctor              Show detailed diagnostics
+
+Options:
+  --preset <name>       Preset config: node-npm-cjs|node-npm-esm|generic
+  --hook-strategy <s>   Hook install strategy: auto|core-hooks|git-hooks
+  --dry-run             Print planned actions without writing files
+  --force               Overwrite conflicting managed files
+  --skip-hooks          Skip hook validation (also auto-skipped when CI=true)
+  --help, -h            Show this help message
+
+Examples:
+  node scripts/governance-check.mjs --init --preset node-npm-cjs --hook-strategy auto
+  node scripts/governance-check.mjs --doctor
+`);
}

function detectHookManagers() {
  const packageJson = tryLoadJson(targetPath('package.json'));
  const scripts = packageJson?.scripts || {};
  const hasHusky =
    existsSync(targetPath('.husky')) ||
    Boolean(packageJson?.husky) ||
    typeof scripts.prepare === 'string' && scripts.prepare.includes('husky');
  const hasLefthook =
    existsSync(targetPath('lefthook.yml')) ||
    existsSync(targetPath('lefthook.yaml')) ||
    existsSync(targetPath('.lefthook')) ||
    Boolean(packageJson?.lefthook);

  return {
    hasHusky,
    hasLefthook,
    hasConflict: hasHusky || hasLefthook,
  };
}

function hookScriptContent(type) {
  if (type === 'pre-commit') {
    return `#!/bin/sh\nset -eu\n\nnode ./node_modules/${PACKAGE_NAME}/scripts/gates.mjs pre-commit\n`;
  }
  if (type === 'pre-push') {
    return `#!/bin/sh\nset -eu\n\nnode ./node_modules/${PACKAGE_NAME}/scripts/gates.mjs pre-push\n`;
  }
  return `#!/bin/sh\nset -eu\n\nnode ./node_modules/${PACKAGE_NAME}/scripts/commit-msg.mjs "$1"\n`;
}

function collectManagedItems(options) {
  const files = [];

  for (const relPath of ARTIFACT_FILES) {
    const src = sourcePath(relPath);
    files.push({
      relPath,
      source: 'package',
      content: readFileSync(src, 'utf8'),
      stage: 'copy-artifact',
    });
  }

  files.push({
    relPath: CONFIG_PATH,
    source: 'generated',
    content: `${JSON.stringify(PRESETS[options.preset], null, 2)}\n`,
    stage: 'generate-config',
  });

  const trackerTemplate = readFileSync(sourcePath(TRACKER_TEMPLATE_PATH), 'utf8');
  files.push({
    relPath: TRACKER_PATH,
    source: 'generated',
    content: trackerTemplate,
    stage: 'generate-tracker',
    createOnly: true,
  });

  if (options.hookStrategy !== 'git-hooks') {
    for (const name of ['pre-commit', 'pre-push', 'commit-msg']) {
      files.push({
        relPath: path.posix.join('.githooks', name),
        source: 'generated',
        content: hookScriptContent(name),
        stage: 'generate-hooks',
      });
    }
  }

  return files;
}

function readManifest() {
  const manifestFile = targetPath(MANIFEST_PATH);
  if (!existsSync(manifestFile)) return null;
  return tryLoadJson(manifestFile);
}

function buildManifest(options, managedFiles, hookMetadata = {}) {
  const fileEntries = managedFiles
    .filter((entry) => existsSync(targetPath(entry.relPath)))
    .map((entry) => ({
      path: entry.relPath,
      source: entry.source,
      checksum: checksumFile(targetPath(entry.relPath)),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return {
    manifestVersion: '1.0',
    package: PACKAGE_NAME,
    packageVersion: packageVersion(),
    preset: options.preset,
    hookStrategy: options.hookStrategy,
    hookConflictDetected: Boolean(hookMetadata.hookConflictDetected),
    coreHooksConfigured: Boolean(hookMetadata.coreHooksConfigured),
    generatedAt: new Date().toISOString(),
    files: fileEntries,
  };
}

function manifestComparable(manifest) {
  if (!manifest) return null;
  return JSON.stringify({
    manifestVersion: manifest.manifestVersion,
    package: manifest.package,
    packageVersion: manifest.packageVersion,
    preset: manifest.preset,
    hookStrategy: manifest.hookStrategy,
    hookConflictDetected: Boolean(manifest.hookConflictDetected),
    coreHooksConfigured: Boolean(manifest.coreHooksConfigured),
    files: manifest.files || [],
  });
}

function fileStatusForInit(entry, manifest) {
  const abs = targetPath(entry.relPath);
  const expectedChecksum = checksumText(entry.content);

  if (!existsSync(abs)) {
    return {
      action: 'create',
      expectedChecksum,
    };
  }

  const currentChecksum = checksumFile(abs);
  if (currentChecksum === expectedChecksum) {
    return { action: 'noop', expectedChecksum, currentChecksum };
  }

  if (entry.createOnly) {
    return {
      action: 'keep-existing',
      expectedChecksum,
      currentChecksum,
      reason: 'create-only file already exists',
    };
  }

  const manifestEntry = manifest?.files?.find((f) => f.path === entry.relPath);
  if (!manifestEntry) {
    return {
      action: 'conflict',
      expectedChecksum,
      currentChecksum,
      reason: 'file exists but is not managed in manifest',
    };
  }

  if (manifestEntry.checksum !== currentChecksum) {
    return {
      action: 'conflict',
      expectedChecksum,
      currentChecksum,
      reason: 'managed file changed since last init',
    };
  }

  return {
    action: 'outdated',
    expectedChecksum,
    currentChecksum,
    reason: 'managed file differs from current package content',
  };
}

function writeManagedFile(relPath, content) {
  const abs = targetPath(relPath);
  ensureDir(abs);
  writeFileSync(abs, content, 'utf8');

  if (process.platform !== 'win32' && relPath.startsWith('.githooks/')) {
    try {
      chmodSync(abs, 0o755);
    } catch {
      warn(`Could not mark hook executable: ${relPath}`);
    }
  }
}

function writeGitHooks(options) {
  if (options.hookStrategy !== 'git-hooks') return [];

  if (!isGitRepo()) {
    warn('Not a git repository; skipping .git/hooks installation for hook-strategy=git-hooks.');
    return [];
  }

  const written = [];
  for (const name of ['pre-commit', 'pre-push', 'commit-msg']) {
    const abs = targetPath(path.join('.git', 'hooks', name));
    ensureDir(abs);
    writeFileSync(abs, hookScriptContent(name), 'utf8');
    if (process.platform !== 'win32') {
      try {
        chmodSync(abs, 0o755);
      } catch {
        warn(`Could not mark git hook executable: .git/hooks/${name}`);
      }
    }
    written.push(path.join('.git', 'hooks', name));
  }

  return written;
}

function configureHooksPath(options, conflictState) {
  if (options.hookStrategy === 'git-hooks') return false;
  if (!isGitRepo()) {
    warn('Not a git repository; skipping core.hooksPath configuration.');
    return false;
  }

  if (options.hookStrategy === 'auto' && conflictState.hasConflict) {
    warn('Detected existing hook manager (husky/lefthook). Skipping core.hooksPath update in auto mode.');
    return false;
  }

  if (options.hookStrategy === 'core-hooks' && conflictState.hasConflict) {
    warn('Existing hook manager detected; proceeding because hook-strategy=core-hooks was explicitly selected.');
  }

  const configured = runCommand('git', ['config', 'core.hooksPath', '.githooks']);
  if (!configured.ok) {
    warn('Could not set core.hooksPath=.githooks; configure it manually if needed.');
    return false;
  }
  return true;
}

function runInit(options) {
  const manifest = readManifest();
  const conflictState = detectHookManagers();
  const managedEntries = collectManagedItems(options);
  const actions = [];
  const conflicts = [];

  for (const entry of managedEntries) {
    const status = fileStatusForInit(entry, manifest);
    actions.push({ relPath: entry.relPath, stage: entry.stage, ...status });

    if (status.action === 'conflict') {
      conflicts.push({ relPath: entry.relPath, reason: status.reason, status });
    }
  }

  if (options.force) {
    for (const action of actions) {
      if (action.action === 'conflict' || action.action === 'outdated') {
        action.action = 'update';
      }
    }
  }

  info('[governance:init] Planned actions:');
  for (const action of actions) {
    info(`- ${action.action.padEnd(12)} ${action.relPath}`);
  }

  if (conflicts.length && !options.force) {
    info('[governance:init] Conflicts detected (use --force to overwrite managed files):');
    for (const conflict of conflicts) {
      const expected = conflict.status.expectedChecksum?.slice(0, 8) || 'n/a';
      const current = conflict.status.currentChecksum?.slice(0, 8) || 'n/a';
      info(`  - ${conflict.relPath}: ${conflict.reason} (current=${current}, expected=${expected})`);
    }
  }

  if (options.dryRun) {
    info('[governance:init] Dry run complete. No files were written.');
    if (conflicts.length && !options.force) process.exit(1);
    process.exit(0);
  }

  let wroteManagedFiles = false;
  for (const entry of managedEntries) {
    const action = actions.find((a) => a.relPath === entry.relPath);
    if (!action) continue;
    if (!['create', 'update'].includes(action.action)) continue;
    writeManagedFile(entry.relPath, entry.content);
    wroteManagedFiles = true;
  }

  const gitHookWrites = writeGitHooks(options);
  const coreHooksConfigured = configureHooksPath(options, conflictState);

  const manifestObject = buildManifest(options, managedEntries, {
    hookConflictDetected: conflictState.hasConflict && options.hookStrategy === 'auto' && !coreHooksConfigured,
    coreHooksConfigured,
  });
  const shouldWriteManifest = manifestComparable(manifest) !== manifestComparable(manifestObject);
  if (shouldWriteManifest) {
    ensureDir(targetPath(MANIFEST_PATH));
    writeFileSync(targetPath(MANIFEST_PATH), `${JSON.stringify(manifestObject, null, 2)}\n`, 'utf8');
    info(`[governance:init] Wrote manifest: ${MANIFEST_PATH}`);
  } else {
    info('[governance:init] Manifest unchanged.');
  }
  if (gitHookWrites.length) {
    info('[governance:init] Installed git hooks:');
    for (const file of gitHookWrites) info(`  - ${file}`);
  }

  if (conflicts.length && !options.force) {
    fail('✖ Initialization completed with conflicts. Review output and rerun with --force if appropriate.');
  }

  if (!wroteManagedFiles && !gitHookWrites.length && !shouldWriteManifest) {
    info('[governance:init] No changes required.');
  }

  info('[governance:init] Initialization complete.');
  info('[governance:init] Next: npx @ramuks22/ai-agent-governance check');
}

function validateConfig(configPath) {
  if (!existsSync(targetPath(configPath))) {
    fail(`✖ Missing ${configPath}. Run: node scripts/governance-check.mjs --init`);
  }
  if (!existsSync(targetPath(SCHEMA_PATH))) {
    fail(`✖ Missing schema: ${SCHEMA_PATH}`);
  }

  const config = loadJson(targetPath(configPath), 'config');
  const schema = loadJson(targetPath(SCHEMA_PATH), 'schema');

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

function checkHooksInstalled(skipHooks) {
  if (skipHooks) {
    info('[governance] Skipping hook validation (CI mode or --skip-hooks).');
    return;
  }

  const manifest = readManifest();
  if (manifest?.hookStrategy === 'auto' && manifest.hookConflictDetected && !manifest.coreHooksConfigured) {
    warn('Auto hook strategy preserved existing hook manager; skipping core.hooksPath validation.');
    return;
  }

  if (manifest?.hookStrategy === 'git-hooks') {
    const required = ['pre-commit', 'pre-push', 'commit-msg'];
    for (const hook of required) {
      const hookPath = targetPath(path.join('.git', 'hooks', hook));
      if (!existsSync(hookPath)) {
        fail(`✖ Missing git hook: .git/hooks/${hook}`);
      }
    }
    return;
  }

  const hooksPath = execText('git', ['config', '--get', 'core.hooksPath']);
  if (hooksPath !== '.githooks') {
    fail('✖ core.hooksPath is not set to .githooks. Run: node scripts/install-githooks.mjs');
  }

  const required = ['pre-commit', 'pre-push', 'commit-msg'];
  for (const hook of required) {
    const hookPath = targetPath(path.posix.join('.githooks', hook));
    if (!existsSync(hookPath)) {
      fail(`✖ Missing hook: .githooks/${hook}`);
    }
    if (process.platform !== 'win32') {
      try {
        chmodSync(hookPath, 0o755);
      } catch {
        fail(`✖ Hook not executable: .githooks/${hook}`);
      }
    }
  }
}

function checkTrackerExists(trackerFile) {
  if (!existsSync(targetPath(trackerFile))) {
    fail(`✖ Missing tracker file: ${trackerFile}`);
  }
}

function runCheck(options) {
  if (!isGitRepo() && !options.skipHooks) {
    fail('✖ Governance check requires a git repository. Use --skip-hooks if running outside git.');
  }

  const config = validateConfig(options.configPath);
  checkNodeVersion(config.node.minVersion);

  if (isGitRepo()) {
    checkHooksInstalled(options.skipHooks);
  }

  checkTrackerExists(config.tracker.path);
  info(`[governance] Configuration valid${options.skipHooks ? '.' : ' and hooks installed.'}`);
}

function runDoctor(options) {
  const checks = [];

  const add = (name, ok, detail) => checks.push({ name, ok, detail });

  const gitRepo = isGitRepo();
  add('git-repo', gitRepo, gitRepo ? 'inside git work tree' : 'not a git repository');

  const configExists = existsSync(targetPath(options.configPath));
  add('config-file', configExists, options.configPath);

  const schemaExists = existsSync(targetPath(SCHEMA_PATH));
  add('schema-file', schemaExists, SCHEMA_PATH);

  let config = null;
  if (configExists && schemaExists) {
    try {
      config = validateConfig(options.configPath);
      add('config-valid', true, 'schema validation passed');
    } catch {
      add('config-valid', false, 'schema validation failed');
    }
  } else {
    add('config-valid', false, 'skipped because config/schema missing');
  }

  if (config?.node?.minVersion) {
    const current = process.version.replace('v', '');
    add(
      'node-version',
      semver.gte(current, config.node.minVersion),
      `current=${current}, required>=${config.node.minVersion}`
    );
  } else {
    add('node-version', false, 'missing node.minVersion in config');
  }

  if (config?.tracker?.path) {
    add('tracker-file', existsSync(targetPath(config.tracker.path)), config.tracker.path);
  } else {
    add('tracker-file', false, 'tracker.path missing in config');
  }

  const manifest = readManifest();
  add('manifest-file', Boolean(manifest), MANIFEST_PATH);

  if (manifest?.files?.length) {
    let allMatch = true;
    const mismatches = [];
    for (const entry of manifest.files) {
      const abs = targetPath(entry.path);
      if (!existsSync(abs)) {
        allMatch = false;
        mismatches.push(`${entry.path} (missing)`);
        continue;
      }
      const current = checksumFile(abs);
      if (current !== entry.checksum) {
        allMatch = false;
        mismatches.push(`${entry.path} (checksum mismatch)`);
      }
    }
    add('manifest-integrity', allMatch, allMatch ? 'all managed files match checksums' : mismatches.join(', '));
  } else {
    add('manifest-integrity', false, 'manifest missing or empty');
  }

  if (gitRepo) {
    const hooksPath = execText('git', ['config', '--get', 'core.hooksPath']);
    const strategy = manifest?.hookStrategy || (hooksPath === '.githooks' ? 'core-hooks' : 'unknown');

    if (strategy === 'auto' && manifest?.hookConflictDetected && !manifest?.coreHooksConfigured) {
      add('hooks', true, 'auto mode preserved existing hook manager configuration');
    } else if (strategy === 'git-hooks') {
      const required = ['pre-commit', 'pre-push', 'commit-msg'];
      const missing = required.filter((hook) => !existsSync(targetPath(path.join('.git', 'hooks', hook))));
      add('hooks', missing.length === 0, missing.length ? `missing .git/hooks/${missing.join(', ')}` : 'git-hooks strategy configured');
    } else {
      const required = ['pre-commit', 'pre-push', 'commit-msg'];
      const missing = required.filter((hook) => !existsSync(targetPath(path.posix.join('.githooks', hook))));
      const pathOk = hooksPath === '.githooks';
      add(
        'hooks',
        pathOk && missing.length === 0,
        pathOk
          ? (missing.length ? `missing .githooks/${missing.join(', ')}` : '.githooks configured')
          : `core.hooksPath=${hooksPath || '(unset)'}`
      );
    }
  } else {
    add('hooks', false, 'not in git repo');
  }

  let hasFailure = false;
  for (const check of checks) {
    const status = check.ok ? 'PASS' : 'FAIL';
    info(`[doctor] ${status} ${check.name}: ${check.detail}`);
    if (!check.ok) hasFailure = true;
  }

  if (hasFailure) {
    process.exit(1);
  }

  info('[doctor] All checks passed.');
}

const options = parseArgs(process.argv.slice(2));

if (options.mode === 'help') {
  printHelp();
  process.exit(0);
}

if (options.mode === 'init') {
  runInit(options);
  process.exit(0);
}

if (options.mode === 'doctor') {
  runDoctor(options);
  process.exit(0);
}

runCheck(options);

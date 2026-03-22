import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  RELEASE_CHECK_REPORT_SCHEMA_VERSION,
  buildReleaseCheckReport,
  redactSensitiveText,
} from '../governance-check.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const binPath = path.resolve(__dirname, '..', '..', 'bin', 'ai-governance.mjs');

function run(args, cwd) {
  return spawnSync(process.execPath, [binPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: 'false' },
  });
}

function runText(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
}

function setupRepo(name) {
  const dir = mkdtempSync(path.join(tmpdir(), `${name}-`));
  const init = runText('git', ['init', '-q'], dir);
  assert.equal(init.status, 0, init.stderr);
  return dir;
}

function commitAll(cwd, message = 'chore: commit') {
  const email = runText('git', ['config', 'user.email', 'ci@example.com'], cwd);
  assert.equal(email.status, 0, email.stderr);
  const name = runText('git', ['config', 'user.name', 'CI'], cwd);
  assert.equal(name.status, 0, name.stderr);
  const add = runText('git', ['add', '-A'], cwd);
  assert.equal(add.status, 0, add.stderr);
  const commit = runText('git', ['commit', '-m', message], cwd);
  assert.equal(commit.status, 0, commit.stderr);
}

function writeSampleGovernanceConfig(cwd, trackerPath) {
  writeFileSync(
    path.join(cwd, 'governance.config.json'),
    `${JSON.stringify({
      configVersion: '1.0',
      tracker: {
        path: trackerPath,
        idPattern: '^[A-Z]+-[A-Z]+-\\d{3}$',
        allowedPrefixes: ['AG'],
      },
      gates: {
        preCommit: ['npm run -s governance:check', 'npm run -s format:check', 'npm run -s lint'],
        prePush: ['npm run -s governance:check', 'npm run -s test', 'npm run -s build'],
      },
      branchProtection: {
        blockDirectPush: ['main', 'master'],
        branchNamePattern: '^(feat|fix|hotfix|chore|docs|refactor|test|perf|build|ci|revert|release)\\/[a-z0-9._-]+(?:\\/[a-z0-9._-]+)*$',
      },
      node: {
        minVersion: '20.0.0',
      },
    }, null, 2)}\n`,
    'utf8'
  );
}

function writeJsonFile(cwd, relPath, value) {
  const filePath = path.join(cwd, relPath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function setupHybridNpmRepo(name, scripts, nestedPackageRoots = ['backend/package.json']) {
  const repo = setupRepo(name);
  writeJsonFile(repo, 'package.json', {
    name: 'sample',
    version: '1.0.0',
    type: 'module',
    scripts,
  });
  for (const nestedPath of nestedPackageRoots) {
    writeJsonFile(repo, nestedPath, {
      name: path.posix.basename(path.posix.dirname(nestedPath)),
      version: '1.0.0',
    });
  }
  return repo;
}

test('CLI help displays commands', () => {
  const result = run(['--help'], process.cwd());
  assert.equal(result.status, 0);
  assert.match(result.stdout, /ai-governance <command>/);
  assert.match(result.stdout, /init/);
  assert.match(result.stdout, /ci-check/);
  assert.match(result.stdout, /release-check/);
  assert.match(result.stdout, /release-publish/);
  assert.match(result.stdout, /doctor/);
  assert.match(result.stdout, /upgrade/);
  assert.match(result.stdout, /adopt/);
  assert.match(result.stdout, /rollback/);
  assert.match(result.stdout, /--wizard/);
});

test('check fails when governance config is missing', () => {
  const repo = setupRepo('gov-cli-check-missing');
  const result = run(['check'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing governance\.config\.json/);
});

test('ci-check fails when governance config is missing', () => {
  const repo = setupRepo('gov-cli-ci-check-missing');
  const result = run(['ci-check'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing governance\.config\.json/);
});

test('init + check + doctor succeeds in fresh repo', () => {
  const repo = setupRepo('gov-cli-happy');

  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);
  assert.equal(existsSync(path.join(repo, 'governance.config.json')), true);
  assert.equal(existsSync(path.join(repo, '.governance', 'manifest.json')), true);

  const check = run(['check'], repo);
  assert.equal(check.status, 0, `${check.stdout}\n${check.stderr}`);

  const doctor = run(['doctor'], repo);
  assert.equal(doctor.status, 0, `${doctor.stdout}\n${doctor.stderr}`);
  assert.match(doctor.stdout, /\[doctor\] PASS config-file/);
  assert.match(doctor.stdout, /\[doctor\] PASS hooks/);
});

test('init accepts pnpm and yarn workspace presets', () => {
  const pnpmRepo = setupRepo('gov-cli-pnpm-preset');
  const pnpmInit = run(['init', '--preset', 'node-pnpm-monorepo', '--hook-strategy', 'auto'], pnpmRepo);
  assert.equal(pnpmInit.status, 0, `${pnpmInit.stdout}\n${pnpmInit.stderr}`);
  const pnpmConfig = JSON.parse(readFileSync(path.join(pnpmRepo, 'governance.config.json'), 'utf8'));
  assert.equal(pnpmConfig.gates.preCommit[0], 'pnpm run governance:check');
  assert.equal(pnpmConfig.gates.prePush[0], 'pnpm run governance:check');

  const yarnRepo = setupRepo('gov-cli-yarn-preset');
  const yarnInit = run(['init', '--preset', 'node-yarn-workspaces', '--hook-strategy', 'auto'], yarnRepo);
  assert.equal(yarnInit.status, 0, `${yarnInit.stdout}\n${yarnInit.stderr}`);
  const yarnConfig = JSON.parse(readFileSync(path.join(yarnRepo, 'governance.config.json'), 'utf8'));
  assert.equal(yarnConfig.gates.preCommit[0], 'yarn run governance:check');
  assert.equal(yarnConfig.gates.prePush[0], 'yarn run governance:check');
});

test('generic preset is fail-closed with placeholder commands', () => {
  const repo = setupRepo('gov-cli-generic-preset');
  const init = run(['init', '--preset', 'generic', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const config = JSON.parse(readFileSync(path.join(repo, 'governance.config.json'), 'utf8'));
  assert.match(config.gates.preCommit[1], /scripts\/noop\.mjs format:check/);
  assert.match(config.gates.preCommit[2], /scripts\/noop\.mjs lint/);
  assert.match(config.gates.prePush[1], /scripts\/noop\.mjs test/);
  assert.match(config.gates.prePush[2], /scripts\/noop\.mjs build/);
});

test('wizard and preset cannot be used together', () => {
  const repo = setupRepo('gov-cli-wizard-and-preset');
  const result = run(['init', '--wizard', '--preset', 'node-npm-cjs'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /mutually exclusive/);
});

test('wizard fails fast in non-interactive mode with fallback guidance', () => {
  const repo = setupRepo('gov-cli-wizard-notty');
  const result = run(['init', '--wizard'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires an interactive TTY/);
  assert.match(result.stderr, /--preset node-npm-cjs/);
  assert.match(result.stderr, /--preset node-pnpm-monorepo/);
});

test('ci-check rejects invalid --gate values', () => {
  const repo = setupRepo('gov-cli-ci-check-gate-invalid');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const result = run(['ci-check', '--gate', 'unknown'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid --gate value/);
});

test('--gate is rejected when command is not ci-check', () => {
  const repo = setupRepo('gov-cli-gate-non-ci-check');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const result = run(['check', '--gate', 'all'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--gate is only supported with --ci-check/);
});

test('release-check rejects invalid --scope values', () => {
  const repo = setupRepo('gov-cli-release-check-invalid-scope');
  const result = run(['release-check', '--scope', 'unknown'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid --scope value/);
});

test('release-check rejects invalid --report values', () => {
  const repo = setupRepo('gov-cli-release-check-invalid-report');
  const result = run(['release-check', '--scope', 'maintenance', '--report', 'text'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid --report value/);
});

test('--scope is rejected when command is not release-check', () => {
  const repo = setupRepo('gov-cli-release-scope-non-release-check');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const result = run(['check', '--scope', 'all'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--scope is only supported with --release-check/);
});

test('--out-dir is rejected when command is not release-check', () => {
  const repo = setupRepo('gov-cli-release-out-dir-non-release-check');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const result = run(['check', '--out-dir', '.governance/release-check'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--out-dir is only supported with --release-check/);
});

test('release-check requires --report when --out-dir is provided', () => {
  const repo = setupRepo('gov-cli-release-out-dir-requires-report');
  const result = run(['release-check', '--scope', 'maintenance', '--out-dir', '.governance/release-check'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--out-dir requires --report/);
});

test('release-check without --report writes no artifacts', () => {
  const repo = setupRepo('gov-cli-release-no-report-artifacts');
  const result = run(['release-check', '--scope', 'maintenance'], repo);
  assert.notEqual(result.status, 0);
  assert.equal(existsSync(path.join(repo, '.governance', 'release-check', 'report.json')), false);
  assert.equal(existsSync(path.join(repo, '.governance', 'release-check', 'report.md')), false);
});

test('release-check with --report writes artifacts even on failure', () => {
  const repo = setupRepo('gov-cli-release-report-fail');
  const outDir = '.governance/release-check';
  const result = run(['release-check', '--scope', 'maintenance', '--report', 'both', '--out-dir', outDir], repo);
  assert.notEqual(result.status, 0);

  const jsonPath = path.join(repo, outDir, 'report.json');
  const mdPath = path.join(repo, outDir, 'report.md');
  assert.equal(existsSync(jsonPath), true);
  assert.equal(existsSync(mdPath), true);

  const payload = JSON.parse(readFileSync(jsonPath, 'utf8'));
  assert.equal(payload.schemaVersion, RELEASE_CHECK_REPORT_SCHEMA_VERSION);
  assert.equal(payload.result, 'FAIL');
  assert.equal(payload.scope, 'maintenance');
  assert.equal(payload.summary.total >= 1, true);
  assert.equal(payload.summary.failed >= 1, true);
});

test('release-check maintenance fails when policy file is missing', () => {
  const repo = setupRepo('gov-cli-release-check-missing-policy');
  const result = run(['release-check', '--scope', 'maintenance'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /\[governance:release-check\] FAIL maintenance\.policy-file/);
  assert.match(result.stdout, /release-maintenance-policy\.md/);
});

test('release-check passes maintenance and distribution scopes in this repository', () => {
  const maintenance = run(['release-check', '--scope', 'maintenance'], process.cwd());
  assert.equal(maintenance.status, 0, `${maintenance.stdout}\n${maintenance.stderr}`);
  assert.match(maintenance.stdout, /\[governance:release-check\] PASS \(scope=maintenance\)/);

  const distribution = run(['release-check', '--scope', 'distribution'], process.cwd());
  assert.equal(distribution.status, 0, `${distribution.stdout}\n${distribution.stderr}`);
  assert.match(distribution.stdout, /\[governance:release-check\] PASS \(scope=distribution\)/);
});

test('ci-check runs preCommit then prePush and fails fast on first failure', () => {
  const repo = setupRepo('gov-cli-ci-check-order');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  mkdirSync(path.join(repo, 'scripts'), { recursive: true });
  writeFileSync(
    path.join(repo, 'scripts', 'ci-gate-helper.mjs'),
    `import { appendFileSync } from 'node:fs';\n` +
    `const label = process.argv[2] || 'unknown';\n` +
    `appendFileSync('.ci-order.log', \`\${label}\\n\`);\n` +
    `if (label.includes('fail')) process.exit(1);\n`,
    'utf8'
  );

  const configPath = path.join(repo, 'governance.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  config.gates.preCommit = ['node scripts/ci-gate-helper.mjs precommit-pass'];
  config.gates.prePush = ['node scripts/ci-gate-helper.mjs prepush-pass'];
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  const pass = run(['ci-check', '--gate', 'all'], repo);
  assert.equal(pass.status, 0, `${pass.stdout}\n${pass.stderr}`);
  assert.deepEqual(readFileSync(path.join(repo, '.ci-order.log'), 'utf8').trim().split('\n'), [
    'precommit-pass',
    'prepush-pass',
  ]);

  rmSync(path.join(repo, '.ci-order.log'), { force: true });
  config.gates.preCommit = ['node scripts/ci-gate-helper.mjs precommit-fail'];
  config.gates.prePush = ['node scripts/ci-gate-helper.mjs prepush-should-not-run'];
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  const failFast = run(['ci-check', '--gate', 'all'], repo);
  assert.notEqual(failFast.status, 0);
  assert.deepEqual(readFileSync(path.join(repo, '.ci-order.log'), 'utf8').trim().split('\n'), [
    'precommit-fail',
  ]);
});

for (const [suffix, gate, expected] of [
  ['precommit', 'precommit', ['pre-ci', 'precommit-pass']],
  ['prepush', 'prepush', ['pre-ci', 'prepush-pass']],
  ['all', 'all', ['pre-ci', 'precommit-pass', 'prepush-pass']],
]) {
  test(`ci-check runs preCiCommand once before ${gate} gate selection`, () => {
    const repo = setupRepo(`gov-cli-ci-pre-command-${suffix}`);
    const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
    assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

    mkdirSync(path.join(repo, 'scripts'), { recursive: true });
    writeFileSync(
      path.join(repo, 'scripts', 'ci-pre-helper.mjs'),
      `import { appendFileSync } from 'node:fs';\n` +
      `appendFileSync('.ci-pre.log', \`\${process.argv[2]}\\n\`);\n`,
      'utf8'
    );

    const configPath = path.join(repo, 'governance.config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    config.ci = { preCiCommand: 'node scripts/ci-pre-helper.mjs pre-ci' };
    config.gates.preCommit = ['node scripts/ci-pre-helper.mjs precommit-pass'];
    config.gates.prePush = ['node scripts/ci-pre-helper.mjs prepush-pass'];
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

    const result = run(['ci-check', '--gate', gate], repo);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /\[governance:ci-check\] preCi: node scripts\/ci-pre-helper\.mjs pre-ci/);
    assert.deepEqual(readFileSync(path.join(repo, '.ci-pre.log'), 'utf8').trim().split('\n'), expected);
  });
}

test('ci-check treats empty ci object as disabled', () => {
  const repo = setupRepo('gov-cli-ci-empty-object');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  mkdirSync(path.join(repo, 'scripts'), { recursive: true });
  writeFileSync(
    path.join(repo, 'scripts', 'ci-pre-helper.mjs'),
    `import { appendFileSync } from 'node:fs';\n` +
    `appendFileSync('.ci-pre.log', \`\${process.argv[2]}\\n\`);\n`,
    'utf8'
  );

  const configPath = path.join(repo, 'governance.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  config.ci = {};
  config.gates.preCommit = ['node scripts/ci-pre-helper.mjs precommit-pass'];
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  const result = run(['ci-check', '--gate', 'precommit'], repo);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.doesNotMatch(result.stdout, /\[governance:ci-check\] preCi:/);
  assert.deepEqual(readFileSync(path.join(repo, '.ci-pre.log'), 'utf8').trim().split('\n'), ['precommit-pass']);
});

test('ci-check fails before gates when preCiCommand fails', () => {
  const repo = setupRepo('gov-cli-ci-pre-command-fail');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  mkdirSync(path.join(repo, 'scripts'), { recursive: true });
  writeFileSync(
    path.join(repo, 'scripts', 'ci-pre-helper.mjs'),
    `import { appendFileSync } from 'node:fs';\n` +
      `const label = process.argv[2] || 'unknown';\n` +
      `appendFileSync('.ci-pre.log', \`\${label}\\n\`);\n` +
      `if (label === 'pre-ci-fail') process.exit(1);\n`,
    'utf8'
  );

  const configPath = path.join(repo, 'governance.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  config.ci = { preCiCommand: 'node scripts/ci-pre-helper.mjs pre-ci-fail' };
  config.gates.preCommit = ['node scripts/ci-pre-helper.mjs precommit-pass'];
  config.gates.prePush = ['node scripts/ci-pre-helper.mjs prepush-pass'];
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  const result = run(['ci-check', '--gate', 'all'], repo);
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /ci-check failed during ci\.preCiCommand/);
  assert.deepEqual(readFileSync(path.join(repo, '.ci-pre.log'), 'utf8').trim().split('\n'), ['pre-ci-fail']);
});

test('ci-check recursion guard blocks self-referential gate commands', () => {
  const repo = setupRepo('gov-cli-ci-check-recursive');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const configPath = path.join(repo, 'governance.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  config.gates.preCommit = ['npx --no-install ai-governance ci-check --gate precommit'];
  config.gates.prePush = ['echo "should not run"'];
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  const result = run(['ci-check', '--gate', 'all'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Recursive ci-check command detected/);
});

test('ci-check recursion guard blocks self-referential preCiCommand', () => {
  const repo = setupRepo('gov-cli-ci-check-preci-recursive');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const configPath = path.join(repo, 'governance.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  config.ci = { preCiCommand: 'npx --no-install ai-governance ci-check --gate all' };
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  const result = run(['ci-check', '--gate', 'all'], repo);
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /Recursive ci-check command detected in ci\.preCiCommand/);
});

test('ci-check rejects whitespace-only preCiCommand config', () => {
  const repo = setupRepo('gov-cli-ci-preci-whitespace');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const configPath = path.join(repo, 'governance.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  config.ci = { preCiCommand: '   ' };
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  const result = run(['ci-check', '--gate', 'all'], repo);
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /Invalid config/);
});

test('ci-check rejects non-string preCiCommand config', () => {
  const repo = setupRepo('gov-cli-ci-preci-non-string');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const configPath = path.join(repo, 'governance.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  config.ci = { preCiCommand: 42 };
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  const result = run(['ci-check', '--gate', 'all'], repo);
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /Invalid config/);
});

test('invalid preset error lists all supported presets', () => {
  const repo = setupRepo('gov-cli-invalid-preset');
  const result = run(['init', '--preset', 'unknown-preset'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Allowed: node-npm-cjs, node-npm-esm, node-pnpm-monorepo, node-yarn-workspaces, generic/);
});

test('init rerun is idempotent when managed files are unchanged', () => {
  const repo = setupRepo('gov-cli-idempotent');

  const first = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(first.status, 0, `${first.stdout}\n${first.stderr}`);

  const second = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(second.status, 0, `${second.stdout}\n${second.stderr}`);
  assert.match(second.stdout, /No changes required\.|Manifest unchanged\./);
});

test('init refuses overwrite when managed files drift without --force', () => {
  const repo = setupRepo('gov-cli-conflict');

  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const agentsPath = path.join(repo, 'AGENTS.md');
  const current = readFileSync(agentsPath, 'utf8');
  writeFileSync(agentsPath, current.replace('AI Agent Governance Rules', 'AI Agent Governance Rules (edited local)'), 'utf8');

  const conflict = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.notEqual(conflict.status, 0);
  assert.match(conflict.stdout, /Conflicts detected/);

  const forced = run(['init', '--force', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(forced.status, 0, `${forced.stdout}\n${forced.stderr}`);
});

test('auto hook strategy does not overwrite existing hook manager configuration', () => {
  const repo = setupRepo('gov-cli-hook-conflict');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0', husky: { hooks: {} } }, null, 2),
    'utf8'
  );

  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);
  assert.match(init.stderr, /Skipping core\.hooksPath update in auto mode/);

  const hooksPath = runText('git', ['config', '--get', 'core.hooksPath'], repo);
  assert.notEqual((hooksPath.stdout || '').trim(), '.githooks');

  const check = run(['check'], repo);
  assert.equal(check.status, 0, `${check.stdout}\n${check.stderr}`);
});

test('upgrade fails when manifest is missing', () => {
  const repo = setupRepo('gov-cli-upgrade-missing');
  const result = run(['upgrade'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing \.governance\/manifest\.json/);
});

test('adopt report-only writes report and patch without managed-file mutations', () => {
  const repo = setupRepo('gov-cli-adopt-report-only');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0' }, null, 2),
    'utf8'
  );

  const result = run(['adopt'], repo);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(existsSync(path.join(repo, '.governance', 'adopt-report.md')), true);
  assert.equal(existsSync(path.join(repo, '.governance', 'patches', 'adopt.patch')), true);
  assert.equal(existsSync(path.join(repo, '.governance', 'manifest.json')), false);
  assert.match(result.stdout, /\[governance:adopt\] Ignore guidance:/);
  assert.match(result.stdout, /\[governance:adopt\] Review artifact path: \.governance\/adopt-report\.md/);
  assert.match(result.stdout, /\[governance:adopt\] Review patch path: \.governance\/patches\/adopt\.patch/);
  assert.match(result.stdout, /\[governance:adopt\] Suggested ignore entry: \.governance\/adopt-report\.md/);
  assert.match(result.stdout, /\[governance:adopt\] Suggested ignore entry: \.governance\/patches\/adopt\.patch/);
});

test('adopt report-only suppresses ignore guidance when repo-root .gitignore exactly covers adopt artifacts', () => {
  const repo = setupRepo('gov-cli-adopt-report-gitignore-covered');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0' }, null, 2),
    'utf8'
  );
  writeFileSync(
    path.join(repo, '.gitignore'),
    '# local governance artifacts\n   .governance/adopt-report.md   \n.governance/patches/adopt.patch   \n',
    'utf8'
  );

  const result = run(['adopt'], repo);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.doesNotMatch(result.stdout, /\[governance:adopt\] Ignore guidance:/);
});

test('adopt report-only suppresses ignore guidance when repo-root .gitignore broadly ignores .governance', () => {
  const repo = setupRepo('gov-cli-adopt-report-gitignore-governance');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0' }, null, 2),
    'utf8'
  );
  writeFileSync(path.join(repo, '.gitignore'), '.governance/\n', 'utf8');

  const result = run(['adopt'], repo);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.doesNotMatch(result.stdout, /\[governance:adopt\] Ignore guidance:/);
});

test('adopt report-only with custom report path prints adopt-specific ignore guidance for uncovered artifacts', () => {
  const repo = setupRepo('gov-cli-adopt-report-custom-path');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0' }, null, 2),
    'utf8'
  );

  const result = run(['adopt', '--report', 'custom/adopt-review.md'], repo);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(existsSync(path.join(repo, 'custom', 'adopt-review.md')), true);
  assert.match(result.stdout, /\[governance:adopt\] Review artifact path: custom\/adopt-review\.md/);
  assert.match(result.stdout, /\[governance:adopt\] Review patch path: \.governance\/patches\/adopt\.patch/);
  assert.match(result.stdout, /\[governance:adopt\] Suggested ignore entry: custom\/adopt-review\.md/);
  assert.match(result.stdout, /\[governance:adopt\] Suggested ignore entry: \.governance\/patches\/adopt\.patch/);
});

test('adopt report-only with custom report path suppresses report guidance when exact repo-root .gitignore entry exists', () => {
  const repo = setupRepo('gov-cli-adopt-report-custom-covered');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0' }, null, 2),
    'utf8'
  );
  writeFileSync(path.join(repo, '.gitignore'), 'custom/adopt-review.md\n', 'utf8');

  const result = run(['adopt', '--report', 'custom/adopt-review.md'], repo);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /\[governance:adopt\] Ignore guidance:/);
  assert.doesNotMatch(result.stdout, /\[governance:adopt\] Suggested ignore entry: custom\/adopt-review\.md/);
  assert.match(result.stdout, /\[governance:adopt\] Suggested ignore entry: \.governance\/patches\/adopt\.patch/);
});

test('adopt blocks ambiguous tracker mapping without planning canonical tracker writes', () => {
  const repo = setupRepo('gov-cli-adopt-ambiguous-tracker');
  mkdirSync(path.join(repo, 'docs'), { recursive: true });
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0' }, null, 2),
    'utf8'
  );
  writeFileSync(path.join(repo, 'docs', 'client-side-production-gap-tracker.md'), '# Tracker\n', 'utf8');
  writeFileSync(path.join(repo, 'docs', 'tracker.json'), '{}\n', 'utf8');

  const result = run(['adopt'], repo);
  assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
  const report = readFileSync(path.join(repo, '.governance', 'adopt-report.md'), 'utf8');
  const patch = readFileSync(path.join(repo, '.governance', 'patches', 'adopt.patch'), 'utf8');
  assert.match(report, /hasTracker: true/);
  assert.match(report, /trackerStatus: ambiguous/);
  assert.match(report, /trackerCandidates: docs\/client-side-production-gap-tracker\.md, docs\/tracker\.json/);
  assert.doesNotMatch(report, /\|\s+(create|update|conflict)\s+\|\s+docs\/tracker\.md\s+\|/);
  assert.doesNotMatch(report, /\|\s+(create|update|conflict)\s+\|\s+governance\.config\.json\s+\|/);
  assert.doesNotMatch(patch, /## docs\/tracker\.md/);
  assert.doesNotMatch(patch, /## governance\.config\.json/);
});

test('adopt blocks configured-missing tracker path without falling back to canonical tracker generation', () => {
  const repo = setupRepo('gov-cli-adopt-configured-missing');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0' }, null, 2),
    'utf8'
  );
  writeSampleGovernanceConfig(repo, 'docs/missing-tracker.md');

  const result = run(['adopt'], repo);
  assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
  const report = readFileSync(path.join(repo, '.governance', 'adopt-report.md'), 'utf8');
  assert.match(report, /hasTracker: false/);
  assert.match(report, /trackerStatus: configured-missing/);
  assert.match(report, /trackerPath: docs\/missing-tracker\.md/);
  assert.doesNotMatch(report, /\|\s+(create|update|conflict)\s+\|\s+docs\/tracker\.md\s+\|/);
});

test('adopt returns exit code 2 for blocked unsupported inference', () => {
  const repo = setupRepo('gov-cli-adopt-blocked');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0', workspaces: ['packages/*'] }, null, 2),
    'utf8'
  );

  const result = run(['adopt'], repo);
  assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /\[governance:adopt\] Ignore guidance:/);
  assert.match(result.stderr, /adopt blocked/);
  assert.equal(existsSync(path.join(repo, '.governance', 'adopt-report.md')), true);
});

test('adopt honors CLI preset override over unsupported inference', () => {
  const repo = setupRepo('gov-cli-adopt-override');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0', workspaces: ['packages/*'] }, null, 2),
    'utf8'
  );

  const result = run(['adopt', '--preset', 'generic'], repo);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = readFileSync(path.join(repo, '.governance', 'adopt-report.md'), 'utf8');
  assert.match(report, /selectedPreset: generic \(source=cli\)/);
});

test('adopt --tracker-path resolves custom tracker mapping and upgrade preserves tracker.path', () => {
  const repo = setupRepo('gov-cli-adopt-custom-tracker-path');
  mkdirSync(path.join(repo, 'docs'), { recursive: true });
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0' }, null, 2),
    'utf8'
  );
  writeFileSync(path.join(repo, 'docs', 'client-side-production-gap-tracker.md'), '# Tracker\n', 'utf8');
  writeFileSync(path.join(repo, 'docs', 'tracker.json'), '{}\n', 'utf8');
  commitAll(repo, 'chore: baseline custom tracker');

  const adopt = run(['adopt', '--tracker-path', 'docs/tracker.json', '--apply'], repo);
  assert.equal(adopt.status, 0, `${adopt.stdout}\n${adopt.stderr}`);
  const config = JSON.parse(readFileSync(path.join(repo, 'governance.config.json'), 'utf8'));
  assert.equal(config.tracker.path, 'docs/tracker.json');
  assert.equal(existsSync(path.join(repo, 'docs', 'tracker.md')), false);

  const report = readFileSync(path.join(repo, '.governance', 'adopt-report.md'), 'utf8');
  assert.match(report, /trackerStatus: custom/);
  assert.match(report, /trackerPath: docs\/tracker\.json/);

  const upgrade = run(['upgrade', '--dry-run'], repo);
  assert.equal(upgrade.status, 0, `${upgrade.stdout}\n${upgrade.stderr}`);
  assert.doesNotMatch(upgrade.stdout, /docs\/tracker\.md/);
  const configAfterUpgrade = JSON.parse(readFileSync(path.join(repo, 'governance.config.json'), 'utf8'));
  assert.equal(configAfterUpgrade.tracker.path, 'docs/tracker.json');
});

test('adopt preserves ci.preCiCommand when regenerating config', () => {
  const repo = setupRepo('gov-cli-adopt-preserve-preci');
  mkdirSync(path.join(repo, 'docs'), { recursive: true });
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0' }, null, 2),
    'utf8'
  );
  writeFileSync(path.join(repo, 'docs', 'tracker.md'), '# Tracker\n', 'utf8');
  writeSampleGovernanceConfig(repo, 'docs/tracker.md');

  const configPath = path.join(repo, 'governance.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  config.ci = { preCiCommand: 'npm run codegen' };
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  const result = run(['adopt', '--apply', '--force'], repo);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const updated = JSON.parse(readFileSync(configPath, 'utf8'));
  assert.deepEqual(updated.ci, { preCiCommand: 'npm run codegen' });
});

test('upgrade preserves ci.preCiCommand when rewriting managed config', () => {
  const repo = setupRepo('gov-cli-upgrade-preserve-preci');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const configPath = path.join(repo, 'governance.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  config.ci = { preCiCommand: 'npm run codegen' };
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  const result = run(['upgrade', '--force'], repo);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const updated = JSON.parse(readFileSync(configPath, 'utf8'));
  assert.deepEqual(updated.ci, { preCiCommand: 'npm run codegen' });
});

test('adopt fails safely when existing config JSON is invalid and overrides cannot be preserved', () => {
  const repo = setupRepo('gov-cli-adopt-invalid-json-preserve');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0' }, null, 2),
    'utf8'
  );
  writeFileSync(path.join(repo, 'governance.config.json'), '{\n', 'utf8');

  const result = run(['adopt'], repo);
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /Cannot preserve generated config overrides/);
});

test('upgrade fails safely when existing preCiCommand is invalid', () => {
  const repo = setupRepo('gov-cli-upgrade-invalid-preci-preserve');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const configPath = path.join(repo, 'governance.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  config.ci = { preCiCommand: 17 };
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  const result = run(['upgrade', '--force'], repo);
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /Cannot preserve ci\.preCiCommand/);
});

test('adopt report-only keeps blockers visible even when --force is provided', () => {
  const repo = setupRepo('gov-cli-adopt-force-report');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0', workspaces: ['packages/*'] }, null, 2),
    'utf8'
  );

  const result = run(['adopt', '--force'], repo);
  assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /adopt blocked/);
});

test('adopt --apply blocks on dirty tree unless --force, and force path records snapshot', () => {
  const repo = setupRepo('gov-cli-adopt-apply-safety');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0' }, null, 2),
    'utf8'
  );
  commitAll(repo, 'chore: baseline');

  writeFileSync(path.join(repo, 'scratch.txt'), 'dirty\n', 'utf8');
  const blocked = run(['adopt', '--apply'], repo);
  assert.equal(blocked.status, 2, `${blocked.stdout}\n${blocked.stderr}`);
  assert.doesNotMatch(blocked.stdout, /\[governance:adopt\] Ignore guidance:/);
  assert.match(blocked.stderr, /adopt apply blocked/);

  const forced = run(['adopt', '--apply', '--force'], repo);
  assert.equal(forced.status, 0, `${forced.stdout}\n${forced.stderr}`);
  assert.doesNotMatch(forced.stdout, /\[governance:adopt\] Ignore guidance:/);
  assert.equal(existsSync(path.join(repo, '.governance', 'manifest.json')), true);
  assert.equal(existsSync(path.join(repo, '.governance', 'backups', 'index.json')), true);
  assert.match(forced.stdout, /Rollback: npx @ramuks22\/ai-agent-governance rollback --to/);
});

test('adopt rejects missing non-canonical --tracker-path values with actionable error', () => {
  const repo = setupRepo('gov-cli-adopt-invalid-tracker-path');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0' }, null, 2),
    'utf8'
  );

  const result = run(['adopt', '--tracker-path', 'docs/missing-tracker.json'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--tracker-path requires an existing file or docs\/tracker\.md/);
});

test('adopt recognizes canonical tracker repos without blocking', () => {
  const repo = setupRepo('gov-cli-adopt-canonical-tracker');
  mkdirSync(path.join(repo, 'docs'), { recursive: true });
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0' }, null, 2),
    'utf8'
  );
  writeFileSync(path.join(repo, 'docs', 'tracker.md'), '# Tracker\n', 'utf8');

  const result = run(['adopt'], repo);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = readFileSync(path.join(repo, '.governance', 'adopt-report.md'), 'utf8');
  assert.match(report, /hasTracker: true/);
  assert.match(report, /trackerStatus: canonical/);
  assert.match(report, /trackerPath: docs\/tracker\.md/);
});

for (const [suffix, scriptCommand] of [
  ['prefix', 'npm --prefix backend run build'],
  ['dash-c', 'npm -C backend run build'],
  ['npx-prefix', 'npx --prefix backend vite build'],
  ['subshell', '(cd backend && npm run build)'],
]) {
  test(`adopt blocks hybrid npm inference for ${suffix} operational package pattern`, () => {
    const repo = setupHybridNpmRepo(`gov-cli-adopt-hybrid-${suffix}`, {
      build: scriptCommand,
    });

    const result = run(['adopt'], repo);
    assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
    const report = readFileSync(path.join(repo, '.governance', 'adopt-report.md'), 'utf8');
    const patch = readFileSync(path.join(repo, '.governance', 'patches', 'adopt.patch'), 'utf8');
    assert.match(report, /layout: hybrid/);
    assert.match(report, /inferenceStatus: ambiguous/);
    assert.match(report, /packageRoots: backend\/package\.json, package\.json/);
    assert.match(report, /operationalPackageRoots: backend\/package\.json/);
    assert.match(report, /inferredPreset: none/);
    assert.match(report, /selectedPreset: none \(explicit --preset required\)/);
    assert.match(report, /Report-only \(node-npm-esm\): `npx @ramuks22\/ai-agent-governance adopt --preset node-npm-esm --hook-strategy auto --report \.governance\/adopt-report\.md`/);
    assert.match(report, /Report-only \(node-npm-cjs\): `npx @ramuks22\/ai-agent-governance adopt --preset node-npm-cjs --hook-strategy auto --report \.governance\/adopt-report\.md`/);
    assert.match(report, /Report-only \(generic\): `npx @ramuks22\/ai-agent-governance adopt --preset generic --hook-strategy auto --report \.governance\/adopt-report\.md`/);
    assert.doesNotMatch(report, /\|\s+(create|update|conflict)\s+\|\s+governance\.config\.json\s+\|/);
    assert.doesNotMatch(report, /\|\s+(create|update|conflict)\s+\|\s+docs\/tracker\.md\s+\|/);
    assert.doesNotMatch(report, /\|\s+(create|update|conflict)\s+\|\s+\.githooks\/pre-commit\s+\|/);
    assert.doesNotMatch(patch, /## governance\.config\.json/);
    assert.doesNotMatch(patch, /## docs\/tracker\.md/);
    assert.doesNotMatch(patch, /## \.githooks\/pre-commit/);
  });
}

test('adopt reports sorted operational package roots for multiple nested npm packages', () => {
  const repo = setupHybridNpmRepo(
    'gov-cli-adopt-hybrid-multi-root',
    {
      build: 'npm -C frontend run build && npm --prefix backend run test',
    },
    ['frontend/package.json', 'backend/package.json']
  );

  const result = run(['adopt'], repo);
  assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
  const report = readFileSync(path.join(repo, '.governance', 'adopt-report.md'), 'utf8');
  assert.match(report, /packageRoots: backend\/package\.json, frontend\/package\.json, package\.json/);
  assert.match(report, /operationalPackageRoots: backend\/package\.json, frontend\/package\.json/);
});

test('adopt keeps current single-package inference when nested package is not operationally referenced', () => {
  const repo = setupHybridNpmRepo(
    'gov-cli-adopt-non-operational-nested-package',
    {
      build: 'npm run lint',
    }
  );

  const result = run(['adopt'], repo);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = readFileSync(path.join(repo, '.governance', 'adopt-report.md'), 'utf8');
  assert.match(report, /layout: single-package/);
  assert.match(report, /inferenceStatus: confident/);
  assert.match(report, /packageRoots: backend\/package\.json, package\.json/);
  assert.match(report, /operationalPackageRoots: none/);
  assert.match(report, /selectedPreset: node-npm-esm \(source=inference\)/);
});

test('adopt does not trigger hybrid blocking for non-npm repos with nested package.json files', () => {
  const repo = setupRepo('gov-cli-adopt-non-npm-nested-packages');
  writeJsonFile(repo, 'package.json', {
    name: 'sample',
    version: '1.0.0',
    packageManager: 'pnpm@9.0.0',
    workspaces: ['packages/*'],
    scripts: {
      build: 'pnpm -r build',
    },
  });
  writeJsonFile(repo, 'backend/package.json', {
    name: 'backend',
    version: '1.0.0',
  });

  const result = run(['adopt'], repo);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = readFileSync(path.join(repo, '.governance', 'adopt-report.md'), 'utf8');
  assert.match(report, /layout: monorepo\/workspaces/);
  assert.match(report, /inferenceStatus: confident/);
  assert.doesNotMatch(report, /layout: hybrid/);
  assert.match(report, /selectedPreset: node-pnpm-monorepo \(source=inference\)/);
});

test('adopt explicit preset override unblocks hybrid npm repos', () => {
  const repo = setupHybridNpmRepo('gov-cli-adopt-hybrid-cli-preset', {
    build: 'npm --prefix backend run build',
  });

  const result = run(['adopt', '--preset', 'generic'], repo);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = readFileSync(path.join(repo, '.governance', 'adopt-report.md'), 'utf8');
  assert.match(report, /layout: hybrid/);
  assert.match(report, /inferenceStatus: ambiguous/);
  assert.match(report, /selectedPreset: generic \(source=cli\)/);
});

test('adopt manifest preset unblocks hybrid npm repos', () => {
  const repo = setupHybridNpmRepo('gov-cli-adopt-hybrid-manifest-preset', {
    build: 'npm --prefix backend run build',
  });

  const init = run(['init', '--preset', 'generic', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const result = run(['adopt'], repo);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = readFileSync(path.join(repo, '.governance', 'adopt-report.md'), 'utf8');
  assert.match(report, /layout: hybrid/);
  assert.match(report, /inferenceStatus: ambiguous/);
  assert.match(report, /selectedPreset: generic \(source=manifest\)/);
});

test('--apply, --report, and --tracker-path are rejected outside adopt mode', () => {
  const repo = setupRepo('gov-cli-adopt-flag-guard');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0' }, null, 2),
    'utf8'
  );

  const applyInvalid = run(['check', '--apply'], repo);
  assert.notEqual(applyInvalid.status, 0);
  assert.match(applyInvalid.stderr, /--apply is only supported with --adopt or --release-publish/);

  const reportInvalid = run(['check', '--report', 'tmp.md'], repo);
  assert.notEqual(reportInvalid.status, 0);
  assert.match(reportInvalid.stderr, /--report is only supported with --adopt or --release-check/);

  const trackerPathInvalid = run(['check', '--tracker-path', 'docs/tracker.json'], repo);
  assert.notEqual(trackerPathInvalid.status, 0);
  assert.match(trackerPathInvalid.stderr, /--tracker-path is only supported with --adopt/);
});

test('upgrade dry-run can emit deterministic patch output', () => {
  const repo = setupRepo('gov-cli-upgrade-patch');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const patchPath = '.governance/patches/custom.patch';
  const upgrade = run(['upgrade', '--dry-run', `--patch=${patchPath}`], repo);
  assert.equal(upgrade.status, 0, `${upgrade.stdout}\n${upgrade.stderr}`);
  assert.equal(existsSync(path.join(repo, patchPath)), true);
  assert.match(upgrade.stdout, /Wrote patch file/);
});

test('repo and greenfield template ship canonical governance artifact ignore defaults', () => {
  const rootGitignore = readFileSync(path.resolve(__dirname, '..', '..', '.gitignore'), 'utf8');
  const templateGitignore = readFileSync(
    path.resolve(__dirname, '..', '..', 'templates', 'greenfield', '.gitignore'),
    'utf8'
  );

  for (const content of [rootGitignore, templateGitignore]) {
    assert.match(content, /^\.governance\/backups\/$/m);
    assert.match(content, /^\.governance\/release-check\/$/m);
    assert.match(content, /^\.governance\/adopt-report\.md$/m);
    assert.match(content, /^\.governance\/patches\/adopt\.patch$/m);
  }
});

test('upgrade conflicts fail closed and rollback restores snapshot when forced', () => {
  const repo = setupRepo('gov-cli-upgrade-rollback');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const agentsPath = path.join(repo, 'AGENTS.md');
  const editedToken = 'AI Agent Governance Rules (edited local)';
  const originalContent = readFileSync(agentsPath, 'utf8');
  writeFileSync(agentsPath, originalContent.replace('AI Agent Governance Rules', editedToken), 'utf8');

  const blocked = run(['upgrade'], repo);
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stdout, /Conflicts detected/);

  const forcedUpgrade = run(['upgrade', '--force'], repo);
  assert.equal(forcedUpgrade.status, 0, `${forcedUpgrade.stdout}\n${forcedUpgrade.stderr}`);
  assert.equal(existsSync(path.join(repo, '.governance', 'backups', 'index.json')), true);
  assert.doesNotMatch(readFileSync(agentsPath, 'utf8'), new RegExp(editedToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const rollbackBlocked = run(['rollback'], repo);
  assert.notEqual(rollbackBlocked.status, 0);
  assert.match(rollbackBlocked.stderr, /clean git working tree/);

  const rollbackForced = run(['rollback', '--force'], repo);
  assert.equal(rollbackForced.status, 0, `${rollbackForced.stdout}\n${rollbackForced.stderr}`);
  assert.match(readFileSync(agentsPath, 'utf8'), new RegExp(editedToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('doctor fails when managed block markers are corrupted', () => {
  const repo = setupRepo('gov-cli-doctor-managed-blocks');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const agentsPath = path.join(repo, 'AGENTS.md');
  const current = readFileSync(agentsPath, 'utf8');
  writeFileSync(agentsPath, current.replace('<!-- ai-governance:AGENTS.md:begin -->\n', ''), 'utf8');

  const doctor = run(['doctor'], repo);
  assert.notEqual(doctor.status, 0);
  assert.match(doctor.stdout, /\[doctor\] FAIL managed-blocks/);
  assert.match(doctor.stdout, /AGENTS\.md/);
});

test('doctor fails ci-parity when no supported CI files exist', () => {
  const repo = setupRepo('gov-cli-doctor-ci-parity-missing-files');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  rmSync(path.join(repo, '.github', 'workflows'), { recursive: true, force: true });

  const doctor = run(['doctor'], repo);
  assert.notEqual(doctor.status, 0);
  assert.match(doctor.stdout, /\[doctor\] FAIL ci-parity/);
  assert.match(doctor.stdout, /no supported CI files found/);
});

test('doctor fails ci-parity when CI files exist without ci-check invocation', () => {
  const repo = setupRepo('gov-cli-doctor-ci-parity-no-invocation');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  writeFileSync(
    path.join(repo, '.github', 'workflows', 'governance-ci.yml'),
    'name: Governance CI\\non:\\n  push:\\n    branches: [main]\\njobs:\\n  governance:\\n    runs-on: ubuntu-latest\\n    steps:\\n      - run: npm run governance:check\\n',
    'utf8'
  );
  rmSync(path.join(repo, '.github', 'workflows', 'governance-ci-reusable.yml'), { force: true });

  const doctor = run(['doctor'], repo);
  assert.notEqual(doctor.status, 0);
  assert.match(doctor.stdout, /\[doctor\] FAIL ci-parity/);
  assert.match(doctor.stdout, /none invoke ci-check/);
});

test('doctor ci-parity recognizes governance-ci-reusable workflow references', () => {
  const repo = setupRepo('gov-cli-doctor-ci-parity-reusable-reference');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const directPath = path.join(repo, '.github', 'workflows', 'governance-ci.yml');
  const directContent = readFileSync(directPath, 'utf8');
  writeFileSync(
    directPath,
    directContent.replace('npx --no-install ai-governance ci-check --gate all', 'npm run -s test'),
    'utf8'
  );

  const reusablePath = path.join(repo, '.github', 'workflows', 'governance-ci-reusable.yml');
  const reusableContent = readFileSync(reusablePath, 'utf8');
  writeFileSync(
    reusablePath,
    reusableContent.replace('ci-check --gate all', 'test'),
    'utf8'
  );

  writeFileSync(
    path.join(repo, '.github', 'workflows', 'caller.yml'),
    'name: Governance\\non:\\n  pull_request:\\n    branches: [main]\\njobs:\\n  governance:\\n    uses: ramuks22/ai-agent-governance/.github/workflows/governance-ci-reusable.yml@v1.1.0\\n    with:\\n      package_version: \"1.1.0\"\\n',
    'utf8'
  );

  const doctor = run(['doctor'], repo);
  assert.notEqual(doctor.status, 0);
  assert.match(doctor.stdout, /\[doctor\] PASS ci-parity/);
  assert.match(doctor.stdout, /caller\.yml/);
});

test('release-check report builder sorts checks and emits deterministic schema fields', () => {
  const checks = [
    {
      id: 'distribution.template-pin',
      ok: false,
      detail: 'template pin mismatch',
      scope: 'distribution',
      durationMs: 0,
      evidence: ['z', 'a'],
    },
    {
      id: 'maintenance.sections',
      ok: true,
      detail: 'canonical sections present',
      scope: 'maintenance',
      durationMs: 0,
      evidence: ['b'],
    },
  ];

  const report = buildReleaseCheckReport(checks, {
    releaseScope: 'all',
    releaseReportFormat: 'both',
    releaseOutDir: '.governance/release-check',
  });
  const payload = JSON.parse(report.json);
  assert.equal(payload.schemaVersion, RELEASE_CHECK_REPORT_SCHEMA_VERSION);
  assert.deepEqual(payload.checks.map((check) => check.id), [
    'distribution.template-pin',
    'maintenance.sections',
  ]);
});

test('redaction masks secret-like values in release-check reports', () => {
  const awsKey = ['AKIA', '1234567890ABCDEF'].join('');
  const ghToken = ['gh', 'p_', 'abcdefghijklmnopqrstuvwxyz123456'].join('');
  const slackToken = ['xox', 'b-', '1234567890-abcdefghijklmnop'].join('');
  const privateKey = `-----${['BEGIN', 'PRIVATE', 'KEY-----'].join(' ')}\\nABCDEF\\n-----${['END', 'PRIVATE', 'KEY-----'].join(' ')}`;
  const raw = `Bearer abc.def token=${ghToken} secret=top api_key=foo password=bar ${awsKey} ${slackToken} ${privateKey}`;
  const redacted = redactSensitiveText(raw);
  assert.doesNotMatch(redacted, new RegExp(awsKey));
  assert.doesNotMatch(redacted, new RegExp(ghToken));
  assert.doesNotMatch(redacted, new RegExp(slackToken));
  assert.doesNotMatch(redacted, /BEGIN PRIVATE KEY/);
  assert.match(redacted, /\[REDACTED\]/);

  const report = buildReleaseCheckReport([
    {
      id: 'distribution.pack-dry-run',
      ok: false,
      detail: raw,
      scope: 'distribution',
      durationMs: 0,
      evidence: [raw],
    },
  ], {
    releaseScope: 'distribution',
    releaseReportFormat: 'both',
    releaseOutDir: '.governance/release-check',
  });
  assert.doesNotMatch(report.json, new RegExp(ghToken));
  assert.doesNotMatch(report.markdown, new RegExp(slackToken));
  assert.match(report.json, /\[REDACTED\]/);
  assert.match(report.markdown, /\[REDACTED\]/);
});

test('release-check workflow uploads only report artifacts with 14-day retention', () => {
  const workflow = readFileSync(path.join(process.cwd(), '.github', 'workflows', 'release-check.yml'), 'utf8');
  assert.match(workflow, /release-check --scope .* --report both --out-dir \.governance\/release-check/);
  assert.match(workflow, /\.governance\/release-check\/report\.json/);
  assert.match(workflow, /\.governance\/release-check\/report\.md/);
  assert.match(workflow, /retention-days:\s*14/);
});

test('installable distribution docs mention release-check report mode', () => {
  const readme = readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
  const docsIndex = readFileSync(path.join(process.cwd(), 'docs', 'README.md'), 'utf8');
  const policy = readFileSync(path.join(process.cwd(), 'docs', 'development', 'release-maintenance-policy.md'), 'utf8');

  assert.match(readme, /release-check --scope all --report both --out-dir \.governance\/release-check/);
  assert.match(docsIndex, /Installable Distribution \(AG-GOV-003 Stage 12\+\)/);
  assert.match(policy, /Preferred automation path \(Stage 10\)/);
});

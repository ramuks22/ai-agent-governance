import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

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

test('CLI help displays commands', () => {
  const result = run(['--help'], process.cwd());
  assert.equal(result.status, 0);
  assert.match(result.stdout, /ai-governance <command>/);
  assert.match(result.stdout, /init/);
  assert.match(result.stdout, /ci-check/);
  assert.match(result.stdout, /doctor/);
  assert.match(result.stdout, /upgrade/);
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

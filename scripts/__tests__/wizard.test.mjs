import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveWizardPreset,
  supportedWizardMatrixText,
  wizardFallbackExamples,
} from '../wizard.mjs';

test('resolveWizardPreset maps npm single-package combinations', () => {
  const cjs = resolveWizardPreset({
    packageManager: 'npm',
    moduleType: 'cjs',
    layout: 'single-package',
  });
  assert.deepEqual(cjs, { ok: true, preset: 'node-npm-cjs' });

  const esm = resolveWizardPreset({
    packageManager: 'npm',
    moduleType: 'esm',
    layout: 'single-package',
  });
  assert.deepEqual(esm, { ok: true, preset: 'node-npm-esm' });
});

test('resolveWizardPreset maps workspace combinations', () => {
  const pnpm = resolveWizardPreset({
    packageManager: 'pnpm',
    layout: 'monorepo/workspaces',
  });
  assert.deepEqual(pnpm, { ok: true, preset: 'node-pnpm-monorepo' });

  const yarn = resolveWizardPreset({
    packageManager: 'yarn',
    layout: 'monorepo/workspaces',
  });
  assert.deepEqual(yarn, { ok: true, preset: 'node-yarn-workspaces' });
});

test('resolveWizardPreset maps generic without layout/module requirements', () => {
  const generic = resolveWizardPreset({ packageManager: 'generic' });
  assert.deepEqual(generic, { ok: true, preset: 'generic' });
});

test('resolveWizardPreset fails unsupported combinations with explicit reason', () => {
  const npmMono = resolveWizardPreset({
    packageManager: 'npm',
    moduleType: 'cjs',
    layout: 'monorepo/workspaces',
  });
  assert.equal(npmMono.ok, false);
  assert.match(npmMono.reason, /Unsupported wizard combination: npm \+ cjs \+ monorepo\/workspaces/);

  const pnpmSingle = resolveWizardPreset({
    packageManager: 'pnpm',
    layout: 'single-package',
  });
  assert.equal(pnpmSingle.ok, false);
  assert.match(pnpmSingle.reason, /Unsupported wizard combination: pnpm \+ single-package/);
});

test('wizard helper text contains supported matrix and fallback commands', () => {
  const matrix = supportedWizardMatrixText();
  assert.match(matrix, /npm \+ cjs \+ single-package => node-npm-cjs/);
  assert.match(matrix, /pnpm \+ monorepo\/workspaces => node-pnpm-monorepo/);
  assert.match(matrix, /yarn \+ monorepo\/workspaces => node-yarn-workspaces/);

  const fallback = wizardFallbackExamples();
  assert.match(fallback, /--preset node-npm-cjs/);
  assert.match(fallback, /--preset node-pnpm-monorepo/);
  assert.match(fallback, /--preset node-yarn-workspaces/);
  assert.match(fallback, /--preset generic/);
});

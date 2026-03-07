const SUPPORTED_PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'generic'];
const SUPPORTED_MODULE_TYPES = ['cjs', 'esm'];
const SUPPORTED_LAYOUTS = ['single-package', 'monorepo/workspaces'];

const SUPPORTED_MATRIX = [
  { packageManager: 'npm', moduleType: 'cjs', layout: 'single-package', preset: 'node-npm-cjs' },
  { packageManager: 'npm', moduleType: 'esm', layout: 'single-package', preset: 'node-npm-esm' },
  { packageManager: 'pnpm', moduleType: null, layout: 'monorepo/workspaces', preset: 'node-pnpm-monorepo' },
  { packageManager: 'yarn', moduleType: null, layout: 'monorepo/workspaces', preset: 'node-yarn-workspaces' },
  { packageManager: 'generic', moduleType: null, layout: null, preset: 'generic' },
];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function resolveInputShape(input) {
  return {
    packageManager: normalize(input?.packageManager),
    moduleType: normalize(input?.moduleType),
    layout: normalize(input?.layout),
  };
}

function formatMatrixLine(entry) {
  if (entry.packageManager === 'generic') {
    return `- generic => ${entry.preset}`;
  }

  if (entry.packageManager === 'npm') {
    return `- npm + ${entry.moduleType} + ${entry.layout} => ${entry.preset}`;
  }

  return `- ${entry.packageManager} + ${entry.layout} => ${entry.preset}`;
}

export function supportedWizardMatrixText() {
  return SUPPORTED_MATRIX.map((entry) => formatMatrixLine(entry)).join('\n');
}

export function wizardFallbackExamples() {
  return [
    'npx @ramuks22/ai-agent-governance init --preset node-npm-cjs',
    'npx @ramuks22/ai-agent-governance init --preset node-pnpm-monorepo',
    'npx @ramuks22/ai-agent-governance init --preset node-yarn-workspaces',
    'npx @ramuks22/ai-agent-governance init --preset generic',
  ].join('\n');
}

export function resolveWizardPreset(input) {
  const { packageManager, moduleType, layout } = resolveInputShape(input);

  if (!SUPPORTED_PACKAGE_MANAGERS.includes(packageManager)) {
    return {
      ok: false,
      reason: `Unsupported package manager: '${packageManager || '(missing)'}'. Allowed: ${SUPPORTED_PACKAGE_MANAGERS.join(', ')}`,
    };
  }

  if (packageManager === 'generic') {
    return { ok: true, preset: 'generic' };
  }

  if (packageManager === 'npm') {
    if (!SUPPORTED_MODULE_TYPES.includes(moduleType)) {
      return {
        ok: false,
        reason: `Unsupported module type for npm: '${moduleType || '(missing)'}'. Allowed: ${SUPPORTED_MODULE_TYPES.join(', ')}`,
      };
    }

    if (!SUPPORTED_LAYOUTS.includes(layout)) {
      return {
        ok: false,
        reason: `Unsupported repo layout: '${layout || '(missing)'}'. Allowed: ${SUPPORTED_LAYOUTS.join(', ')}`,
      };
    }

    if (layout !== 'single-package') {
      return {
        ok: false,
        reason: `Unsupported wizard combination: npm + ${moduleType} + ${layout}`,
      };
    }

    return {
      ok: true,
      preset: moduleType === 'cjs' ? 'node-npm-cjs' : 'node-npm-esm',
    };
  }

  if (!SUPPORTED_LAYOUTS.includes(layout)) {
    return {
      ok: false,
      reason: `Unsupported repo layout: '${layout || '(missing)'}'. Allowed: ${SUPPORTED_LAYOUTS.join(', ')}`,
    };
  }

  if (layout !== 'monorepo/workspaces') {
    return {
      ok: false,
      reason: `Unsupported wizard combination: ${packageManager} + ${layout}`,
    };
  }

  return {
    ok: true,
    preset: packageManager === 'pnpm' ? 'node-pnpm-monorepo' : 'node-yarn-workspaces',
  };
}

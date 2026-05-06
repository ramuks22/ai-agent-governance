import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';

export const DEFAULT_AGENTIC_CONFIG = Object.freeze({
  enabled: true,
  roleRegistryPath: 'governance/agent-roles.json',
  skillRegistryPath: 'governance/agent-skills.json',
  adapterRegistryPath: 'governance/agent-adapters.json',
  generatedAdapterPath: 'generated/adapters',
  handoffArtifactPath: 'examples/handoffs',
  retrospectiveArtifactPath: 'examples/retrospectives',
  retrospectiveRequiredFor: [
    'ownership-conflict',
    'handoff-rework',
    'validation-escape',
  ],
  maxParallelWriters: 1,
  allowReadOnlyParallelism: true,
  requireBoundedOwnership: true,
  adapterGenerationMode: 'checked-in',
});

const ROLE_SCHEMA_PATH = 'schemas/agent-roles.schema.json';
const SKILL_SCHEMA_PATH = 'schemas/agent-skills.schema.json';
const HANDOFF_SCHEMA_PATH = 'schemas/agent-handoff.schema.json';
const RETROSPECTIVE_SCHEMA_PATH = 'schemas/agent-retrospective.schema.json';
const ADAPTER_SCHEMA_PATH = 'schemas/agent-adapters.schema.json';
const CANONICAL_SOURCES = [
  'docs/agentic/operating-model.md',
  'docs/agentic/adapter-strategy.md',
  'governance/agent-roles.json',
  'governance/agent-skills.json',
  'governance/agent-adapters.json',
];

function normalizeRel(inputPath) {
  return String(inputPath || '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
}

function markerSetForPath(relPath) {
  return relPath.endsWith('.md')
    ? {
      begin: `<!-- ai-governance:${relPath}:begin -->`,
      end: `<!-- ai-governance:${relPath}:end -->`,
    }
    : {
      begin: `# ai-governance:${relPath}:begin`,
      end: `# ai-governance:${relPath}:end`,
    };
}

function normalizeContent(content) {
  const normalized = String(content || '').replace(/\r\n/g, '\n').replace(/\n+$/g, '');
  return normalized ? `${normalized}\n` : '';
}

function unwrapManagedBlock(relPath, content) {
  const normalized = normalizeContent(content);
  const { begin, end } = markerSetForPath(relPath);
  const beginMarker = `${begin}\n`;
  const endMarker = `\n${end}`;
  const beginIndex = normalized.indexOf(beginMarker);
  const endIndex = normalized.lastIndexOf(endMarker);
  if (beginIndex === -1 || endIndex === -1 || endIndex <= beginIndex) {
    return normalized;
  }
  const blockContent = normalized.slice(beginIndex + beginMarker.length, endIndex);
  return normalizeContent(blockContent);
}

function repoPath(repoRoot, relPath) {
  return path.resolve(repoRoot, relPath);
}

function loadJson(absPath, label) {
  try {
    return JSON.parse(readFileSync(absPath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read ${label}: ${error.message}`);
  }
}

function validateData(schemaPath, data, label) {
  const schema = loadJson(schemaPath, `schema ${schemaPath}`);
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    throw new Error(`Invalid ${label}: ${ajv.errorsText(validate.errors)}`);
  }
}

function collectJsonFiles(absDir) {
  if (!existsSync(absDir)) return [];
  const entries = readdirSync(absDir).sort();
  const files = [];
  for (const entry of entries) {
    const absEntry = path.join(absDir, entry);
    const stats = statSync(absEntry);
    if (stats.isDirectory()) {
      files.push(...collectJsonFiles(absEntry));
    } else if (stats.isFile() && entry.endsWith('.json')) {
      files.push(absEntry);
    }
  }
  return files;
}

function normalizeOwnedPath(pattern) {
  return normalizeRel(pattern)
    .replace(/\/\*\*$/, '')
    .replace(/\/\*$/, '');
}

function patternsOverlap(left, right) {
  const a = normalizeOwnedPath(left);
  const b = normalizeOwnedPath(right);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

export function findWritableRoleOverlaps(roleRegistry) {
  const overlaps = [];
  const writableRoles = (roleRegistry.roles || []).filter((role) => role.read_only === false);
  for (let i = 0; i < writableRoles.length; i += 1) {
    for (let j = i + 1; j < writableRoles.length; j += 1) {
      for (const leftPath of writableRoles[i].owned_paths || []) {
        for (const rightPath of writableRoles[j].owned_paths || []) {
          if (patternsOverlap(leftPath, rightPath)) {
            overlaps.push({
              leftRole: writableRoles[i].name,
              rightRole: writableRoles[j].name,
              leftPath,
              rightPath,
            });
          }
        }
      }
    }
  }
  return overlaps;
}

function summarizeRole(role) {
  const ownership = role.read_only
    ? 'read-only'
    : `writable: ${role.owned_paths.join(', ')}`;
  return `- ${role.name}: ${role.purpose} (${ownership})`;
}

function summarizeSkill(skill) {
  return `- ${skill.name}: ${skill.purpose}`;
}

export function renderAdapterOutputs({ roleRegistry, skillRegistry, adapterRegistry }) {
  return (adapterRegistry.adapters || []).map((adapter) => {
    const lines = [
      '<!-- Generated file. Do not hand-edit. -->',
      `<!-- Canonical sources: ${CANONICAL_SOURCES.join(', ')} -->`,
      `# ${adapter.target} Adapter`,
      '',
      '## Canonical Boundary',
      '- This file is a generated projection. Canonical governance lives in the sources listed above.',
      '- Roles are discovered from repository and task evidence; the example roles below are not a permanent cast.',
      '- Skills package reusable workflows and do not grant write ownership.',
      '- Writable ownership must stay bounded and non-overlapping.',
      '- Repeated workflow pain should usually create a skill or validation before a new role.',
      '',
      '## Tool Notes',
      ...adapter.tool_notes.map((note) => `- ${note}`),
      '',
      '## Example Roles',
      ...roleRegistry.roles.map(summarizeRole),
      '',
      '## Example Skills',
      ...skillRegistry.skills.map(summarizeSkill),
      '',
      '## Limitations',
      ...adapter.limitations.map((note) => `- ${note}`),
      '',
    ];
    return {
      outputPath: normalizeRel(adapter.output_path),
      content: `${lines.join('\n').replace(/\n+$/g, '')}\n`,
    };
  });
}

function ensureRequiredSources(repoRoot, issues) {
  for (const relPath of CANONICAL_SOURCES) {
    if (!existsSync(repoPath(repoRoot, relPath))) {
      issues.push(`Missing canonical source: ${relPath}`);
    }
  }
}

function loadValidatedRegistry(repoRoot, relPath, schemaRelPath, label) {
  const absPath = repoPath(repoRoot, relPath);
  if (!existsSync(absPath)) {
    throw new Error(`Missing ${label}: ${relPath}`);
  }
  const data = loadJson(absPath, label);
  validateData(repoPath(repoRoot, schemaRelPath), data, label);
  return data;
}

function validateArtifactDirectory(repoRoot, relPath, schemaRelPath, label, issues) {
  const absDir = repoPath(repoRoot, relPath);
  if (!existsSync(absDir)) {
    issues.push(`Missing ${label} path: ${relPath}`);
    return [];
  }

  const files = collectJsonFiles(absDir);
  if (files.length === 0) {
    issues.push(`No ${label} files found under ${relPath}`);
    return [];
  }

  const schemaPath = repoPath(repoRoot, schemaRelPath);
  for (const file of files) {
    try {
      validateData(schemaPath, loadJson(file, label), `${label} ${normalizeRel(path.relative(repoRoot, file))}`);
    } catch (error) {
      issues.push(error.message);
    }
  }
  return files.map((file) => normalizeRel(path.relative(repoRoot, file)));
}

function collectRegularFiles(absDir) {
  if (!existsSync(absDir)) return [];
  const results = [];
  const entries = readdirSync(absDir).sort();
  for (const entry of entries) {
    const absEntry = path.join(absDir, entry);
    const stats = statSync(absEntry);
    if (stats.isDirectory()) {
      results.push(...collectRegularFiles(absEntry));
    } else if (stats.isFile()) {
      results.push(absEntry);
    }
  }
  return results;
}

export function validateAgenticArtifacts({ repoRoot, config }) {
  const agentic = config.agentic;
  if (!agentic || agentic.enabled !== true) {
    return {
      enabled: false,
      issues: [],
      handoffFiles: [],
      retrospectiveFiles: [],
      expectedAdapters: [],
    };
  }

  const issues = [];
  ensureRequiredSources(repoRoot, issues);
  if (issues.length > 0) {
    return {
      enabled: true,
      issues,
      handoffFiles: [],
      retrospectiveFiles: [],
      expectedAdapters: [],
    };
  }

  let roleRegistry;
  let skillRegistry;
  let adapterRegistry;
  try {
    roleRegistry = loadValidatedRegistry(repoRoot, agentic.roleRegistryPath, ROLE_SCHEMA_PATH, 'role registry');
    skillRegistry = loadValidatedRegistry(repoRoot, agentic.skillRegistryPath, SKILL_SCHEMA_PATH, 'skill registry');
    adapterRegistry = loadValidatedRegistry(repoRoot, agentic.adapterRegistryPath, ADAPTER_SCHEMA_PATH, 'adapter registry');
  } catch (error) {
    issues.push(error.message);
    return {
      enabled: true,
      issues,
      handoffFiles: [],
      retrospectiveFiles: [],
      expectedAdapters: [],
    };
  }

  if (agentic.requireBoundedOwnership) {
    const overlaps = findWritableRoleOverlaps(roleRegistry);
    for (const overlap of overlaps) {
      issues.push(
        `Writable ownership overlap: ${overlap.leftRole} (${overlap.leftPath}) vs ${overlap.rightRole} (${overlap.rightPath})`
      );
    }
  }

  const handoffFiles = validateArtifactDirectory(
    repoRoot,
    agentic.handoffArtifactPath,
    HANDOFF_SCHEMA_PATH,
    'handoff artifact',
    issues
  );
  const retrospectiveFiles = validateArtifactDirectory(
    repoRoot,
    agentic.retrospectiveArtifactPath,
    RETROSPECTIVE_SCHEMA_PATH,
    'retrospective artifact',
    issues
  );

  const expectedAdapters = renderAdapterOutputs({ roleRegistry, skillRegistry, adapterRegistry });
  const actualGeneratedFiles = collectRegularFiles(repoPath(repoRoot, agentic.generatedAdapterPath))
    .map((file) => normalizeRel(path.relative(repoRoot, file)));

  for (const adapter of expectedAdapters) {
    const absOutput = repoPath(repoRoot, adapter.outputPath);
    if (!existsSync(absOutput)) {
      issues.push(`Missing generated adapter: ${adapter.outputPath}`);
      continue;
    }
    const current = unwrapManagedBlock(adapter.outputPath, readFileSync(absOutput, 'utf8'));
    if (current !== normalizeContent(adapter.content)) {
      issues.push(`Generated adapter drift: ${adapter.outputPath}`);
    }
  }

  const expectedPaths = new Set(expectedAdapters.map((adapter) => normalizeRel(adapter.outputPath)));
  for (const actual of actualGeneratedFiles) {
    if (!expectedPaths.has(actual)) {
      issues.push(`Unexpected generated adapter file: ${actual}`);
    }
  }

  return {
    enabled: true,
    issues,
    handoffFiles,
    retrospectiveFiles,
    expectedAdapters: expectedAdapters.map((adapter) => adapter.outputPath),
  };
}

export function writeAgenticAdapters({ repoRoot, config }) {
  const validation = validateAgenticArtifacts({ repoRoot, config });
  const blockingIssues = validation.issues.filter((issue) => !issue.startsWith('Generated adapter drift:') && !issue.startsWith('Missing generated adapter:') && !issue.startsWith('Unexpected generated adapter file:'));
  if (blockingIssues.length > 0) {
    throw new Error(blockingIssues.join('\n'));
  }

  const roleRegistry = loadValidatedRegistry(repoRoot, config.agentic.roleRegistryPath, ROLE_SCHEMA_PATH, 'role registry');
  const skillRegistry = loadValidatedRegistry(repoRoot, config.agentic.skillRegistryPath, SKILL_SCHEMA_PATH, 'skill registry');
  const adapterRegistry = loadValidatedRegistry(repoRoot, config.agentic.adapterRegistryPath, ADAPTER_SCHEMA_PATH, 'adapter registry');
  const outputs = renderAdapterOutputs({ roleRegistry, skillRegistry, adapterRegistry });
  for (const output of outputs) {
    const absPath = repoPath(repoRoot, output.outputPath);
    mkdirSync(path.dirname(absPath), { recursive: true });
    writeFileSync(absPath, output.content, 'utf8');
  }
  return outputs.map((output) => output.outputPath);
}

import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

/**
 * Tests for gates.mjs logic
 * Run with: node --test scripts/__tests__/gates.test.mjs
 */

describe('Secret Detection Patterns', () => {
    const placeholderRe = /\b(test|example|changeme|placeholder|dummy|redacted|xxxx|todo|your)(?:[_-][A-Za-z0-9]+)*\b/i;

    // Build patterns dynamically to avoid triggering secret scan on the test file itself
    const PKW = ['PRIV', 'ATE ', 'KEY'].join('');
    const privateKeyMarker = `-----BEGIN (RSA |EC |OPENSSH )?${PKW}-----`;
    const secretAssignmentPattern = '\\b(API_KEY|SECRET|TOKEN|PASSWORD)\\b\\s*[:=]\\s*[\'"][^\'"]{12,}[\'"]';

    // Updated patterns to match gates.mjs
    const patterns = [
        { name: 'Private key block', re: new RegExp(privateKeyMarker) },
        { name: 'High-risk secret assignment', re: new RegExp(secretAssignmentPattern, 'i') },
        { name: 'Unquoted secret assignment', re: /\b(API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|ACCESS_KEY)\b\s*[:=]\s*[^\s'"#]{12,}/i },
        { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
        { name: 'GCP service account key', re: /"private_key_id"\s*:\s*"[a-f0-9]{40}"/ },
        { name: 'GitHub token', re: /\b(ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|ghu_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36}|ghr_[a-zA-Z0-9]{36})\b/ },
        { name: 'Slack token', re: /\bxox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*\b/ },
    ];

    function buildPrivateKeyLine(type) {
        return `-----BEGIN ${type} ${PKW}-----`;
    }

    function buildHighRiskAssignment() {
        // Value includes 'example' placeholder to prevent self-detection in file scan
        const label = ['API', 'KEY'].join('_');
        const value = ['example', 'sk', 'abc123xyz789def'].join('_');
        return `${label} = "${value}"`;
    }

    // Build a "real" secret fixture for testing detection (contains no placeholder)
    function buildRealSecretForTest() {
        const label = ['API', 'KEY'].join('_');
        const value = ['sk', 'live', 'abc123xyz789def'].join('_');
        return { label, value };
    }

    function buildUnquotedSecretAssignment() {
        const value = ['sk', 'live', 'abc123xyz789def'].join('_');
        return `TOKEN = ${value}`;
    }

    function buildAwsKeyLine() {
        const key = ['AKIA', 'IOSFODNN7CX12345'].join('');
        return `${key} # example`;
    }

    function buildGcpPrivateKeyIdLine() {
        const field = ['private', 'key', 'id'].join('_');
        const value = ['1234567890abcdef', '1234567890abcdef', '12345678'].join('');
        return `"${field}": "${value}"`;
    }

    function buildGitHubTokenLine() {
        return ['ghp_', '123456789012', '345678901234', '567890123456'].join('');
    }

    function buildSlackTokenLine() {
        return ['xoxb', '123456789012', '1234567890123', 'abcdef123456'].join('-');
    }

    function detectSecrets(line) {
        const hits = [];
        for (const p of patterns) {
            if (p.re.test(line)) {
                if (p.name.includes('assignment')) {
                    // Simplified extraction for test simulation
                    // Note: This logic must mirror gates.mjs extractValue
                    let val = '';
                    const quoted = line.match(/[:=]\s*['"]([^'"]+)['"]/);
                    if (quoted) val = quoted[1];
                    else {
                        const unquoted = line.match(/[:=]\s*([^\s'"#\n]+)/);
                        if (unquoted) val = unquoted[1];
                    }
                    if (placeholderRe.test(val)) continue;
                }
                // For other patterns: NO global placeholder bypass allowed
                hits.push(p.name);
            }
        }
        return hits;
    }

    it('should detect private key blocks', () => {
        const line = buildPrivateKeyLine('RSA');
        const hits = detectSecrets(line);
        assert.deepStrictEqual(hits, ['Private key block']);
    });

    it('should detect high-risk secret assignments', () => {
        // Build value dynamically so file scan doesn't detect literal, but test can verify detection
        const { label, value } = buildRealSecretForTest();
        const line = `${label} = "${value}"`;
        const hits = detectSecrets(line);
        assert.deepStrictEqual(hits, ['High-risk secret assignment']);
    });

    it('should detect unquoted secret assignments', () => {
        const line = buildUnquotedSecretAssignment();
        const hits = detectSecrets(line);
        assert.deepStrictEqual(hits, ['Unquoted secret assignment']);
    });

    it('should NOT detect placeholder secrets', () => {
        // Explicit placeholder markers should skip detection
        const line = 'API_KEY = "EXAMPLE_KEY_1234567890"';
        const hits = detectSecrets(line);
        assert.deepStrictEqual(hits, []);
    });

    it('should NOT detect example secrets', () => {
        // Explicit placeholder markers should skip detection
        const line = 'SECRET = "YOUR_SECRET_EXAMPLE_123456789012"';
        const hits = detectSecrets(line);
        assert.deepStrictEqual(hits, []);
    });

    it('should NOT detect short secrets (less than 12 chars)', () => {
        const line = 'TOKEN = "short"';
        const hits = detectSecrets(line);
        assert.deepStrictEqual(hits, []);
    });

    it('should NOT detect placeholder in unquoted assignment value', () => {
        const line = 'TOKEN = YOUR_TOKEN_EXAMPLE_1234567890';
        const hits = detectSecrets(line);
        assert.deepStrictEqual(hits, []);
    });

    it('should detect OpenSSH private keys', () => {
        const line = buildPrivateKeyLine('OPENSSH');
        const hits = detectSecrets(line);
        assert.deepStrictEqual(hits, ['Private key block']);
    });

    it('should detect EC private keys', () => {
        const line = buildPrivateKeyLine('EC');
        const hits = detectSecrets(line);
        assert.deepStrictEqual(hits, ['Private key block']);
    });

    it('should detect AWS keys even with comment placeholders', () => {
        const line = buildAwsKeyLine();
        const hits = detectSecrets(line);
        assert.deepStrictEqual(hits, ['AWS access key']);
    });

    it('should detect GCP keys', () => {
        const line = buildGcpPrivateKeyIdLine();
        const hits = detectSecrets(line);
        assert.deepStrictEqual(hits, ['GCP service account key']);
    });

    it('should detect GitHub tokens', () => {
        const line = buildGitHubTokenLine();
        const hits = detectSecrets(line);
        assert.deepStrictEqual(hits, ['GitHub token']);
    });

    it('should detect Slack tokens', () => {
        const line = buildSlackTokenLine();
        const hits = detectSecrets(line);
        assert.deepStrictEqual(hits, ['Slack token']);
    });
});

describe('Env File Detection', () => {
    const envFileRe = /(^|\/|\\)\.env(\.|$)/;

    function isBlockedEnvFile(filename) {
        return envFileRe.test(filename) && !filename.endsWith('.env.example');
    }

    it('should block .env files', () => {
        assert.strictEqual(isBlockedEnvFile('.env'), true);
    });

    it('should block .env.local files', () => {
        assert.strictEqual(isBlockedEnvFile('.env.local'), true);
    });

    it('should block .env.production files', () => {
        assert.strictEqual(isBlockedEnvFile('.env.production'), true);
    });

    it('should NOT block .env.example files', () => {
        assert.strictEqual(isBlockedEnvFile('.env.example'), false);
    });

    it('should block nested .env files', () => {
        assert.strictEqual(isBlockedEnvFile('config/.env'), true);
    });

    it('should NOT block files that just contain env in name', () => {
        assert.strictEqual(isBlockedEnvFile('environment.js'), false);
    });
});

describe('Branch Protection Logic', () => {
    function isProtectedBranch(branch, protectedBranches) {
        return protectedBranches.includes(branch);
    }

    it('should block main branch', () => {
        assert.strictEqual(isProtectedBranch('main', ['main', 'master']), true);
    });

    it('should block master branch', () => {
        assert.strictEqual(isProtectedBranch('master', ['main', 'master']), true);
    });

    it('should allow feature branches', () => {
        assert.strictEqual(isProtectedBranch('feature/test', ['main', 'master']), false);
    });

    it('should allow develop branch by default', () => {
        assert.strictEqual(isProtectedBranch('develop', ['main', 'master']), false);
    });
});

describe('Branch Naming Policy', () => {
    const config = JSON.parse(readFileSync('governance.config.json', 'utf8'));
    const branchNamePattern = new RegExp(config.branchProtection.branchNamePattern);

    function isValidBranchName(branch) {
        if (!branch) return true;
        return branchNamePattern.test(branch);
    }

    it('allows feat prefix', () => {
        assert.strictEqual(isValidBranchName('feat/branch-policy-enforcement'), true);
    });

    it('allows fix prefix', () => {
        assert.strictEqual(isValidBranchName('fix/secret-scan-regression'), true);
    });

    it('allows hotfix prefix', () => {
        assert.strictEqual(isValidBranchName('hotfix/prod-outage-001'), true);
    });

    it('allows docs prefix', () => {
        assert.strictEqual(isValidBranchName('docs/update-readme'), true);
    });

    it('allows chore prefix', () => {
        assert.strictEqual(isValidBranchName('chore/cleanup-legacy-config'), true);
    });

    it('allows refactor prefix', () => {
        assert.strictEqual(isValidBranchName('refactor/split-governance-check'), true);
    });

    it('rejects codex prefix', () => {
        assert.strictEqual(isValidBranchName('codex/ag-gov-017-branch-policy'), false);
    });

    it('rejects unsupported prefix', () => {
        assert.strictEqual(isValidBranchName('spike/new-experiment'), false);
    });

    it('rejects missing slash pattern', () => {
        assert.strictEqual(isValidBranchName('feat'), false);
    });
});

describe('Push Refspec Parsing', () => {
    function parseRefspec(line) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
            const remoteRef = parts[2];
            const match = remoteRef.match(/^refs\/heads\/(.+)$/);
            if (match) {
                return match[1];
            }
        }
        return null;
    }

    function parseLocalRefspec(line) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 1) {
            const localRef = parts[0];
            const match = localRef.match(/^refs\/heads\/(.+)$/);
            if (match) {
                return match[1];
            }
        }
        return null;
    }

    it('should parse target branch from refspec', () => {
        const line = 'refs/heads/feature/test abc123 refs/heads/main def456';
        assert.strictEqual(parseRefspec(line), 'main');
    });

    it('should handle simple branch names', () => {
        const line = 'refs/heads/develop abc123 refs/heads/master def456';
        assert.strictEqual(parseRefspec(line), 'master');
    });

    it('should return null for invalid refspecs', () => {
        const line = 'invalid line';
        assert.strictEqual(parseRefspec(line), null);
    });

    it('should handle nested branch names', () => {
        const line = 'refs/heads/local abc123 refs/heads/feature/deploy def456';
        assert.strictEqual(parseRefspec(line), 'feature/deploy');
    });

    it('should parse local branch from refspec', () => {
        const line = 'refs/heads/feat/update-governance abc123 refs/heads/main def456';
        assert.strictEqual(parseLocalRefspec(line), 'feat/update-governance');
    });
});

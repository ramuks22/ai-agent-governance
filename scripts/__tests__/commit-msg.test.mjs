import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Tests for commit-msg.mjs logic
 * Run with: node --test scripts/__tests__/commit-msg.test.mjs
 */

describe('Tracker ID Extraction', () => {
    function normalizePattern(pattern) {
        return pattern.replace(/^\^/, '').replace(/\$$/, '');
    }

    function getTrackerIds(content, idPattern, allowedPrefixes) {
        const pattern = normalizePattern(idPattern);
        const re = new RegExp(pattern, 'g');
        const matches = content.match(re) || [];
        const ids = [...new Set(matches)];
        if (!allowedPrefixes || !allowedPrefixes.length) return ids;
        return ids.filter((id) => allowedPrefixes.includes(id.split('-')[0]));
    }

    const pattern = '^[A-Z]+-[A-Z]+-\\d{3}$'; // Anchored pattern matching config default
    const linePattern = '[A-Z]+-[A-Z]+-\\d{3}';

    it('should extract tracker IDs from content', () => {
        const content = '| AG-GOV-001 | High | Governance | Issue description |';
        const ids = getTrackerIds(content, linePattern, ['AG']);
        assert.deepStrictEqual(ids, ['AG-GOV-001']);
    });

    it('should extract multiple unique IDs', () => {
        const content = 'AG-GOV-001, AG-SEC-002, AG-GOV-001';
        const ids = getTrackerIds(content, linePattern, ['AG']);
        assert.deepStrictEqual(ids, ['AG-GOV-001', 'AG-SEC-002']);
    });

    it('should extract IDs even when pattern is anchored', () => {
        const content = 'feat: update (AG-GOV-001)';
        // Pattern with anchors should be normalized to strip them
        const anchoredPattern = '^[A-Z]+-[A-Z]+-\\d{3}$';
        const ids = getTrackerIds(content, anchoredPattern, ['AG']);
        assert.deepStrictEqual(ids, ['AG-GOV-001']);
    });

    it('should filter by allowed prefixes', () => {
        const content = 'AG-GOV-001, XX-SEC-002';
        const ids = getTrackerIds(content, linePattern, ['AG']);
        assert.deepStrictEqual(ids, ['AG-GOV-001']);
    });

    it('should return all IDs when no prefix filter', () => {
        const content = 'AG-GOV-001, XX-SEC-002';
        const ids = getTrackerIds(content, linePattern, []);
        assert.deepStrictEqual(ids, ['AG-GOV-001', 'XX-SEC-002']);
    });

    it('should return empty array when no matches', () => {
        const content = 'No tracker IDs here';
        const ids = getTrackerIds(content, linePattern, ['AG']);
        assert.deepStrictEqual(ids, []);
    });
});

describe('Commit Message Validation', () => {
    function normalizePattern(pattern) {
        return pattern.replace(/^\^/, '').replace(/\$$/, '');
    }

    function containsTrackerId(text, trackerIds, idPattern) {
        if (trackerIds.length) {
            return trackerIds.some((id) => text.includes(id));
        }
        const pattern = normalizePattern(idPattern);
        const fallbackRe = new RegExp(pattern);
        return fallbackRe.test(text);
    }

    const pattern = '[A-Z]+-[A-Z]+-\\d{3}';
    const trackerIds = ['AG-GOV-001', 'AG-SEC-002'];

    it('should validate commit with tracker ID', () => {
        const message = 'feat: implement login AG-GOV-001';
        assert.strictEqual(containsTrackerId(message, trackerIds, pattern), true);
    });

    it('should reject commit without tracker ID', () => {
        const message = 'feat: implement login';
        assert.strictEqual(containsTrackerId(message, trackerIds, pattern), false);
    });

    it('should validate with fallback pattern when no known IDs', () => {
        const message = 'feat: implement XX-YY-123';
        assert.strictEqual(containsTrackerId(message, [], pattern), true);
    });

    it('should reject invalid ID format with fallback', () => {
        const message = 'feat: implement XX-123';
        assert.strictEqual(containsTrackerId(message, [], pattern), false);
    });
});

describe('NO-TRACK Bypass', () => {
    function hasNoTrackBypass(message) {
        return message.includes('[NO-TRACK]');
    }

    it('should detect [NO-TRACK] bypass', () => {
        const message = 'chore: update deps [NO-TRACK]';
        assert.strictEqual(hasNoTrackBypass(message), true);
    });

    it('should not trigger on similar text', () => {
        const message = 'chore: update deps NO-TRACK';
        assert.strictEqual(hasNoTrackBypass(message), false);
    });

    it('should work at start of message', () => {
        const message = '[NO-TRACK] chore: update deps';
        assert.strictEqual(hasNoTrackBypass(message), true);
    });
});

describe('Branch Name Fallback', () => {
    function getBranchTrackerId(branchName, idPattern) {
        const re = new RegExp(idPattern);
        const match = branchName.match(re);
        return match ? match[0] : null;
    }

    const pattern = '[A-Z]+-[A-Z]+-\\d{3}';

    it('should extract ID from branch name', () => {
        const branch = 'feature/AG-GOV-001-implement-login';
        assert.strictEqual(getBranchTrackerId(branch, pattern), 'AG-GOV-001');
    });

    it('should return null for branches without ID', () => {
        const branch = 'feature/implement-login';
        assert.strictEqual(getBranchTrackerId(branch, pattern), null);
    });

    it('should handle ID at end of branch name', () => {
        const branch = 'fix-AG-SEC-002';
        assert.strictEqual(getBranchTrackerId(branch, pattern), 'AG-SEC-002');
    });
});

import { describe, expect, it } from 'vitest';
import { generateRunId, parseRepo } from '../util.js';

describe('parseRepo', () => {
  it('parses an explicit owner/repo string', () => {
    expect(parseRepo('computesdk/benchmark-fibonacci-ci')).toEqual({
      owner: 'computesdk',
      repo: 'benchmark-fibonacci-ci',
    });
  });

  it('rejects a string without an owner', () => {
    expect(() => parseRepo('benchmark-fibonacci-ci')).toThrow(/Invalid repo/);
  });

  it('rejects a string with too many slashes', () => {
    expect(() => parseRepo('computesdk/benchmark/fibonacci')).toThrow(/Invalid repo/);
  });
});

describe('generateRunId', () => {
  it('returns a unique string with the given prefix', () => {
    const id = generateRunId('chain');
    expect(id.startsWith('chain-')).toBe(true);
    expect(id).not.toEqual(generateRunId('chain'));
  });
});

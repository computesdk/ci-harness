import { randomUUID } from 'node:crypto';
import { CiHarnessError } from './errors.js';

/**
 * Split an `owner/repo` string. Falls back to `GITHUB_REPO` when no explicit
 * value is supplied.
 */
export function parseRepo(repo?: string): { owner: string; repo: string } {
  const value = repo ?? process.env.GITHUB_REPO;
  if (!value) {
    throw new CiHarnessError('GITHUB_REPO is required', { code: 'missing_repo' });
  }
  const parts = value.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new CiHarnessError(`Invalid repo "${value}": expected owner/repo`, { code: 'invalid_repo' });
  }
  return { owner: parts[0], repo: parts[1] };
}

/** Generate a unique identifier for a run / artifact chain. */
export function generateRunId(prefix = 'run'): string {
  return `${prefix}-${randomUUID()}`;
}

/** Pause for `ms`, optionally aborting when the signal fires. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (!signal) return;
    const abort = () => {
      clearTimeout(timer);
      reject(new CiHarnessError('Aborted', { code: 'aborted' }));
    };
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
  });
}

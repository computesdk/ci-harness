export class CiHarnessError extends Error {
  readonly code?: string;
  readonly cause?: unknown;

  constructor(message: string, opts?: { code?: string; cause?: unknown }) {
    super(message);
    this.name = 'CiHarnessError';
    this.code = opts?.code;
    this.cause = opts?.cause;
  }
}

import { describe, expect, it, vi } from 'vitest';
import { dispatchWorkflow } from '../github.js';

describe('dispatchWorkflow', () => {
  it('injects the runs-on label into the workflow inputs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => '',
    } as unknown as Response);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await dispatchWorkflow({
      owner: 'computesdk',
      repo: 'benchmark-fibonacci-ci',
      workflowId: 'fibonacci.yml',
      ref: 'main',
      token: 'ghp_test',
      runsOn: 'depot-ubuntu-24.04',
      inputs: { n: '3', a: '1', b: '1', depth: '20' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer ghp_test',
    });

    const body = JSON.parse(init.body as string);
    expect(body.ref).toBe('main');
    expect(body.inputs).toEqual({
      'runs-on': 'depot-ubuntu-24.04',
      n: '3',
      a: '1',
      b: '1',
      depth: '20',
    });
  });

  it('throws a CiHarnessError when GitHub returns an error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    } as unknown as Response);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      dispatchWorkflow({
        owner: 'computesdk',
        repo: 'benchmark-fibonacci-ci',
        workflowId: 'missing.yml',
        ref: 'main',
        token: 'ghp_test',
        runsOn: 'ubuntu-24.04',
      }),
    ).rejects.toThrow(/404/);
  });
});

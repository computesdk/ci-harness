import { CiHarnessError } from './errors.js';
import { sleep } from './util.js';

const GITHUB_API_VERSION = '2022-11-28';

/** A workflow run as observed while polling. */
export interface WorkflowRun {
  id: string;
  status: string;
  conclusion: string | null;
  createdAt: string;
  updatedAt: string;
  runStartedAt?: string;
}

interface ListRunsResponse {
  workflow_runs?: Array<{
    id: number;
    status: string;
    conclusion: string | null;
    created_at: string;
    updated_at: string;
    run_started_at?: string;
  }>;
}

export interface GitHubFetchOptions {
  path: string;
  token: string;
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  accept?: string;
}

/**
 * Thin wrapper over the GitHub REST API. Returns parsed JSON for 2xx/empty
 * 204 responses and throws `CiHarnessError` for non-2xx status codes.
 */
export async function githubFetch<T>(options: GitHubFetchOptions): Promise<T> {
  const { path, token, method = 'GET', body, signal, accept = 'application/vnd.github+json' } = options;
  const url = `https://api.github.com${path}`;
  const headers: Record<string, string> = {
    Accept: accept,
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    throw new CiHarnessError(`GitHub API request failed: ${method} ${path}`, { code: 'github_network_error', cause: error });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new CiHarnessError(`${method} ${path}: ${response.status} ${text.slice(0, 200)}`, {
      code: 'github_api_error',
    });
  }

  if (response.status === 204) {
    return null as T;
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new CiHarnessError(`Failed to parse GitHub API response: ${method} ${path}`, { code: 'github_parse_error', cause: error });
  }
}

export interface DispatchWorkflowOptions {
  owner: string;
  repo: string;
  workflowId: string;
  ref: string;
  token: string;
  runsOn: string;
  inputs?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Trigger a `workflow_dispatch` event, injecting `inputs["runs-on"]` from the
 * participant's `runsOn` label.
 */
export async function dispatchWorkflow(options: DispatchWorkflowOptions): Promise<void> {
  const { owner, repo, workflowId, ref, token, runsOn, inputs = {}, signal } = options;
  const body = {
    ref,
    inputs: {
      'runs-on': runsOn,
      ...inputs,
    },
  };
  await githubFetch({
    path: `/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflowId)}/dispatches`,
    token,
    method: 'POST',
    body,
    signal,
  });
}

export interface ListWorkflowRunsOptions {
  owner: string;
  repo: string;
  workflowId: string;
  token: string;
  branch?: string;
  perPage?: number;
  signal?: AbortSignal;
}

/** List recent runs for a workflow file (e.g. `fibonacci.yml`). */
export async function listWorkflowRuns(options: ListWorkflowRunsOptions): Promise<WorkflowRun[]> {
  const { owner, repo, workflowId, token, branch, perPage = 100, signal } = options;
  let path = `/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflowId)}/runs?per_page=${perPage}`;
  if (branch) {
    path += `&branch=${encodeURIComponent(branch)}`;
  }
  const data = await githubFetch<ListRunsResponse>({ path, token, signal });
  return (data.workflow_runs ?? []).map((run) => ({
    id: String(run.id),
    status: run.status,
    conclusion: run.conclusion,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    runStartedAt: run.run_started_at,
  }));
}

export interface PollForWorkflowCompletionOptions {
  owner: string;
  repo: string;
  workflowId: string;
  token: string;
  /** Set of run IDs that existed before the benchmark invocation started. */
  before: Set<string>;
  /** Total number of new runs expected to be created. */
  expectedRuns: number;
  pollMs?: number;
  timeoutMs?: number;
  branch?: string;
  signal?: AbortSignal;
}

/**
 * Poll a workflow until `expectedRuns` new runs have been created and all of
 * them have completed. Fails fast if any new run fails or is cancelled.
 */
export async function pollForWorkflowCompletion(options: PollForWorkflowCompletionOptions): Promise<WorkflowRun[]> {
  const {
    owner,
    repo,
    workflowId,
    token,
    before,
    expectedRuns,
    pollMs = 1000,
    timeoutMs = 30 * 60 * 1000,
    branch,
    signal,
  } = options;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const runs = await listWorkflowRuns({ owner, repo, workflowId, token, branch, signal });
    const newRuns = runs.filter((run) => !before.has(run.id));

    const failed = newRuns.filter((run) => run.status === 'completed' && run.conclusion !== 'success');
    if (failed.length > 0) {
      throw new CiHarnessError(`Workflow run(s) failed: ${failed.map((r) => r.id).join(', ')}`, {
        code: 'workflow_failed',
      });
    }

    if (newRuns.length >= expectedRuns && newRuns.every((run) => run.status === 'completed')) {
      return newRuns;
    }

    if (Date.now() > deadline) {
      throw new CiHarnessError(`Timeout waiting for ${workflowId} to complete`, { code: 'workflow_timeout' });
    }

    await sleep(pollMs, signal);
  }
}

export interface GetWorkflowRunOptions {
  owner: string;
  repo: string;
  runId: string;
  token: string;
  signal?: AbortSignal;
}

/** Fetch a single workflow run by ID. */
export async function getWorkflowRun(options: GetWorkflowRunOptions): Promise<WorkflowRun> {
  const { owner, repo, runId, token, signal } = options;
  const data = await githubFetch<{
    id: number;
    status: string;
    conclusion: string | null;
    created_at: string;
    updated_at: string;
    run_started_at?: string;
  }>({ path: `/repos/${owner}/${repo}/actions/runs/${runId}`, token, signal });
  return {
    id: String(data.id),
    status: data.status,
    conclusion: data.conclusion,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    runStartedAt: data.run_started_at,
  };
}

import { CiHarnessError } from './errors.js';
import { githubFetch } from './github.js';
import { sleep } from './util.js';

/** A GitHub Actions artifact record. */
export interface Artifact {
  id: string;
  name: string;
  size?: number;
}

interface ListArtifactsResponse {
  artifacts?: Array<{
    id: number;
    name: string;
    size_in_bytes?: number;
  }>;
}

export interface ListArtifactsOptions {
  owner: string;
  repo: string;
  token: string;
  name?: string;
  perPage?: number;
  signal?: AbortSignal;
}

/** List artifacts in a repository, optionally filtered by name. */
export async function listArtifacts(options: ListArtifactsOptions): Promise<Artifact[]> {
  const { owner, repo, token, name, perPage = 100, signal } = options;
  let path = `/repos/${owner}/${repo}/actions/artifacts?per_page=${perPage}`;
  if (name) {
    path += `&name=${encodeURIComponent(name)}`;
  }
  const data = await githubFetch<ListArtifactsResponse>({ path, token, signal });
  return (data.artifacts ?? []).map((artifact) => ({
    id: String(artifact.id),
    name: artifact.name,
    size: artifact.size_in_bytes,
  }));
}

/** Find the most recent artifact with a given name, if any. */
export async function findArtifact(options: ListArtifactsOptions): Promise<Artifact | undefined> {
  const artifacts = await listArtifacts(options);
  return artifacts.find((a) => a.name === options.name);
}

export interface WaitForArtifactOptions extends ListArtifactsOptions {
  pollMs?: number;
  timeoutMs?: number;
}

/**
 * Poll until an artifact with the given name exists. Useful for confirming a
 * concurrent workflow has uploaded its predecessor result.
 */
export async function waitForArtifact(options: WaitForArtifactOptions): Promise<Artifact> {
  const { pollMs = 2000, timeoutMs = 10 * 60 * 1000, signal, ...listOptions } = options;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const artifact = await findArtifact(listOptions);
    if (artifact) return artifact;

    if (Date.now() > deadline) {
      throw new CiHarnessError(`Timeout waiting for artifact "${listOptions.name}"`, { code: 'artifact_timeout' });
    }

    await sleep(pollMs, signal);
  }
}

export interface DownloadArtifactOptions {
  owner: string;
  repo: string;
  token: string;
  artifactId: string;
  signal?: AbortSignal;
}

/**
 * Download an artifact's zip archive. Returns the raw `ArrayBuffer`.
 *
 * The GitHub API redirects to a signed URL; this helper follows that redirect
 * without forwarding the authorization header.
 */
export async function downloadArtifact(options: DownloadArtifactOptions): Promise<ArrayBuffer> {
  const { owner, repo, token, artifactId, signal } = options;
  const path = `/repos/${owner}/${repo}/actions/artifacts/${artifactId}/zip`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };

  let response: Response;
  try {
    response = await fetch(`https://api.github.com${path}`, { headers, redirect: 'manual', signal });
  } catch (error) {
    throw new CiHarnessError(`Artifact download request failed`, { code: 'artifact_network_error', cause: error });
  }

  if (response.status === 302 || response.status === 307) {
    const location = response.headers.get('location');
    if (!location) {
      throw new CiHarnessError('Artifact download redirect missing Location header', { code: 'artifact_redirect_error' });
    }
    try {
      response = await fetch(location, { signal });
    } catch (error) {
      throw new CiHarnessError('Artifact download redirect failed', { code: 'artifact_network_error', cause: error });
    }
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new CiHarnessError(`Artifact download failed: ${response.status} ${text.slice(0, 200)}`, {
      code: 'artifact_download_error',
    });
  }

  return response.arrayBuffer();
}

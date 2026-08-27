# `@computesdk/ci-harness`

Shared GitHub Actions orchestration helpers for ComputeSDK CI-runner benchmarks.

This package ships **raw TypeScript sources**. Consumers run their `*.bench.ts` files under [`tsx`](https://github.com/privatenumber/tsx), which transpiles these `.ts` sources on import. There is no build or npm publish step.

## Install

Add the git dependency to your benchmark repo:

```json
{
  "dependencies": {
    "@computesdk/ci-harness": "github:computesdk/ci-harness#main"
  }
}
```

Then install as usual:

```bash
pnpm install
```

To pin to a specific commit or tag instead of `#main`, use `github:computesdk/ci-harness#<tag-or-sha>`.

Because this package is consumed as raw TypeScript, the consuming benchmark must run under `tsx` (the standard `@benchsdk/runner` scaffold already does this).

## Participants

`ciProviders` lists the seven CI providers. Each provider uses the same GitHub Actions dispatch + artifact store; the only difference is the `runs-on` label.

| Provider   | `runsOn`                        | Required env vars                             |
| ---------- | ------------------------------- | --------------------------------------------- |
| `github`   | `ubuntu-24.04`                  | `GITHUB_TOKEN`, `GITHUB_REPO`                 |
| `depot`    | `depot-ubuntu-24.04`            | `GITHUB_TOKEN`, `GITHUB_REPO`, `DEPOT_ENABLED` |
| `blacksmith` | `blacksmith-2vcpu-ubuntu-2404` | `GITHUB_TOKEN`, `GITHUB_REPO`, `BLACKSMITH_ENABLED` |
| `warpbuild` | `warp-ubuntu-2404-x64-2x`      | `GITHUB_TOKEN`, `GITHUB_REPO`, `WARPBUILD_ENABLED` |
| `tenki`    | `tenki-standard-small-2c-4g`    | `GITHUB_TOKEN`, `GITHUB_REPO`, `TENKI_ENABLED` |
| `starsling` | `starsling-ubuntu-24.04-2`      | `GITHUB_TOKEN`, `GITHUB_REPO`, `STARSLING_ENABLED` |
| `namespace` | `nscloud-ubuntu-24.04-amd64-2x4` | `GITHUB_TOKEN`, `GITHUB_REPO`, `NAMESPACE_ENABLED` |

The `_ENABLED` flags let providers be committed before their runners or secrets are registered. The `@benchsdk/runner` participant filter will skip any provider whose required env vars are missing.

## API

### Core helpers

- `dispatchWorkflow({ owner, repo, workflowId, ref, token, runsOn, inputs })` — trigger a `workflow_dispatch` event, automatically injecting `inputs["runs-on"]` from the participant label.
- `listWorkflowRuns({ owner, repo, workflowId, token, branch?, perPage? })` — list recent runs for a workflow file.
- `pollForWorkflowCompletion({ owner, repo, workflowId, token, before, expectedRuns, pollMs?, timeoutMs? })` — poll until `expectedRuns` new runs have completed, failing fast on any failure.
- `getWorkflowRun({ owner, repo, runId, token })` — fetch one workflow run.

### Artifact helpers

- `listArtifacts({ owner, repo, token, name? })` — list artifacts, optionally filtered by name.
- `findArtifact(...)` — find the most recent artifact with a name.
- `waitForArtifact({ owner, repo, token, name, pollMs?, timeoutMs? })` — poll until an artifact with the given name exists.
- `downloadArtifact({ owner, repo, token, artifactId })` — download the artifact zip as an `ArrayBuffer`.

### Utilities

- `parseRepo(repo?)` — parse `owner/repo` (falls back to `GITHUB_REPO`).
- `generateRunId(prefix?)` — generate a unique run/chain ID.
- `sleep(ms, signal?)` — abort-aware sleep.

## Workflow templates

The `templates/` directory contains parameterized Fibonacci-step workflows. Copy them into the repo whose runners are being benchmarked (e.g. `computesdk/benchmark-fibonacci-ci/.github/workflows/`):

- `templates/fibonacci.yml` — sequential dispatch, each run computes and dispatches the next.
- `templates/fibonacci-concurrent.yml` — all runs dispatched upfront; each waits for its predecessor's artifact.

Both workflows read the `runs-on` input from the benchmark harness so the same workflow file works for every provider.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
```

No build step is required; `typecheck` runs `tsc --noEmit` against the raw TypeScript sources.

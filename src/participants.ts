import type { CiRunnerParticipant } from './types.js';

/**
 * All target CI providers for the Fibonacci CI benchmark.
 *
 * Each provider uses the same GitHub Actions dispatch + artifact store; the
 * only per-provider difference is the `runs-on` label. Optional `_ENABLED` env
 * vars let providers be committed before their runners/secrets are registered.
 *
 * Labels mirror the blog's 2 vCPU / Ubuntu 24.04 setup:
 *   - github:    ubuntu-24.04
 *   - depot:     depot-ubuntu-24.04
 *   - blacksmith: blacksmith-2vcpu-ubuntu-2404
 *   - warpbuild: warp-ubuntu-2404-x64-2x
 *   - tenki:     tenki-standard-small-2c-4g
 *   - starsling: starsling-ubuntu-24.04-2
 */
export const ciProviders: CiRunnerParticipant[] = [
  {
    name: 'github',
    requiredEnvVars: ['GITHUB_TOKEN', 'GITHUB_REPO'],
    runsOn: 'ubuntu-24.04',
  },
  {
    name: 'depot',
    requiredEnvVars: ['GITHUB_TOKEN', 'GITHUB_REPO', 'DEPOT_ENABLED'],
    runsOn: 'depot-ubuntu-24.04',
  },
  {
    name: 'blacksmith',
    requiredEnvVars: ['GITHUB_TOKEN', 'GITHUB_REPO', 'BLACKSMITH_ENABLED'],
    runsOn: 'blacksmith-2vcpu-ubuntu-2404',
  },
  {
    name: 'warpbuild',
    requiredEnvVars: ['GITHUB_TOKEN', 'GITHUB_REPO', 'WARPBUILD_ENABLED'],
    runsOn: 'warp-ubuntu-2404-x64-2x',
  },
  {
    name: 'tenki',
    requiredEnvVars: ['GITHUB_TOKEN', 'GITHUB_REPO', 'TENKI_ENABLED'],
    runsOn: 'tenki-standard-small-2c-4g',
  },
  {
    name: 'starsling',
    requiredEnvVars: ['GITHUB_TOKEN', 'GITHUB_REPO', 'STARSLING_ENABLED'],
    runsOn: 'starsling-ubuntu-24.04-2',
  },
  {
    name: 'namespace',
    requiredEnvVars: ['GITHUB_TOKEN', 'GITHUB_REPO', 'NAMESPACE_ENABLED'],
    runsOn: 'nscloud-ubuntu-24.04-amd64-2x4',
  },
];

/**
 * Minimal base participant shape (matches @benchsdk/runner's BaseParticipant).
 */
export interface BaseParticipant {
  /** Participant identifier used in CLI filters and platform records. */
  name: string;
  /** Environment variables that must all be set for the runner to use this participant. */
  requiredEnvVars: string[];
}

/**
 * A CI-runner benchmark participant. The only per-provider difference is the
 * `runs-on` label that selects the runner on the shared GitHub Actions dispatch
 * mechanism.
 */
export interface CiRunnerParticipant extends BaseParticipant {
  /** GitHub Actions `runs-on` label (e.g. `ubuntu-24.04`). */
  runsOn: string;
}

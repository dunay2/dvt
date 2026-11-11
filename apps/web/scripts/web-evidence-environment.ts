/**
 * Owned concern: resolve requirements of selected browser execution before proofs start.
 * @reason GH-3853: missing dbt was detected after expensive controlled evidence.
 * @consequence Pure planning and partitions without LIVE evidence need no provider tools.
 */
import { createRequire } from 'node:module';

import type { WebCypressCommand } from '../cypress.changed';

type DbtExecutableResolver = (env: NodeJS.ProcessEnv) => string;

function resolveLiveDbt(env: NodeJS.ProcessEnv): string {
  // Load the existing runtime adapter only when selected evidence needs LIVE.
  const proof = createRequire(import.meta.url)(
    '../../../scripts/run-selected-closure-live-proof.cjs'
  ) as {
    resolveLiveProofDbtExecutable: DbtExecutableResolver;
  };
  return proof.resolveLiveProofDbtExecutable(env);
}

export function resolveWebEvidenceEnvironment(
  commands: readonly Pick<WebCypressCommand, 'capability'>[],
  env: NodeJS.ProcessEnv,
  resolveDbt: DbtExecutableResolver = resolveLiveDbt
): NodeJS.ProcessEnv {
  if (!commands.some((entry) => entry.capability !== 'controlled')) return env;
  const executable = resolveDbt(env);
  return { ...env, DVT_DBT_BIN: executable, DVT_DBT_ANALYZER_BIN: executable };
}

import { pathToFileURL } from 'node:url';

import {
  buildChangedScopeContext,
  computeWorkspaceMatrix,
  getChangedFiles,
  isPullRequestEvent,
  setGitHubOutput,
} from './scope-config.mjs';

export function buildWorkspaceMatrixOutputs(changedFiles, scopeContext = {}) {
  return computeWorkspaceMatrix(changedFiles, scopeContext);
}

export async function main() {
  const eventName = process.env.GITHUB_EVENT_NAME ?? '';

  if (!isPullRequestEvent(eventName)) {
    const { anyChanged, include } = buildWorkspaceMatrixOutputs(['.github/workflows/ci.yml']);
    setGitHubOutput('any_changed', anyChanged);
    setGitHubOutput('matrix', JSON.stringify({ include }));
    return;
  }

  const baseRef = process.env.GIT_BASE;
  const headRef = process.env.GIT_HEAD;
  const changedFiles = await getChangedFiles(baseRef, headRef);
  const scopeContext = await buildChangedScopeContext(changedFiles, { baseRef, headRef });
  const { anyChanged, include } = buildWorkspaceMatrixOutputs(changedFiles, scopeContext);

  setGitHubOutput('any_changed', anyChanged);
  setGitHubOutput('matrix', JSON.stringify({ include }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

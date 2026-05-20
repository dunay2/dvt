import { pathToFileURL } from 'node:url';

import {
  buildChangedScopeContext,
  computeTestPackageMatrix,
  getChangedFiles,
  isPullRequestEvent,
  setGitHubOutput,
} from './scope-config.mjs';

export function buildTestMatrixOutputs(changedFiles, scopeContext = {}) {
  return computeTestPackageMatrix(changedFiles, scopeContext);
}

export async function main() {
  const eventName = process.env.GITHUB_EVENT_NAME ?? '';

  if (!isPullRequestEvent(eventName)) {
    const { anyTests, include } = buildTestMatrixOutputs(['.github/workflows/test.yml']);
    setGitHubOutput('any_tests', anyTests);
    setGitHubOutput('matrix', JSON.stringify({ include }));
    return;
  }

  const baseRef = process.env.GIT_BASE;
  const headRef = process.env.GIT_HEAD;
  const changedFiles = await getChangedFiles(baseRef, headRef);
  const scopeContext = await buildChangedScopeContext(changedFiles, { baseRef, headRef });
  const { anyTests, include } = buildTestMatrixOutputs(changedFiles, scopeContext);

  setGitHubOutput('any_tests', anyTests);
  setGitHubOutput('matrix', JSON.stringify({ include }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

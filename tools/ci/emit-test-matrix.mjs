import { pathToFileURL } from 'node:url';

import {
  TEST_PACKAGE_ENTRIES,
  buildChangedScopeContext,
  computeTestPackageMatrix,
  getChangedFiles,
  isPullRequestEvent,
  setGitHubOutput,
} from './scope-config.mjs';

export function buildTestMatrixOutputs(changedFiles, scopeContext = {}) {
  return computeTestPackageMatrix(changedFiles, scopeContext);
}

export function buildNonPullRequestTestMatrixOutputs() {
  return {
    anyTests: true,
    include: TEST_PACKAGE_ENTRIES,
  };
}

export async function main() {
  const eventName = process.env.GITHUB_EVENT_NAME ?? '';

  if (!isPullRequestEvent(eventName)) {
    const { anyTests, include } = buildNonPullRequestTestMatrixOutputs();
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

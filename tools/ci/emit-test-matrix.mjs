import { pathToFileURL } from 'node:url';

import {
  TEST_PACKAGE_ENTRIES,
  buildChangedScopeContext,
  computeTestPackageMatrix,
  getChangedFiles,
  isPullRequestEvent,
  setGitHubOutput,
} from './scope-config.mjs';

function groupPackageTests(entries) {
  const api = entries.filter(({ pkg }) => pkg === 'dvt-api');
  const packages = entries.filter(({ pkg }) => pkg !== 'dvt-api');
  for (const entry of packages) {
    if (entry.command !== `pnpm --filter ${entry.pkg} test`) {
      throw new Error(`Unsupported shared package test command: ${entry.command}`);
    }
  }
  const include = [
    { name: 'api', entries: api },
    { name: 'packages', entries: packages },
  ]
    .filter((group) => group.entries.length > 0)
    .map((group) => {
      const packages = group.entries.map(({ pkg }) => pkg);
      const buildFilters = packages.map((pkg) => `--filter=${pkg}`).join(' ');
      return {
        name: group.name,
        packages,
        buildFilters,
        command:
          group.name === 'api'
            ? group.entries[0].command
            : `pnpm --recursive --no-bail --workspace-concurrency=1 --sort --fail-if-no-match ${buildFilters} exec pnpm run test`,
      };
    });
  return { anyTests: include.length > 0, include };
}

export function buildTestMatrixOutputs(changedFiles, scopeContext = {}) {
  return groupPackageTests(computeTestPackageMatrix(changedFiles, scopeContext).include);
}

export function buildNonPullRequestTestMatrixOutputs() {
  return groupPackageTests(TEST_PACKAGE_ENTRIES);
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

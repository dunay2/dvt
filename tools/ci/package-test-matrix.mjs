import { TEST_PACKAGE_ENTRIES, computeTestPackageMatrix } from './scope-config.mjs';

function groupPackageTests(entries) {
  const api = entries.filter(({ pkg }) => pkg === 'dvt-api');
  const packages = entries.filter(({ pkg }) => pkg !== 'dvt-api');
  const catalog = TEST_PACKAGE_ENTRIES.filter(({ pkg }) => pkg !== 'dvt-api');
  for (const entry of packages) {
    if (entry.command !== `pnpm --filter ${entry.pkg} test`) {
      throw new Error(`Unsupported shared package test command: ${entry.command}`);
    }
  }
  const include = [
    { name: 'api', entries: api },
    ...[0, 1].map((bucket) => ({
      name: `packages-${bucket + 1}`,
      entries: packages.filter(
        ({ pkg }) => catalog.findIndex((entry) => entry.pkg === pkg) % 2 === bucket
      ),
    })),
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

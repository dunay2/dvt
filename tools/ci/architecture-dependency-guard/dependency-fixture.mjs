/** Owned concern: acquire one real dependency report from one isolated fixture lifecycle. */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runDependencyCruiseReport } from '../architecture-dependency-acquisition.mjs';
import {
  createFixtureRoot,
  removeFixtureRoot,
  writeFixtureFiles,
  writeTsConfig,
} from './fixture-files.mjs';

export const DEPCRUISE_CONFIG = resolve('.dependency-cruiser.cjs');
const targets = ['apps', 'packages', 'tools'];

export function createDependencyFixture(files) {
  const root = createFixtureRoot('dvt-architecture-deps-');
  try {
    for (const target of targets) mkdirSync(join(root, target), { recursive: true });
    writeTsConfig(root);
    writeFixtureFiles(root, files);
    return root;
  } catch (error) {
    removeFixtureRoot(root);
    throw error;
  }
}

export async function collectDependencyViolations(files) {
  const root = createDependencyFixture(files);
  try {
    const report = await runDependencyCruiseReport(root, {
      configFile: DEPCRUISE_CONFIG,
      targets,
    });
    return report.summary.violations.map((violation) => violation.rule.name);
  } finally {
    removeFixtureRoot(root);
  }
}

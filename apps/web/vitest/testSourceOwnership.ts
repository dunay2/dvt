/** Owned concern: admit canonical declared test-source paths and unambiguous owner cohorts. */
import { normalizeWebVitestPath, isArchitectureTestPath } from './paths';

function isCanonicalTestSourcePath(candidate: string): boolean {
  return (
    candidate === normalizeWebVitestPath(candidate) &&
    candidate.startsWith('src/') &&
    !candidate.includes('\0') &&
    !candidate.split('/').some((part) => ['', '.', '..'].includes(part)) &&
    !/[\\:*?[\]{}#\s]/u.test(candidate)
  );
}

function isDeclaredTestSourceKind(candidate: string, owner: boolean): boolean {
  if (owner) return isArchitectureTestPath(candidate);
  return /\.tsx?$/.test(candidate) && !/\.(?:test|spec)\.tsx?$/.test(candidate);
}

function parseTestSourcePath(candidate: unknown, owner: boolean): string {
  if (typeof candidate !== 'string') throw new Error('Invalid test-source ownership path');
  if (!isCanonicalTestSourcePath(candidate)) throw new Error('Invalid test-source ownership path');
  if (!isDeclaredTestSourceKind(candidate, owner))
    throw new Error('Invalid test-source ownership path');
  return candidate;
}

function readTestSourceOwnershipPaths(value: unknown, owner: boolean): string[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('Empty test-source ownership');
  const result: string[] = [];
  for (const candidate of value) {
    const path = parseTestSourcePath(candidate, owner);
    if (result.includes(path)) throw new Error('Duplicate test-source ownership path');
    result.push(path);
  }
  return result;
}

function readTestSourceCohort(item: unknown): { entries: unknown; helpers: unknown } {
  if (item === null || typeof item !== 'object')
    throw new Error('Invalid test-source ownership cohort');
  if (!('entries' in item) || !('helpers' in item))
    throw new Error('Invalid test-source ownership cohort');
  return item;
}

export function collectTestSourceOwnership(catalog: readonly unknown[]): {
  entries: Set<string>;
  helpers: Map<string, readonly string[]>;
} {
  const helpers = new Map<string, readonly string[]>();
  const entries = new Set<string>();
  for (const item of catalog) {
    const cohort = readTestSourceCohort(item);
    const owners = readTestSourceOwnershipPaths(cohort.entries, true);
    owners.forEach((owner) => entries.add(owner));
    for (const helper of readTestSourceOwnershipPaths(cohort.helpers, false)) {
      if (helpers.has(helper)) throw new Error('Ambiguous test-source ownership');
      helpers.set(helper, owners);
    }
  }
  if ([...entries].some((entry) => helpers.has(entry)))
    throw new Error('Test-source owner overlaps helper');
  return { entries, helpers };
}

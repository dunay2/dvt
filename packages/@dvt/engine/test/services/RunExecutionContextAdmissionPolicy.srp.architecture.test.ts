import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SERVICES_TEST_ROOT = fileURLToPath(new URL('.', import.meta.url));

const EXPECTED_SUITES = [
  'RunExecutionContextAdmissionPolicy.acceptance.test.ts',
  'RunExecutionContextAdmissionPolicy.plugin-requirements.test.ts',
  'RunExecutionContextAdmissionPolicy.provenance.test.ts',
  'RunExecutionContextAdmissionPolicy.compatibility.test.ts',
] as const;

const SHARED_FIXTURE_FILE = 'runExecutionContextAdmissionPolicy.fixtures.ts';
const LEGACY_MONOLITH = 'RunExecutionContextAdmissionPolicy.test.ts';

describe('RunExecutionContextAdmissionPolicy test suite architecture', () => {
  it('keeps admission behavior covered by responsibility-specific suites', () => {
    expect(fileExists(SHARED_FIXTURE_FILE)).toBe(true);
    expect(fileExists(LEGACY_MONOLITH)).toBe(false);

    for (const fileName of EXPECTED_SUITES) {
      expect(fileExists(fileName)).toBe(true);
    }
  });

  it('keeps fixture builders centralized instead of repeated in behavior suites', () => {
    const fixtureSource = readTestFile(SHARED_FIXTURE_FILE);
    expect(fixtureSource).toContain('export function makePlan');
    expect(fixtureSource).toContain('export function makeContext');
    expect(fixtureSource).toContain('export function makeRunExecutionContext');
    expect(fixtureSource).toContain('export function createExampleBindingPolicy');

    for (const fileName of EXPECTED_SUITES) {
      const source = readTestFile(fileName);
      expect(source).not.toMatch(/^function makePlan/m);
      expect(source).not.toMatch(/^function makeContext/m);
      expect(source).not.toMatch(/^function makeRunExecutionContext/m);
      expect(source).not.toMatch(/^function createExampleBindingPolicy/m);
    }
  });

  it('keeps each behavior suite narrow enough to scan as one concern', () => {
    for (const fileName of EXPECTED_SUITES) {
      const lineCount = readTestFile(fileName).split(/\r?\n/u).length;
      expect(lineCount, fileName).toBeLessThanOrEqual(180);
    }
  });
});

function fileExists(fileName: string): boolean {
  return existsSync(join(SERVICES_TEST_ROOT, fileName));
}

function readTestFile(fileName: string): string {
  return readFileSync(join(SERVICES_TEST_ROOT, fileName), 'utf8');
}

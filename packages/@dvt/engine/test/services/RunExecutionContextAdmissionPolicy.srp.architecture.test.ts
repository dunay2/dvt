import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SERVICES_TEST_ROOT = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = join(SERVICES_TEST_ROOT, '../../../../..');
const ENGINE_SRC_ROOT = join(SERVICES_TEST_ROOT, '../../src');
const ADMISSION_COMPONENT_GUIDE = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture/run-execution-context-admission-policy-component.md'
);
const START_RUN_PROTOCOL_DOC = join(
  REPO_ROOT,
  'docs/architecture/components/engine/contracts/engine/StartRunProtocol.v1.md'
);

const EXPECTED_SUITES = [
  'RunExecutionContextAdmissionPolicy.acceptance.test.ts',
  'RunExecutionContextAdmissionPolicy.plugin-requirements.test.ts',
  'RunExecutionContextAdmissionPolicy.provenance.test.ts',
  'RunExecutionContextAdmissionPolicy.compatibility.test.ts',
] as const;

const SHARED_FIXTURE_FILE = 'runExecutionContextAdmissionPolicy.fixtures.ts';
const LEGACY_MONOLITH = 'RunExecutionContextAdmissionPolicy.test.ts';
const GENERIC_ERROR_CONSTRUCTOR = 'new ' + 'Error(';

const EXPECTED_SOURCE_OWNED_CONCERNS = new Map<string, string>([
  [
    'services/startRun/RunExecutionContextAdmissionPolicy.ts',
    '@ownedConcern Enforce generic run-execution-context admission without owning executor plugin semantics.',
  ],
  [
    'ports/IRunExecutionContextResolver.ts',
    '@ownedConcern Define the engine port for resolving run-execution-context payloads at admission time.',
  ],
  [
    'ports/IRunExecutionContextBindingPolicy.ts',
    '@ownedConcern Define plugin-owned run-execution-context admission requirements for the engine boundary.',
  ],
]);

const EXPECTED_TEST_OWNED_CONCERNS = new Map<string, string>([
  [
    SHARED_FIXTURE_FILE,
    'Owned concern: provide canonical admission-policy fixtures and semantic plugin-binding test helpers.',
  ],
  [
    'RunExecutionContextAdmissionPolicy.acceptance.test.ts',
    'Owned concern: verify admission-policy happy paths and non-plugin fallback behavior.',
  ],
  [
    'RunExecutionContextAdmissionPolicy.plugin-requirements.test.ts',
    'Owned concern: verify generic plugin requirement admission without DBT-specific semantics.',
  ],
  [
    'RunExecutionContextAdmissionPolicy.provenance.test.ts',
    'Owned concern: verify resolved run-execution-context provenance alignment.',
  ],
  [
    'RunExecutionContextAdmissionPolicy.compatibility.test.ts',
    'Owned concern: verify plugin compatibility fingerprint admission semantics.',
  ],
]);

describe('RunExecutionContextAdmissionPolicy test suite architecture', () => {
  it('declares semantic ownership for the admission policy behavior modules', () => {
    for (const [relativePath, expectedOwnedConcern] of EXPECTED_SOURCE_OWNED_CONCERNS.entries()) {
      expect(readEngineSource(relativePath), relativePath).toContain(expectedOwnedConcern);
    }

    for (const [fileName, expectedOwnedConcern] of EXPECTED_TEST_OWNED_CONCERNS.entries()) {
      expect(readTestFile(fileName), fileName).toContain(expectedOwnedConcern);
    }
  });

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

  it('uses specific error types for local fixture type-check failures', () => {
    for (const fileName of [SHARED_FIXTURE_FILE, ...EXPECTED_SUITES]) {
      expect(readTestFile(fileName), fileName).not.toContain(GENERIC_ERROR_CONSTRUCTOR);
    }
  });

  it('documents admission semantics with public API, invariants, transitions, consumers, and diagrams', () => {
    expect(existsSync(ADMISSION_COMPONENT_GUIDE)).toBe(true);

    const guide = readFileSync(ADMISSION_COMPONENT_GUIDE, 'utf8');
    for (const heading of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## User Stories',
      '## Diagrams',
      '## Drift Guards',
    ]) {
      expect(guide).toContain(heading);
    }

    expect(guide).toContain('RunExecutionContextAdmissionPolicy.assertAllowed');
    expect(guide).toContain('IRunExecutionContextBindingPolicy');
    expect(guide).toContain('plugin-bearing plan');
    expect(guide).toContain('EXAMPLE_PLUGIN_STEP_KINDS');
    expect(guide).toContain('SQL_TRANSFORM');
    expect(guide).toContain('```mermaid');
  });

  it('keeps StartRun protocol documentation generic for plugin-bearing plans', () => {
    const protocol = readFileSync(START_RUN_PROTOCOL_DOC, 'utf8');

    expect(protocol).toContain('plugin-bearing plans reject before queueing when');
    expect(protocol).toContain('resolved plugin context is missing for a required plugin');
    expect(protocol).not.toContain('DBT-bearing plans reject before queueing when');
  });
});

function fileExists(fileName: string): boolean {
  return existsSync(join(SERVICES_TEST_ROOT, fileName));
}

function readTestFile(fileName: string): string {
  return readFileSync(join(SERVICES_TEST_ROOT, fileName), 'utf8');
}

function readEngineSource(relativePath: string): string {
  return readFileSync(join(ENGINE_SRC_ROOT, relativePath), 'utf8');
}

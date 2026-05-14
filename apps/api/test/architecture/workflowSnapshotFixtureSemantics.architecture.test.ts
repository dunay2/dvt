import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const API_TEST_ROOT = join(import.meta.dirname, '..');
const SNAPSHOT_FIXTURE_PATH = join(API_TEST_ROOT, 'fixtures/workflowSnapshotFixture.ts');
const ARCHITECTURE_TEST_PATH = join(
  API_TEST_ROOT,
  'architecture/workflowSnapshotFixtureSemantics.architecture.test.ts'
);
const SNAPSHOT_SCHEMA_IMPORT = 'CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION';
const CANONICAL_FACTORY_NAME = 'makeAdminRebuildWorkflowSnapshot';
const LEGACY_FACTORY_NAME = 'makeWorkflowSnapshot';

function collectTypeScriptTestFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const absolutePath = join(dir, entry);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      return collectTypeScriptTestFiles(absolutePath);
    }

    return absolutePath.endsWith('.ts') ? [absolutePath] : [];
  });
}

function testPath(filePath: string): string {
  return relative(join(API_TEST_ROOT, '../../..'), filePath).replace(/\\/g, '/');
}

describe('workflow snapshot fixture semantics', () => {
  it('keeps admin rebuild snapshot construction behind one current semantic fixture', () => {
    const fixtureText = readFileSync(SNAPSHOT_FIXTURE_PATH, 'utf8');

    expect(fixtureText).toMatch(/^\/\*\*\r?\n \* Owned concern:/);
    expect(fixtureText).toContain(`function ${CANONICAL_FACTORY_NAME}`);
    expect(fixtureText).not.toContain(`function ${LEGACY_FACTORY_NAME}`);
  });

  it('prevents local WorkflowSnapshot builders from bypassing the fixture owner', () => {
    const violations = collectTypeScriptTestFiles(API_TEST_ROOT)
      .filter(
        (filePath) => filePath !== SNAPSHOT_FIXTURE_PATH && filePath !== ARCHITECTURE_TEST_PATH
      )
      .flatMap((filePath) => {
        const text = readFileSync(filePath, 'utf8');
        const fileViolations: string[] = [];

        if (text.includes(SNAPSHOT_SCHEMA_IMPORT)) {
          fileViolations.push(`${testPath(filePath)} imports ${SNAPSHOT_SCHEMA_IMPORT}`);
        }

        if (text.includes(LEGACY_FACTORY_NAME)) {
          fileViolations.push(`${testPath(filePath)} uses ${LEGACY_FACTORY_NAME}`);
        }

        return fileViolations;
      });

    expect(violations).toEqual([]);
  });
});

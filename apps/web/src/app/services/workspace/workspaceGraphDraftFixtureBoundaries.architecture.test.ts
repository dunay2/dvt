import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const WORKSPACE_SERVICE_DIR = import.meta.dirname;
const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../../..');
const FIXTURE_BOUNDARY_GUIDE =
  'docs/architecture/components/web/graph/workspace-graph-draft-test-fixture-boundary-component.md';
const FIXTURE_BOUNDARY_STORIES =
  'docs/architecture/components/web/graph/workspace-graph-draft-test-fixture-boundary-user-stories.md';

const fixtureModules = [
  {
    path: 'workspaceGraphDraftAuthoring.test.fixtures.ts',
    ownedConcern:
      'Owned concern: build workspace graph authoring draft and protected record fixtures',
    forbiddenTerms: [
      'buildDraftReadOkResponse',
      'buildDraftSaveSavedResponse',
      'buildExpectedWorkspaceGraphDraftSemanticGraph',
      'buildWorkspaceGraphDraftEndpoint',
    ],
  },
  {
    path: 'workspaceGraphDraftProtocol.test.fixtures.ts',
    ownedConcern: 'Owned concern: build protected workspace graph draft protocol envelope fixtures',
    forbiddenTerms: [
      'export function buildWorkspaceGraphAuthoringDraft',
      'buildExpectedWorkspaceGraphDraftSemanticGraph',
      'buildWorkspaceGraphDraftEndpoint',
    ],
  },
  {
    path: 'workspaceGraphDraftProjectionExpected.test.fixtures.ts',
    ownedConcern: 'Owned concern: build expected workspace graph draft projection fixtures',
    forbiddenTerms: [
      'WorkspaceGraphDraftReadResponse',
      'WorkspaceGraphDraftSaveResponse',
      'buildDraftReadOkResponse',
      'buildWorkspaceGraphDraftEndpoint',
    ],
  },
] as const;

function readFixture(relativePath: string): string {
  return readFileSync(path.join(WORKSPACE_SERVICE_DIR, relativePath), 'utf8');
}

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

describe('workspace graph draft fixture boundaries', () => {
  it('keeps authoring, protocol, and projection fixtures behind separate owned concerns', () => {
    expect(
      existsSync(path.join(WORKSPACE_SERVICE_DIR, 'workspaceGraphDraft.test.fixtures.ts'))
    ).toBe(false);

    for (const fixtureModule of fixtureModules) {
      const source = readFixture(fixtureModule.path);
      expect(source.trimStart().startsWith('/** Owned concern:')).toBe(true);
      expect(source).toContain(fixtureModule.ownedConcern);

      for (const forbiddenTerm of fixtureModule.forbiddenTerms) {
        expect(source).not.toContain(forbiddenTerm);
      }
    }
  });

  it('documents fixture-boundary public API, invariants, transitions, consumers, and stories', () => {
    for (const relativePath of [FIXTURE_BOUNDARY_GUIDE, FIXTURE_BOUNDARY_STORIES]) {
      expect(existsSync(path.join(REPO_ROOT, relativePath))).toBe(true);
    }

    const guide = readRepoFile(FIXTURE_BOUNDARY_GUIDE);
    const stories = readRepoFile(FIXTURE_BOUNDARY_STORIES);

    for (const section of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Diagrams',
    ]) {
      expect(guide).toContain(section);
    }

    expect(guide).toContain('workspaceGraphDraftAuthoring.test.fixtures.ts');
    expect(guide).toContain('workspaceGraphDraftProtocol.test.fixtures.ts');
    expect(guide).toContain('workspaceGraphDraftProjectionExpected.test.fixtures.ts');
    expect(guide).toContain('```mermaid');
    expect(stories).toContain('US-WORKSPACE-FIXTURE-001');
    expect(stories).toContain('Negative scenarios');
  });
});

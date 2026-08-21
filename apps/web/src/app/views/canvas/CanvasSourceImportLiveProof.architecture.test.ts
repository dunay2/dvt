/**
 * Owned concern: guard the live Add Source proof against draft-boundary
 * shortcuts and stubbed warehouse success.
 */
import { describe, expect, it } from 'vitest';

import { readRepoFile, repoFileExists } from './canvasStartupAndDraftRecovery.architecture.support';

const CYPRESS_SPEC_PATH = 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts';
const RETIRED_STUBBED_CYPRESS_SPEC_PATH =
  'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts';
const LIVE_RUNNER_PATH = 'scripts/run-canvas-source-import-live-proof.cjs';
const LIVE_SOURCE_IMPORT_SUPPORT_PATH = 'apps/web/cypress/support/liveWarehouseSourceImport.ts';
function readPackageScripts(path: string): Record<string, string> {
  return (JSON.parse(readRepoFile(path)) as { scripts: Record<string, string> }).scripts;
}

describe('Canvas source import live proof architecture', () => {
  it('proves Add Source through the live protected runtime without draft stubs', () => {
    expect(repoFileExists(CYPRESS_SPEC_PATH)).toBe(true);
    expect(repoFileExists(RETIRED_STUBBED_CYPRESS_SPEC_PATH)).toBe(false);
    expect(repoFileExists(LIVE_RUNNER_PATH)).toBe(true);

    const cypressSpecSource = readRepoFile(CYPRESS_SPEC_PATH);
    const sourceImportSupport = readRepoFile(LIVE_SOURCE_IMPORT_SUPPORT_PATH);
    const liveInteractionSource = `${cypressSpecSource}\n${sourceImportSupport}`;
    const liveRunnerSource = readRepoFile(LIVE_RUNNER_PATH);
    const rootScripts = readPackageScripts('package.json');
    const webScripts = readPackageScripts('apps/web/package.json');

    expect(rootScripts['test:web:e2e:source-import:live']).toBe(
      'pnpm --filter @dvt/web test:e2e:source-import:live'
    );
    expect(webScripts['test:e2e:source-import:live']).toBe(
      'node ../../scripts/run-canvas-source-import-live-proof.cjs'
    );
    expect(liveRunnerSource).toContain('CYPRESS_requireLiveProtectedRuntime=1');
    expect(liveRunnerSource).toContain('canvas-source-import-live-clean.cy.ts');
    expect(liveRunnerSource).toContain("DVT_TEMPORAL_DBT_ENABLED: 'true'");

    expect(cypressSpecSource).toContain('assertLiveFirstAuthoringDraftScopeIsClean');
    expect(cypressSpecSource).toContain('readLiveGraphDraft(');
    expect(cypressSpecSource).toContain('openCanvasContextMenuAt');
    expect(cypressSpecSource).toContain("clickCanvasContextMenuAction('open-add-node-catalog')");
    expect(cypressSpecSource).toContain(
      "clickCanvasAddCatalogAction('open-source-import', 'dbt:source')"
    );
    expect(liveInteractionSource).toContain('source-import-connection-option');
    expect(liveInteractionSource).toContain('data-source-import-object');
    expect(liveInteractionSource).toContain('data-source-import-review-object');
    expect(liveInteractionSource).not.toContain('data-source-import-table');
    expect(cypressSpecSource).toContain("readLiveWorkspaceFile('models/sources/src_public.yml'");
    expect(cypressSpecSource).toContain("cy.contains('Stale version').should('not.exist')");
    expect(liveInteractionSource).toContain("cy.contains('[role=\"dialog\"]', 'Add source'");
    expect(liveInteractionSource).toContain('Attach sources to canvas');
    expect(cypressSpecSource).toContain('.react-flow__node');

    expect(liveInteractionSource).not.toContain('cy.intercept(');
    expect(liveInteractionSource).not.toContain('stubE2eApi');
    expect(liveInteractionSource).not.toContain('stubE2eJsonApi');
    expect(liveInteractionSource).not.toContain('stubCanvasDraft');
    expect(liveInteractionSource).not.toContain('seedLiveSelectedClosureDraft');
    expect(liveInteractionSource).not.toContain("method: 'PUT'");
    expect(liveInteractionSource).not.toContain('method: "PUT"');
  });
});

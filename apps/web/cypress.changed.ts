/**
 * Owned concern: admit browser evidence obligations, not Git discovery or execution.
 * @baseline GH-3540: browser changes require explicitly admitted real-runtime evidence.
 * @decision GH-3593: reuse the shared terminal runtime for Transform and its owned journeys.
 * @consequence Unknown paths fail closed; related changes still select only one browser command.
 * @version 1.0.0
 */
export function resolveWebCypressChangedPlan(
  filePaths: readonly string[],
  full = false
): { vitestFiles: string[]; commands: string[] } {
  let required = full;
  const vitestFiles: string[] = [];
  for (const filePath of filePaths) {
    const normalized = filePath.replaceAll('\\', '/').replace(/^\.\//, '');
    const webPath = normalized.replace(/^apps\/web\//, '');
    if (webPath === 'cypress/e2e/canvas/canvas-node-data-actions.cy.ts') {
      vitestFiles.push('apps/web/src/testing/vitestSuites.browserRouting.architecture.test.ts');
      required = true;
      continue;
    }
    if (
      webPath.startsWith('cypress/') ||
      (webPath.startsWith('cypress.') && webPath !== 'cypress.changed.ts')
    ) {
      if (
        ![
          'cypress/e2e/canvas/canvas-dvt-terminal-transform-preview-live.cy.ts',
          'cypress/e2e/canvas/canvas-dvt-join-preview-live.cy.ts',
          'cypress/e2e/canvas/canvas-semantic-persistence-run-live.cy.ts',
          'cypress/e2e/canvas/canvas-sql-progressive-live.cy.ts',
          'cypress/support/semanticLive/execution.ts',
          'cypress/e2e/canvas/liveRunEventRecovery.proof.ts',
          'cypress/e2e/canvas/canvasNodeDataActions.proof.ts',
          'cypress/support/relationalWorkbench/persistence.ts',
          'cypress/support/relationalWorkbench/navigation.ts',
          'cypress/support/relationalWorkbench/transformFormulaJourney.ts',
          'cypress/support/relationalWorkbench/transformTreeJourney.ts',
          'cypress/e2e/canvas/canvas-transform-stage.cy.ts',
          'cypress/e2e/canvas/canvas-relational-operation-execution.cy.ts',
          'cypress/e2e/canvas/canvas-relational-workbench-chain-persistence.cy.ts',
          'cypress/e2e/canvas/canvas-relational-workbench-cross.cy.ts',
          'cypress/e2e/canvas/canvas-relational-tree-workbench.cy.ts',
          'cypress/e2e/canvas/canvas-relational-workbench-union.cy.ts',
          'cypress/e2e/canvas/canvas-relational-workbench-removal.cy.ts',
          'cypress/e2e/canvas/canvas-relational-workbench-viewport.cy.ts',
          'cypress/e2e/canvas/canvas-sort-fetch-data-navigation.cy.ts',
          'cypress/e2e/canvas/canvas-model-chain-fields.cy.ts',
          'cypress/e2e/canvas/canvas-column-lineage-mapping.cy.ts',
        ].includes(webPath)
      ) {
        throw new Error(
          `Browser evidence is not admitted for ${filePath}; declare every affected spec and its real runtime.`
        );
      }
      required = true;
      continue;
    }
    if (
      [
        'apps/web/cypress.changed.ts',
        'cypress.changed.ts',
        'apps/web/vitest.suites.ts',
        'vitest.suites.ts',
        'apps/web/scripts/run-vitest-changed-suites.ts',
        'scripts/run-vitest-changed-suites.ts',
        '.github/workflows/test.yml',
        'scripts/run-selected-closure-live-proof.cjs',
        'scripts/run-selected-closure-cypress.cjs',
        'scripts/live-proof-process.cjs',
        'apps/api/package.json',
        'apps/api/vitest.integration.config.ts',
        'apps/api/test/integration/sourceLivePreviewPostgres.proof.ts',
      ].includes(normalized)
    )
      required = true;
    vitestFiles.push(filePath);
  }
  return { vitestFiles, commands: required ? ['pnpm run test:e2e:selected-closure:live'] : [] };
}

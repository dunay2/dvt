import {
  clickCanvasContextMenuItem,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import { getLastE2eApiCall, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  stubCanvasRuntimeApis,
  stubPreviewRunShellBootstrap,
  visitCanvasWithSettledBootstrap,
} from '../../support/test/canvasPreviewRunPersisted';

function stubWarehouseSourceImportApis(): void {
  stubE2eJsonApi('GET', '/workspace/warehouse/connections', [
    {
      id: 'local-postgres-proof',
      name: 'Local Postgres proof',
      type: 'postgres',
      database: 'RAW',
    },
  ]);
  stubE2eJsonApi('GET', /\/workspace\/warehouse\/connections\/[^/]+\/tables/, [
    {
      database: 'RAW',
      schema: 'ERP',
      table: 'ORDERS',
      rowCount: 1500,
      columns: [
        { name: 'order_id', type: 'INTEGER', nullable: false },
        { name: 'discount_code', type: 'TEXT', nullable: true },
      ],
    },
  ]);
  stubE2eJsonApi('POST', '/workspace/sources/import', {
    success: true,
    sourcesCreated: 1,
    tablesImported: 1,
    yamlFiles: ['models/sources/src_erp.yml'],
    importedNodeIds: ['src_erp_orders'],
    grouping: 'schema',
    options: {
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    },
  });
}

describe('Canvas contextual source import', () => {
  beforeEach(() => {
    stubPreviewRunShellBootstrap();
    stubCanvasRuntimeApis({
      canvasKind: 'dbt',
      emptyCanvas: true,
      title: 'Warehouse dbt',
    });
    stubWarehouseSourceImportApis();
  });

  it('opens Add Source from the canvas context menu and imports selected warehouse metadata', () => {
    visitCanvasWithSettledBootstrap();

    openCanvasContextMenuAt(520, 300);
    cy.get('[data-slot="canvas-context-menu"]').should('be.visible');
    clickCanvasContextMenuItem('Add source');

    cy.contains('[role="dialog"]', 'Add source', { timeout: 20_000 }).should('be.visible');
    cy.contains('[role="dialog"]', 'Explore governed connections').should('be.visible');
    cy.contains('[role="dialog"]', 'Project Resources').should('not.exist');
    cy.contains('[role="tab"]', 'Connections').should('have.attr', 'aria-selected', 'true');
    cy.contains('Local Postgres proof').click();

    cy.contains('[role="tab"]', 'Browse').click();
    waitForE2eApiCall(/\/workspace\/warehouse\/connections\/[^/]+\/tables/, 'GET');
    cy.get('[data-source-import-table="RAW.ERP.ORDERS"]')
      .should('be.visible')
      .and('contain.text', 'RAW.ERP.ORDERS')
      .and('contain.text', '1,500 rows')
      .and('contain.text', '2 columns')
      .and('contain.text', 'order_id')
      .and('contain.text', 'Required')
      .and('contain.text', 'discount_code')
      .and('contain.text', 'Nullable')
      .click();

    cy.contains('[role="tab"]', 'Metadata').click();
    cy.contains('[role="dialog"]', 'RAW.ERP.ORDERS').should('be.visible');
    cy.contains('[role="dialog"]', 'Source metadata').should('be.visible');
    cy.contains('[role="dialog"]', '1,500 rows').should('be.visible');
    cy.contains('[role="dialog"]', '2 columns').should('be.visible');

    cy.contains('[role="tab"]', 'Selected').click();
    cy.contains('[role="dialog"]', 'Selected sources').should('be.visible');
    cy.contains('Connection:').parent().should('contain.text', 'Local Postgres proof');
    cy.contains('Tables Selected:').parent().should('contain.text', '1');
    cy.contains('[role="dialog"]', 'RAW.ERP.ORDERS').should('be.visible');

    cy.contains('button', 'Attach sources to canvas').click();
    waitForE2eApiCall('/workspace/sources/import', 'POST');

    cy.then(() => {
      const importCall = getLastE2eApiCall('/workspace/sources/import', 'POST');
      expect(importCall?.body).to.deep.include({
        connectionId: 'local-postgres-proof',
        groupingStrategy: 'schema',
        includeColumns: true,
      });
      expect((importCall?.body as { tables?: unknown[] }).tables).to.deep.equal([
        {
          database: 'RAW',
          schema: 'ERP',
          table: 'ORDERS',
          rowCount: 1500,
          columns: [
            { name: 'order_id', type: 'INTEGER', nullable: false },
            { name: 'discount_code', type: 'TEXT', nullable: true },
          ],
        },
      ]);
    });
    cy.contains('[role="dialog"]', 'Sources attached', { timeout: 20_000 }).should('be.visible');
  });
});

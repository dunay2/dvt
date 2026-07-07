import {
  buildCanvasDraftReadResponse,
  stubCanvasDraftSave,
} from '../../support/canvasDraftAuthoring';
import {
  clickCanvasAddCatalogAction,
  clickCanvasContextMenuAction,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import {
  getLastE2eApiCall,
  getE2eApiCalls,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  stubCanvasRuntimeApis,
  stubPreviewRunShellBootstrap,
  visitCanvasWithSettledBootstrap,
} from '../../support/test/canvasPreviewRunPersisted';
import { E2E_WORKSPACE_SESSION } from '../../support/workspaceSession';

function stubWarehouseSourceImportApis(): void {
  let imported = false;

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
    {
      database: 'RAW',
      schema: 'CRM',
      table: 'CUSTOMERS',
      rowCount: 400,
      columns: [],
    },
  ]);
  stubE2eApi('GET', '/workspace/graph/draft', ({ url }) => {
    expect(Object.fromEntries(url.searchParams.entries())).to.deep.include({
      tenantId: E2E_WORKSPACE_SESSION.tenantId,
      projectId: E2E_WORKSPACE_SESSION.projectId,
      environmentId: E2E_WORKSPACE_SESSION.environmentId,
    });

    return {
      statusCode: 200,
      body: buildCanvasDraftReadResponse(E2E_WORKSPACE_SESSION, {
        canvasKind: 'dbt',
        title: 'Warehouse dbt',
        ...(imported ? { importedWarehouseSource: true } : { emptyCanvas: true }),
      }),
    };
  });
  stubE2eApi('POST', '/workspace/sources/import', () => {
    imported = true;

    return {
      body: {
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
      },
    };
  });
}

describe('Canvas contextual source import', () => {
  beforeEach(() => {
    stubPreviewRunShellBootstrap();
    stubCanvasRuntimeApis({
      canvasKind: 'dbt',
      emptyCanvas: true,
      title: 'Warehouse dbt',
      skipDraftRead: true,
      sourceImportAvailable: true,
    });
    stubWarehouseSourceImportApis();
    stubCanvasDraftSave();
  });

  it('opens Add Source from the canvas context menu and imports selected warehouse metadata', () => {
    visitCanvasWithSettledBootstrap();

    cy.contains('Project Resources').should('not.exist');
    cy.contains('Add data').should('not.exist');

    openCanvasContextMenuAt(520, 300);
    cy.get('[data-slot="canvas-context-menu"]').should('be.visible');
    clickCanvasContextMenuAction('open-add-node-catalog');
    clickCanvasAddCatalogAction('open-source-import', 'dbt:source');

    cy.contains('[role="dialog"]', 'Add source', { timeout: 20_000 }).should('be.visible');
    cy.contains('[role="dialog"]', 'Explore governed connections').should('be.visible');
    cy.contains('[role="dialog"]', 'Project Resources').should('not.exist');
    cy.contains('[role="tab"]', 'Connections').should('have.attr', 'aria-selected', 'true');
    cy.contains('Local Postgres proof').click();

    cy.contains('[role="tab"]', 'Browse').click();
    waitForE2eApiCall(/\/workspace\/warehouse\/connections\/[^/]+\/tables/, 'GET');
    cy.contains('button', 'All').should('be.visible').and('contain.text', '2');
    cy.contains('button', 'With columns').should('be.visible').and('contain.text', '1').click();
    cy.contains('[role="dialog"]', 'Showing 1 of 2 tables').should('be.visible');
    cy.get('[data-source-import-table="RAW.CRM.CUSTOMERS"]').should('not.exist');
    cy.get('[data-source-import-table="RAW.ERP.ORDERS"]')
      .scrollIntoView()
      .should('be.visible')
      .and('have.attr', 'role', 'button')
      .and(
        'have.attr',
        'aria-label',
        'Inspect source table RAW.ERP.ORDERS metadata. 1,500 rows. 2 columns.'
      )
      .and('contain.text', 'RAW.ERP.ORDERS')
      .and('contain.text', '1,500 rows')
      .and('contain.text', '2 columns')
      .and('contain.text', 'order_id')
      .and('contain.text', 'Required')
      .and('contain.text', 'discount_code')
      .and('contain.text', 'Nullable')
      .click();
    cy.get('[data-source-import-table-select="RAW.ERP.ORDERS"]')
      .should(
        'have.attr',
        'aria-label',
        'Select source table RAW.ERP.ORDERS. 1,500 rows. 2 columns.'
      )
      .click();

    cy.contains('[role="tab"]', 'Metadata').click();
    cy.contains('[role="dialog"]', 'RAW.ERP.ORDERS').should('be.visible');
    cy.contains('[role="dialog"]', 'Source metadata').should('be.visible');
    cy.contains('[role="dialog"]', '1,500 rows').should('be.visible');
    cy.contains('[role="dialog"]', '2 columns').should('be.visible');

    cy.contains('[role="tab"]', 'Selected').click();
    cy.contains('[role="dialog"]', 'Selected sources').should('be.visible');
    cy.contains('Connection:').parent().should('contain.text', 'Local Postgres proof');
    cy.contains('Tables selected:').parent().should('contain.text', '1');
    cy.contains('[role="dialog"]', 'RAW.ERP.ORDERS').should('be.visible');
    cy.contains('[role="dialog"]', 'order_id').should('be.visible');
    cy.contains('[role="dialog"]', 'INTEGER').should('be.visible');
    cy.contains('[role="dialog"]', 'Required').should('be.visible');
    cy.contains('[role="dialog"]', 'discount_code').should('be.visible');
    cy.contains('[role="dialog"]', 'TEXT').should('be.visible');
    cy.contains('[role="dialog"]', 'Nullable').should('be.visible');

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
    cy.wrap(null).should(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'GET').length).to.be.greaterThan(1);
    });
    cy.contains('[role="dialog"] button', 'Done').click();

    cy.contains('.react-flow__node', 'Raw Orders', { timeout: 20_000 })
      .should('be.visible')
      .and('contain.text', 'Rows')
      .and('contain.text', '1.5k')
      .and('contain.text', 'Size')
      .and('contain.text', '3.9 MB')
      .and('contain.text', 'Columns')
      .and('contain.text', '2');

    cy.contains('[data-slot="graph-node-card"]', 'Raw Orders').rightclick({ force: true });
    cy.contains('[role="menuitem"]', 'Open workbench').click();
    cy.get('[data-slot="canvas-node-workbench-panel"]', { timeout: 20_000 })
      .should('be.visible')
      .and('contain.text', 'src_erp_orders')
      .and('contain.text', 'dbt:source');
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="canvas-node-workbench-columns-section"]')
      .should('be.visible')
      .and('contain.text', 'order_id')
      .and('contain.text', 'INTEGER')
      .and('contain.text', 'not null')
      .and('contain.text', 'discount_code')
      .and('contain.text', 'TEXT')
      .and('contain.text', 'nullable');
  });
});

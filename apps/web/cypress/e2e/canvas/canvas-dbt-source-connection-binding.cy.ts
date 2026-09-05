/**
 * Owned concern: prove that importing dbt source declarations continues through
 * one governed connection binding and projects one Canvas node per table.
 */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  getE2eApiCalls,
  getLastE2eApiCall,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const CANVAS_ID = 'warehouse-analytics';
const PROJECT_ROOT = 'analytics';
const CONNECTION_ID = 'warehouse-governed';
const SOURCE_UNIQUE_IDS = [
  'source.warehouse_analytics.raw.customers',
  'source.warehouse_analytics.raw.orders',
  'source.warehouse_analytics.raw.products',
] as const;

const SOURCE_DECLARATIONS = [
  {
    uniqueId: SOURCE_UNIQUE_IDS[0],
    filePath: 'models/sources.yml',
    sourceName: 'raw',
    tableName: 'customers',
    database: 'RAW',
    schema: 'ERP',
    identifier: 'CUSTOMERS',
  },
  {
    uniqueId: SOURCE_UNIQUE_IDS[1],
    filePath: 'models/sources.yml',
    sourceName: 'raw',
    tableName: 'orders',
    database: 'RAW',
    schema: 'ERP',
    identifier: 'ORDERS',
  },
  {
    uniqueId: SOURCE_UNIQUE_IDS[2],
    filePath: 'models/sources.yml',
    sourceName: 'raw',
    tableName: 'products',
    database: 'RAW',
    schema: 'ERP',
    identifier: 'PRODUCTS',
  },
] as const;

const AUTHORITY_BINDING = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: CANVAS_ID,
  authority: { kind: 'dbt-project-files', projectRoot: PROJECT_ROOT },
} as const;

function buildMetricEvidence(rowCount: number): Readonly<Record<string, unknown>> {
  return {
    observedAt: '2026-08-16T08:00:00.000Z',
    observationScope: { kind: 'snapshot' },
    rowCount: {
      value: rowCount,
      provenance: 'estimated',
      method: 'provider-statistics',
      confidence: 'medium',
    },
    byteSize: {
      value: rowCount * 128,
      provenance: 'measured',
      method: 'provider-storage-metadata',
      confidence: 'exact',
      basis: 'physical-allocation',
    },
  } as const;
}

function buildSourceObject(
  table: 'CUSTOMERS' | 'ORDERS' | 'PRODUCTS',
  rowCount: number
): Readonly<Record<string, unknown>> {
  return {
    objectId: `relation/RAW/ERP/${table}`,
    displayName: table,
    locator: {
      kind: 'relation',
      catalog: 'RAW',
      schema: 'ERP',
      name: table,
      relationType: 'table',
    },
    metricEvidence: buildMetricEvidence(rowCount),
    columns: [
      {
        name:
          table === 'ORDERS' ? 'order_id' : table === 'CUSTOMERS' ? 'customer_id' : 'product_id',
        type: 'INTEGER',
        nullable: false,
      },
    ],
  } as const;
}

function buildProjectGraph(bound: boolean): Readonly<Record<string, unknown>> {
  return {
    schemaVersion: 'dbt-project-graph-projection.v1',
    authorityBinding: AUTHORITY_BINDING,
    freshness: 'fresh',
    projectRevision: {
      projectRoot: PROJECT_ROOT,
      projectName: 'warehouse_analytics',
      contentSetSha256: '4'.repeat(64),
      analyzedAt: '2026-08-16T08:00:02.000Z',
      analyzerVersion: 'dbt-cli-v1',
      dbtVersion: '1.10.0',
    },
    adapterType: 'postgres',
    analysisSha256: (bound ? '6' : '2').repeat(64),
    nodes: SOURCE_DECLARATIONS.map((source) => ({
      uniqueId: source.uniqueId,
      resourceType: 'source',
      name: source.tableName,
      identifier: source.identifier,
      packageName: 'warehouse_analytics',
      sourceName: source.sourceName,
      originalFilePath: source.filePath,
      columns: [],
      tags: [],
      ...(bound
        ? {
            sourceIdentity: {
              database: source.database,
              connectionName: 'Governed warehouse',
              schema: source.schema,
              databaseUser: 'warehouse_reader',
            },
          }
        : {}),
      visualEditability: { status: 'code_only', reasons: ['source definition'] },
    })),
    edges: [],
    diagnostics: [],
    capabilities: { canPreview: false, canRun: false, codeOnlyResourceCount: 3 },
  };
}

function stubDbtSourceBindingFlow(): void {
  stubShellBootstrapApis({
    scopes: [
      'workspace:graph-draft:view',
      'workspace:graph-draft:save',
      'workspace:warehouse-connections:view',
      'workspace:warehouse-connections:test',
      'plan:preview',
    ],
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: { dbt: { available: true }, dvt: { available: true } },
  });
  stubStatefulCanvasDraftAuthoring({ emptyCanvas: true, canvasKind: 'transformation' });

  stubE2eJsonApi('POST', '/workspace/dbt/import/validate', {
    schemaVersion: 'dbt-project-import-validation-report.v1',
    status: 'accepted',
    projectRoot: PROJECT_ROOT,
    projectName: 'warehouse_analytics',
    adapterType: 'postgres',
    inventory: {
      fileCount: 2,
      totalBytes: 384,
      includedFileCount: 2,
      excludedFileCount: 0,
      files: [
        {
          path: `${PROJECT_ROOT}/dbt_project.yml`,
          classification: 'project-config',
          byteSize: 128,
          decision: 'included',
        },
        {
          path: `${PROJECT_ROOT}/models/sources.yml`,
          classification: 'resource-yaml',
          byteSize: 256,
          decision: 'included',
        },
      ],
    },
    diagnostics: [],
    sourceTableDeclarations: SOURCE_DECLARATIONS,
    receipt: {
      schemaVersion: 'dbt-project-import-validation-receipt.v1',
      projectRoot: PROJECT_ROOT,
      contentSetSha256: '1'.repeat(64),
      analysisSha256: '2'.repeat(64),
      validationSha256: '3'.repeat(64),
      policyVersion: 'dbt-project-import-policy.v1',
      validatedAt: '2026-08-16T08:00:00.000Z',
    },
  });
  stubE2eJsonApi('POST', '/workspace/dbt/import', {
    schemaVersion: 'dbt-project-import-result.v1',
    success: true,
    idempotencyKey: 'dbt-project-import:warehouse-analytics:e2e',
    authorityBinding: AUTHORITY_BINDING,
    projectRevision: {
      projectRoot: PROJECT_ROOT,
      contentSetSha256: '1'.repeat(64),
      analyzedAt: '2026-08-16T08:00:01.000Z',
      analyzerVersion: 'dbt-cli-v1',
    },
    analysisSha256: '2'.repeat(64),
    projectedResourceCount: 3,
    importedAt: '2026-08-16T08:00:02.000Z',
  });

  let sourcesBound = false;
  stubE2eApi('GET', '/workspace/dbt/graph', () => ({ body: buildProjectGraph(sourcesBound) }));
  stubE2eJsonApi('GET', '/workspace/warehouse/connections', [
    {
      id: CONNECTION_ID,
      name: 'Governed warehouse',
      type: 'postgres',
      database: 'RAW',
    },
  ]);
  stubE2eJsonApi('GET', `/workspace/warehouse/connections/${CONNECTION_ID}/objects`, {
    contractVersion: 1,
    objects: [
      buildSourceObject('ORDERS', 42),
      buildSourceObject('CUSTOMERS', 12),
      buildSourceObject('PRODUCTS', 24),
    ],
  });
  stubE2eApi('POST', '/workspace/sources/import', ({ body }) => {
    const command = body as {
      idempotencyKey: string;
      existingDbtSourceTargets?: unknown;
    };
    sourcesBound = true;
    return {
      body: {
        schemaVersion: 'source-import-result.v2',
        success: true,
        idempotencyKey: command.idempotencyKey,
        authorityBinding: AUTHORITY_BINDING,
        sourcesCreated: 1,
        objectsImported: 3,
        yamlFiles: [`${PROJECT_ROOT}/models/sources.yml`],
        grouping: 'schema',
        options: { includeColumns: true, addTests: false, addFreshness: false },
        outcome: {
          kind: 'dbt-project-files',
          projectRevision: {
            projectRoot: PROJECT_ROOT,
            projectName: 'warehouse_analytics',
            contentSetSha256: '4'.repeat(64),
            analyzedAt: '2026-08-16T08:00:03.000Z',
            analyzerVersion: 'dbt-cli-v1',
            dbtVersion: '1.10.0',
          },
          analysisSha256: '6'.repeat(64),
          projectedSourceUniqueIds: [...SOURCE_UNIQUE_IDS],
        },
      },
    };
  });
}

function visitCanvas(language: 'en' | 'es'): void {
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language }, version: 0 })
      );
    },
  });
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

function openAndValidateDbtImport(language: 'en' | 'es'): void {
  const copy =
    language === 'es'
      ? { ready: 'Listo para importar', validate: 'Validar proyecto', import: 'Importar proyecto' }
      : { ready: 'Ready to import', validate: 'Validate project', import: 'Import project' };

  cy.get('[data-slot="shell-workspace-menu-trigger"]').should('be.visible').click();
  cy.get('[data-slot="canvas-workspace-import-dbt-project-command"]').click();
  cy.get('[data-slot="dbt-project-import-root"]').clear().type(PROJECT_ROOT);
  cy.get('[data-slot="dbt-project-import-canvas-id"]').clear().type(CANVAS_ID);
  cy.contains('button', copy.validate).click();
  cy.get('[data-slot="dbt-project-import-dialog"]', { timeout: 20_000 }).should(
    'contain.text',
    copy.ready
  );
  cy.contains('button', copy.import).click();
}

function assertSeriousAccessibility(): void {
  cy.injectAxe();
  cy.checkA11y(
    '[role="dialog"][data-state="open"]',
    {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
      includedImpacts: ['serious', 'critical'],
    },
    (violations) => {
      expect(violations, JSON.stringify(violations, null, 2)).to.have.length(0);
    }
  );
}

describe('dbt source connection binding', () => {
  it('binds one governed connection and projects one node per imported table', () => {
    stubDbtSourceBindingFlow();
    cy.viewport(1366, 768);
    visitCanvas('en');
    openAndValidateDbtImport('en');

    cy.contains('[role="dialog"]', 'Add source', { timeout: 20_000 }).should('be.visible');
    cy.contains('[data-slot="source-import-connection-option"]', 'Governed warehouse').click();
    cy.contains('[role="dialog"]', 'Selected: 3', { timeout: 20_000 }).should('be.visible');
    assertSeriousAccessibility();
    cy.contains('button', 'Attach sources to canvas').should('be.enabled').click();

    waitForE2eApiCall('/workspace/sources/import', 'POST');
    cy.contains('[role="dialog"]', 'Sources imported', { timeout: 20_000 }).should('be.visible');
    cy.contains('[role="dialog"] button', 'Done').click();

    cy.wrap(null).should(() => {
      expect(getE2eApiCalls('/workspace/dbt/graph', 'GET').length).to.be.greaterThan(1);
    });
    for (const uniqueId of SOURCE_UNIQUE_IDS) {
      cy.get(`.react-flow__node[data-id="${uniqueId}"]`, { timeout: 20_000 }).should('be.visible');
    }

    cy.then(() => {
      const command = getLastE2eApiCall('/workspace/sources/import', 'POST')?.body as {
        connectionId: string;
        objects: Array<{ objectId: string }>;
        existingDbtSourceTargets: Array<{
          objectId: string;
          sourceUniqueId: string;
          filePath: string;
        }>;
      };
      expect(command.connectionId).to.equal(CONNECTION_ID);
      expect(command.objects.map(({ objectId }) => objectId)).to.deep.equal([
        'relation/RAW/ERP/ORDERS',
        'relation/RAW/ERP/CUSTOMERS',
        'relation/RAW/ERP/PRODUCTS',
      ]);
      expect(command.existingDbtSourceTargets).to.deep.equal([
        {
          objectId: 'relation/RAW/ERP/CUSTOMERS',
          sourceUniqueId: SOURCE_UNIQUE_IDS[0],
          filePath: 'models/sources.yml',
          sourceName: 'raw',
          tableName: 'customers',
        },
        {
          objectId: 'relation/RAW/ERP/ORDERS',
          sourceUniqueId: SOURCE_UNIQUE_IDS[1],
          filePath: 'models/sources.yml',
          sourceName: 'raw',
          tableName: 'orders',
        },
        {
          objectId: 'relation/RAW/ERP/PRODUCTS',
          sourceUniqueId: SOURCE_UNIQUE_IDS[2],
          filePath: 'models/sources.yml',
          sourceName: 'raw',
          tableName: 'products',
        },
      ]);
    });
  });

  it('presents the same mandatory continuation in Spanish', () => {
    stubDbtSourceBindingFlow();
    cy.viewport(1920, 1080);
    visitCanvas('es');
    openAndValidateDbtImport('es');

    cy.contains('[role="dialog"]', 'Añadir origen', { timeout: 20_000 }).should('be.visible');
    cy.contains('[data-slot="source-import-connection-option"]', 'Governed warehouse').click();
    cy.contains('[role="dialog"]', 'Seleccionados: 3', { timeout: 20_000 }).should('be.visible');
    cy.contains('button', 'Adjuntar orígenes al canvas').should('be.enabled');
    assertSeriousAccessibility();
  });
});

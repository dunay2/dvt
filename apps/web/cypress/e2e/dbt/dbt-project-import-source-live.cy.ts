/**
 * Owned concern: prove project import and file-backed Source Import through the
 * real protected browser, API, workspace-file, dbt analyzer, and Postgres rails.
 */
import { skipWhenFirstAuthoringLiveEnvIsMissing } from '../../support/canvasFirstAuthoring';
import {
  readLiveGraphDraft,
  readLiveWorkspaceFile,
  resolveLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';
import { importLivePostgresSource } from '../../support/liveWarehouseSourceImport';
import { seedE2eWorkspaceSession, type E2eWorkspaceSession } from '../../support/workspaceSession';

const PROJECT_ROOT = 'analytics';
const CANVAS_ID = 'analytics-files';

const PROJECT_FILES: Readonly<Record<string, string>> = {
  [`${PROJECT_ROOT}/dbt_project.yml`]: `
name: analytics
version: '1.0.0'
config-version: 2
profile: dvt_live_proof
model-paths: ['models']
clean-targets: ['target', 'dbt_packages']
`,
  [`${PROJECT_ROOT}/models/schema.yml`]: `
version: 2
sources:
  - name: raw
    database: dvt
    schema: public
    tables:
      - name: source_1
models:
  - name: orders
    columns:
      - name: order_id
        data_type: integer
`,
  [`${PROJECT_ROOT}/models/orders.sql`]: `
select order_id from {{ source('raw', 'source_1') }}
`,
  [`${PROJECT_ROOT}/target/manifest.json`]: '{"generated":true}',
};

function readRequiredEnv(name: 'apiBaseUrl' | 'apiBearerToken'): string {
  const value = Cypress.env(name);
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Cypress env ${name} is required for the live dbt import proof.`);
  }
  return value.trim();
}

function saveWorkspaceFile(
  session: E2eWorkspaceSession,
  path: string,
  content: string
): Cypress.Chainable<void> {
  const bearer = readRequiredEnv('apiBearerToken');
  const query = new URLSearchParams(session);

  return cy
    .request({
      method: 'POST',
      url: `${readRequiredEnv('apiBaseUrl')}/workspace/files/${encodeURIComponent(path)}?${query.toString()}`,
      auth: { bearer },
      headers: { Authorization: `Bearer ${bearer}`, Accept: 'application/json' },
      body: { content, expectedRevision: { kind: 'absent' } },
    })
    .then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.kind).to.equal('saved');
    });
}

function seedDbtProjectFiles(session: E2eWorkspaceSession): Cypress.Chainable<void> {
  const seeded = Object.entries(PROJECT_FILES).reduce<Cypress.Chainable<void>>(
    (chain, [path, content]) => chain.then(() => saveWorkspaceFile(session, path, content)),
    cy.wrap(undefined)
  );
  return seeded.then(() => {
    readLiveWorkspaceFile(`${PROJECT_ROOT}/dbt_project.yml`, session).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.content).to.contain('name: analytics');
    });
  });
}

function visitCanvas(session: E2eWorkspaceSession): void {
  cy.visit('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.clear();
      seedE2eWorkspaceSession(window, session);
    },
  });
}

describe('dbt project import and file-backed Source Import live vertical', () => {
  beforeEach(function () {
    if (skipWhenFirstAuthoringLiveEnvIsMissing(this)) {
      return;
    }

    const session = resolveLiveWorkspaceSession();
    return seedDbtProjectFiles(session);
  });

  it('imports a real project, binds its source file, refreshes projection, and never creates a draft node', () => {
    const session = resolveLiveWorkspaceSession();
    const expectedSourceUniqueId = 'source.analytics.raw.source_1';
    const expectedYamlPath = `${PROJECT_ROOT}/models/schema.yml`;

    readLiveGraphDraft(session, { failOnStatusCode: false }).then((response) => {
      expect(response.status).to.equal(404);
    });
    visitCanvas(session);

    cy.get('[data-slot="shell-workspace-menu-trigger"]', { timeout: 30_000 })
      .should('be.visible')
      .should('be.enabled')
      .click();
    cy.get('[data-slot="canvas-workspace-import-dbt-project-command"]')
      .should('be.visible')
      .should(($command) => {
        expect($command).not.to.have.attr('data-disabled');
      })
      .then(($command) => {
        $command[0]?.click();
      });

    cy.get('[data-slot="dbt-project-import-dialog"]', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-slot="dbt-project-import-root"]')
      .clear()
      .type(PROJECT_ROOT)
      .should('have.value', PROJECT_ROOT);
    cy.get('[data-slot="dbt-project-import-canvas-id"]')
      .clear()
      .type(CANVAS_ID)
      .should('have.value', CANVAS_ID);
    cy.get('[data-slot="dbt-project-import-command"]').should('be.disabled');
    cy.get('[data-slot="dbt-project-validate-command"]').should('be.enabled').click();

    cy.get('[data-slot="dbt-project-import-dialog"]', { timeout: 60_000 })
      .should('contain.text', 'Ready to import')
      .and('contain.text', 'analytics')
      .and('contain.text', 'Adapter:')
      .and('contain.text', 'postgres')
      .and('contain.text', '4 files')
      .and('contain.text', 'Included')
      .and('contain.text', 'Excluded')
      .and('contain.text', `${PROJECT_ROOT}/target/manifest.json`)
      .and('contain.text', 'runtime-artifact');
    cy.get('[data-slot="dbt-project-import-command"]').should('be.enabled').click();

    cy.location('search', { timeout: 60_000 })
      .should('contain', 'authority=dbt-project-files')
      .and('contain', `canvasId=${CANVAS_ID}`)
      .and('contain', `projectRoot=${PROJECT_ROOT}`);
    cy.get(`.react-flow__node[data-id="${expectedSourceUniqueId}"]`, {
      timeout: 60_000,
    }).should('be.visible');
    cy.get('.react-flow__node[data-id="model.analytics.orders"]').should('be.visible');

    importLivePostgresSource({ kind: 'dbt-project-files', expectedYamlPath });

    cy.get(`.react-flow__node[data-id="${expectedSourceUniqueId}"]`, {
      timeout: 60_000,
    })
      .should('be.visible')
      .and('contain.text', 'Source 1')
      .and('contain.text', 'Columns')
      .and('contain.text', '3');

    readLiveWorkspaceFile(expectedYamlPath, session).then((response) => {
      expect(response.status).to.equal(200);
      const content = (response.body as { content: string }).content;
      expect(content).to.contain('name: raw');
      expect(content).to.contain('name: source_1');
      expect(content).to.contain('dvt_source_identity');
      expect(content).to.contain('order_id');
      expect(content).to.contain('customer');
      expect(content).to.contain('amount');
    });
    readLiveGraphDraft(session, { failOnStatusCode: false }).then((response) => {
      expect(response.status).to.equal(404);
    });
  });
});

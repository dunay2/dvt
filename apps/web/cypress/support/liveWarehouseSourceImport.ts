/** Owned concern: drive the real warehouse Source Import dialog in live browser proofs. */

function toStableYamlIdentifierPart(part: string): string {
  const normalized = part
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized.length > 0 ? normalized : 'unnamed';
}

export function expectedLivePostgresSourceName(connectionNameSuffix = ''): string {
  const runId = String(Cypress.env('firstAuthoringRunId') ?? 'source-import-live');
  const connectionId = ['live-postgres', runId, connectionNameSuffix].filter(Boolean).join('-');
  return [connectionId, 'dvt', 'public'].map(toStableYamlIdentifierPart).join('_');
}

function createLivePostgresConnection(connectionNameSuffix = ''): void {
  const runId = String(Cypress.env('firstAuthoringRunId') ?? 'source-import-live');
  const connectionName = [`Live Postgres ${runId}`, connectionNameSuffix].filter(Boolean).join(' ');

  cy.contains('[role="dialog"] button', 'New connection').should('be.enabled').click();
  cy.get('[data-slot="source-import-create-connection-name"]')
    .should('be.visible')
    .clear()
    .type(connectionName);
  cy.get('[data-slot="source-import-create-connection-type"]').select('postgres');
  cy.get('[data-slot="source-import-create-connection-database"]').clear().type('dvt');
  cy.get('[data-slot="source-import-create-connection-credential-ref"]')
    .clear()
    .type('postgres:local-warehouse');
  cy.contains('[role="dialog"] button', 'Create connection').should('be.enabled').click();
  cy.contains('[data-slot="source-import-connection-option"]', connectionName, {
    timeout: 30_000,
  })
    .should('be.visible')
    .and('have.attr', 'aria-pressed', 'true');
}

type ExpectedSourceImportAuthority =
  | Readonly<{ kind: 'graph-draft' }>
  | Readonly<{ kind: 'dbt-project-files'; expectedYamlPath: string }>;

export function importLivePostgresSource(
  expectedAuthority: ExpectedSourceImportAuthority = { kind: 'graph-draft' },
  connectionNameSuffix = ''
): void {
  cy.contains('[role="dialog"]', 'Add source', { timeout: 20_000 }).should('be.visible');
  createLivePostgresConnection(connectionNameSuffix);
  cy.contains('[role="dialog"] button', 'Test connection').should('be.enabled').click();
  cy.contains('[role="dialog"]', 'Connection passed', { timeout: 20_000 }).should('be.visible');
  cy.contains('[role="dialog"]', 'objects reachable').should('be.visible');

  if (expectedAuthority.kind === 'dbt-project-files') {
    cy.contains('[role="dialog"]', 'Selected: 1', { timeout: 20_000 }).should('be.visible');
    cy.contains('button', 'Attach sources to canvas').should('be.enabled').click();
    cy.contains('[role="dialog"]', 'Sources imported', { timeout: 60_000 }).should('be.visible');
    cy.contains('[role="dialog"]', 'Source files updated').should('be.visible');
    cy.contains('[role="dialog"]', `[file] ${expectedAuthority.expectedYamlPath}`).should(
      'be.visible'
    );
    cy.contains('[role="dialog"]', 'file-backed graph projection will refresh').should(
      'be.visible'
    );
    cy.contains('[role="dialog"] button', 'Done').click();
    return;
  }

  cy.contains('[role="tab"]', 'Browse').click();
  cy.get('[data-slot="source-import-object-search"]', { timeout: 20_000 })
    .should('be.visible')
    .clear()
    .type('source_1');
  cy.contains('[role="dialog"]', 'Source metadata').should('be.visible');
  cy.contains('[role="dialog"]', 'dvt', { timeout: 20_000 }).should('be.visible');
  cy.contains('[role="dialog"]', 'public').should('be.visible');
  cy.get('[role="dialog"][data-state="open"]')
    .last()
    .within(() => {
      cy.get('[data-source-import-object="relation/dvt/public/source_1"]', {
        timeout: 20_000,
      })
        .scrollIntoView()
        .within(() => {
          cy.contains('order_id').should('be.visible');
          cy.contains('3 rows').should('be.visible');
          cy.contains('32 KB').should('be.visible');
          cy.get('button[aria-label^="Inspect source object"]')
            .scrollIntoView()
            .should('be.visible')
            .click();
        });
      cy.get('[data-source-import-object-select="relation/dvt/public/source_1"]', {
        timeout: 20_000,
      })
        .scrollIntoView()
        .should('be.visible');
      cy.get('[data-source-import-object="relation/dvt/public/source_1"]')
        .dblclick()
        .find('[data-source-import-object-select="relation/dvt/public/source_1"]')
        .should('have.attr', 'data-state', 'checked');
    });
  cy.contains('[role="dialog"]', 'Selected: 1').should('be.visible');
  cy.contains('[role="dialog"]', 'Selected sources').should('be.visible');
  cy.contains('[role="dialog"]', 'dvt.public.source_1').should('be.visible');

  cy.contains('[role="tab"]', 'Metadata').click();
  cy.contains('[role="dialog"]', 'order_id', { timeout: 20_000 }).should('be.visible');
  cy.contains('[role="dialog"]', '3 rows').should('be.visible');
  cy.contains('[role="dialog"]', '32 KB').should('be.visible');
  cy.contains('[role="dialog"]', 'customer').should('be.visible');
  cy.contains('[role="dialog"]', 'amount').should('be.visible');

  cy.contains('[role="tab"]', 'Selected').click();
  cy.get('[data-source-import-review-object="relation/dvt/public/source_1"]', {
    timeout: 20_000,
  })
    .scrollIntoView()
    .should('be.visible')
    .and('contain.text', '3 rows')
    .and('contain.text', '32 KB')
    .and('contain.text', '3 columns');
  cy.contains('button', 'Attach sources to canvas').should('be.enabled').click();

  cy.contains('[role="dialog"]', 'Sources imported', { timeout: 60_000 }).should('be.visible');

  cy.contains('[role="dialog"]', 'governed draft authority refreshes').should('be.visible');
  cy.contains('[role="dialog"] button', 'Done').click();
}

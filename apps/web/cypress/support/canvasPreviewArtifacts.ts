/**
 * Owned concern: isolate the non-runtime workspace-files artifact seam used by
 * selected-closure browser proof lanes.
 */
export function stubSelectedClosurePreviewArtifacts(): void {
  cy.intercept('POST', '**/workspace/files/pipelines%2Fsales_pipeline.yaml', (req) => {
    expect(req.body.content).to.contain('executionTarget: "postgres"');
    expect(req.body.content).to.contain('type: "source"');
    expect(req.body.content).to.contain('type: "sql_transform"');
    expect(req.body.content).to.contain('type: "sink"');
    expect(req.body.content).to.contain('schema: "raw"');
    expect(req.body.content).to.contain('table: "orders_daily"');
    expect(req.body.content).to.contain('entrypoint: "models/analytics/model_orders.sql"');
    expect(req.body.content).not.to.contain('orphan_metrics');
    req.reply({
      statusCode: 200,
      body: {
        path: 'pipelines/sales_pipeline.yaml',
        name: 'sales_pipeline.yaml',
        language: 'yaml',
        content: req.body.content,
        lastModified: '2026-04-08T00:00:00.000Z',
      },
    });
  }).as('saveSelectedClosureGraphArtifact');

  cy.intercept('GET', '**/workspace/files/models%2Fanalytics%2Fmodel_orders.sql*', {
    statusCode: 200,
    body: {
      path: 'models/analytics/model_orders.sql',
      name: 'model_orders.sql',
      language: 'sql',
      content: ['select *', 'from raw.orders'].join('\n'),
      lastModified: '2026-04-08T00:00:00.000Z',
    },
  }).as('loadSelectedClosureSqlArtifact');
}

export function waitForSelectedClosurePreviewArtifacts(): void {
  cy.wait('@saveSelectedClosureGraphArtifact');
  cy.wait('@loadSelectedClosureSqlArtifact');
}

/**
 * Owned concern: isolate the non-runtime workspace-files artifact seam used by
 * selected-closure browser proof lanes.
 */
import { getE2eApiCalls, stubE2eApi } from './e2eApiStub';

export function stubSelectedClosurePreviewArtifacts(): void {
  stubE2eApi('POST', '/workspace/files/pipelines%2Fsales_pipeline.yaml', (request) => {
    const body = request.body as { content?: unknown };
    expect(body.content).to.be.a('string');
    const content = String(body.content);
    expect(content).to.contain('executionTarget: "postgres"');
    expect(content).to.contain('type: "source"');
    expect(content).to.contain('type: "sql_transform"');
    expect(content).to.contain('type: "sink"');
    expect(content).to.contain('schema: "raw"');
    expect(content).to.contain('table: "orders_daily"');
    expect(content).to.contain('entrypoint: "models/analytics/model_orders.sql"');
    expect(content).not.to.contain('orphan_metrics');

    return {
      statusCode: 200,
      body: {
        path: 'pipelines/sales_pipeline.yaml',
        name: 'sales_pipeline.yaml',
        language: 'yaml',
        content,
        lastModified: '2026-04-08T00:00:00.000Z',
      },
    };
  });

  stubE2eApi('GET', '/workspace/files/models%2Fanalytics%2Fmodel_orders.sql', () => ({
    statusCode: 200,
    body: {
      path: 'models/analytics/model_orders.sql',
      name: 'model_orders.sql',
      language: 'sql',
      content: ['select *', 'from raw.orders'].join('\n'),
      lastModified: '2026-04-08T00:00:00.000Z',
    },
  }));
}

export function waitForSelectedClosurePreviewArtifacts(): void {
  cy.wrap(null).should(() => {
    expect(
      getE2eApiCalls('/workspace/files/models%2Fanalytics%2Fmodel_orders.sql', 'GET')
    ).to.have.length.greaterThan(0);
    expect(
      getE2eApiCalls('/workspace/files/pipelines%2Fsales_pipeline.yaml', 'POST')
    ).to.have.length.greaterThan(0);
  });
}

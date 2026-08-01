/**
 * Owned concern: isolate the non-runtime workspace-files artifact seam used by
 * selected-closure browser proof lanes.
 */
import { getE2eApiCalls, stubE2eApi } from './e2eApiStub';

export function stubSelectedClosurePreviewArtifacts(): void {
  const graphArtifactPath = 'pipelines/sales_pipeline.yaml';
  const graphArtifactSha256 = 'f'.repeat(64);
  let savedGraphArtifactContent: string | null = null;

  stubE2eApi('GET', '/workspace/files/pipelines%2Fsales_pipeline.yaml', () =>
    savedGraphArtifactContent === null
      ? {
          statusCode: 404,
          body: {
            error: {
              type: 'not_found',
              reason: 'workspace_file_not_found',
            },
          },
        }
      : {
          body: {
            path: graphArtifactPath,
            name: 'sales_pipeline.yaml',
            language: 'yaml',
            content: savedGraphArtifactContent,
            contentSha256: graphArtifactSha256,
            lastModified: '2026-04-08T00:00:00.000Z',
          },
        }
  );

  stubE2eApi('POST', '/workspace/files/pipelines%2Fsales_pipeline.yaml', (request) => {
    const body = request.body as { content?: unknown; expectedRevision?: unknown };
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

    const disposition = savedGraphArtifactContent === null ? 'created' : 'updated';
    expect(body.expectedRevision).to.deep.equal(
      disposition === 'created'
        ? { kind: 'absent' }
        : { kind: 'content_sha256', value: graphArtifactSha256 }
    );
    savedGraphArtifactContent = content;

    return {
      statusCode: 200,
      body: {
        kind: 'saved',
        disposition,
        path: graphArtifactPath,
        contentSha256: graphArtifactSha256,
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
  cy.wrap(null, { timeout: 20_000 }).should(() => {
    expect(
      getE2eApiCalls('/workspace/files/models%2Fanalytics%2Fmodel_orders.sql', 'GET')
    ).to.have.length.greaterThan(0);
    expect(
      getE2eApiCalls('/workspace/files/pipelines%2Fsales_pipeline.yaml', 'POST')
    ).to.have.length.greaterThan(0);
  });
}

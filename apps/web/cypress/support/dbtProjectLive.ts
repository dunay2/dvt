/** Owned concern: exercise file-authoritative dbt project HTTP rails in live Cypress proofs. */
import { resolveLiveWorkspaceSession } from './liveProtectedRuntime';

type WorkspaceFileRevision =
  Readonly<{ kind: 'absent' }> | Readonly<{ kind: 'content_sha256'; value: string }>;

type AcceptedImportValidation = Readonly<{
  status: 'accepted';
  receipt: Readonly<{
    schemaVersion: 'dbt-project-import-validation-receipt.v1';
    projectRoot: string;
    contentSetSha256: string;
    analysisSha256: string;
    validationSha256: string;
    policyVersion: 'dbt-project-import-policy.v1';
    validatedAt: string;
  }>;
}>;

function readRequiredEnv(name: string): string {
  const value = Cypress.env(name);
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Cypress env ${name} is required for the live dbt project proof.`);
  }
  return value.trim();
}

function buildLiveAuthorization(): Readonly<{
  auth: { bearer: string };
  headers: Record<string, string>;
}> {
  const bearer = readRequiredEnv('apiBearerToken');
  return {
    auth: { bearer },
    headers: {
      Authorization: `Bearer ${bearer}`,
      Accept: 'application/json',
    },
  };
}

export function saveLiveWorkspaceFile(
  path: string,
  content: string,
  expectedRevision: WorkspaceFileRevision = { kind: 'absent' }
): Cypress.Chainable<void> {
  const query = new URLSearchParams(resolveLiveWorkspaceSession());
  const authorization = buildLiveAuthorization();

  return cy
    .request({
      method: 'POST',
      url: `${readRequiredEnv('apiBaseUrl')}/workspace/files/${encodeURIComponent(path)}?${query.toString()}`,
      ...authorization,
      body: {
        content,
        expectedRevision,
      },
    })
    .then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.kind).to.equal('saved');
    });
}

export function replaceLiveWorkspaceFile(path: string, content: string): Cypress.Chainable<void> {
  const query = new URLSearchParams(resolveLiveWorkspaceSession());
  const authorization = buildLiveAuthorization();
  const endpoint = `${readRequiredEnv('apiBaseUrl')}/workspace/files/${encodeURIComponent(path)}?${query.toString()}`;

  return cy.request({ method: 'GET', url: endpoint, ...authorization }).then((response) => {
    expect(response.status).to.equal(200);
    expect(response.body.contentSha256).to.match(/^[a-f0-9]{64}$/);

    return saveLiveWorkspaceFile(path, content, {
      kind: 'content_sha256',
      value: response.body.contentSha256 as string,
    });
  });
}

export function seedLiveWorkspaceFiles(
  files: Readonly<Record<string, string>>
): Cypress.Chainable<void> {
  return Object.entries(files).reduce<Cypress.Chainable<void>>(
    (chain, [path, content]) => chain.then(() => saveLiveWorkspaceFile(path, content)),
    cy.wrap(undefined)
  );
}

export function adoptLiveDbtProjectFileAuthority(
  projectRoot: string,
  canvasId: string
): Cypress.Chainable<void> {
  const query = new URLSearchParams(resolveLiveWorkspaceSession());
  const authorization = buildLiveAuthorization();
  const apiBaseUrl = readRequiredEnv('apiBaseUrl');

  return cy
    .request({
      method: 'POST',
      url: `${apiBaseUrl}/workspace/dbt/import/validate?${query.toString()}`,
      ...authorization,
      body: {
        schemaVersion: 'validate-dbt-project-import-request.v1',
        projectRoot,
      },
    })
    .then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.status, JSON.stringify(response.body.diagnostics)).to.equal('accepted');
      const report = response.body as AcceptedImportValidation;

      return cy.request({
        method: 'POST',
        url: `${apiBaseUrl}/workspace/dbt/import?${query.toString()}`,
        ...authorization,
        body: {
          schemaVersion: 'import-dbt-project-command.v1',
          canvasId,
          conflictPolicy: 'require-unbound-canvas',
          idempotencyKey: `live-dbt-project-import:${canvasId}:${report.receipt.validationSha256}`,
          validationReceipt: report.receipt,
        },
      });
    })
    .then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.success).to.equal(true);
      expect(response.body.authorityBinding).to.deep.include({
        canvasId,
        authority: { kind: 'dbt-project-files', projectRoot },
      });
    });
}

export function requestLiveDbtProjectGraph(
  projectRoot: string,
  canvasId: string
): Cypress.Chainable<Cypress.Response<unknown>> {
  const query = new URLSearchParams({
    ...resolveLiveWorkspaceSession(),
    projectRoot,
    canvasId,
  });

  return cy.request({
    method: 'GET',
    url: `${readRequiredEnv('apiBaseUrl')}/workspace/dbt/graph?${query.toString()}`,
    ...buildLiveAuthorization(),
  });
}

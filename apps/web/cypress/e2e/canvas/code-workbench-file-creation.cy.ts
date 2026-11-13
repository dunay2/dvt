/** Prove explicit Explorer creation/import through the existing scoped file transport. */
import { sha256HexUtf8 } from '@dvt/crypto';

import type {
  FileContent,
  IWorkspaceFileContentCommandPort,
  WorkspaceFileSaveReceipt,
} from '../../../src/app/ports/workspace';
import { APPLICATION_LANGUAGE_STORAGE_KEY } from '../../../src/app/stores/applicationLanguageStore';
import { contextFixture } from '../../../src/app/views/code/codeWorkspaceFileContext.test-support';
import { stubCodeWorkbenchBootstrapApis } from '../../support/codeWorkbench/bootstrap';
import { getE2eApiCalls, stubE2eApi, stubE2eJsonApi } from '../../support/e2eApiStub';
import { visitWithE2eWorkspaceSession } from '../../support/workspaceSession';

it('creates and imports files with compact keyboard-accessible Explorer actions', () => {
  const { file, project } = contextFixture('select 1 as id');
  const files: FileContent[] = [file];
  const writes: string[] = [];
  const importedContent = '\uFEFFselect 84 as id';
  stubCodeWorkbenchBootstrapApis();
  stubE2eApi('GET', '/workspace/files', () => ({
    body: files.map(({ path, name }) => ({ path, name, kind: 'file' })),
  }));
  stubE2eApi('GET', /\/workspace\/files\/.+/, ({ url }) => {
    const path = decodeURIComponent(url.pathname.slice('/workspace/files/'.length));
    const accepted = files.find((candidate) => candidate.path === path);
    expect(accepted, 'only accepted file bytes may be opened').not.to.equal(undefined);
    return { body: accepted };
  });
  stubE2eJsonApi('GET', /\/workspace\/file-history\/.+/, []);
  // The controlled write transport owns this journey; the passive bootstrap is unchanged.
  stubE2eApi('POST', /\/workspace\/files\/.+/, ({ url, body }) => {
    const path = decodeURIComponent(url.pathname.slice('/workspace/files/'.length));
    const input = body as Pick<
      Parameters<IWorkspaceFileContentCommandPort['saveFileContent']>[0],
      'content' | 'expectedRevision'
    >;
    expect(input.expectedRevision).to.deep.equal({ kind: 'absent' });
    expect(
      files.some((candidate) => candidate.path === path),
      'an existing file cannot be overwritten'
    ).to.equal(false);
    expect(input.content).to.equal(writes.length === 0 ? 'select 42 as id' : importedContent);
    const contentSha256 = sha256HexUtf8(input.content);
    const created: FileContent = {
      path,
      name: path.slice(path.lastIndexOf('/') + 1),
      language: 'sql',
      content: input.content,
      contentSha256,
      lastModified: '2026-11-13T00:00:00Z',
    };
    files.push(created);
    writes.push(path);
    const receipt: WorkspaceFileSaveReceipt = {
      kind: 'saved',
      disposition: 'created',
      path,
      contentSha256,
      lastModified: created.lastModified,
    };
    return { body: receipt };
  });
  stubE2eJsonApi('GET', '/workspace/dbt/graph', project);
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        APPLICATION_LANGUAGE_STORAGE_KEY,
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
  cy.get('[data-slot="shell-project-code-command"]').click();
  cy.get('button[aria-label="New file"]').should('be.visible').and('be.enabled').focus();
  cy.press(Cypress.Keyboard.Keys.SPACE);
  cy.get('[role="dialog"]')
    .should('be.visible')
    .within(() => {
      cy.contains('label', 'File path')
        .invoke('attr', 'for')
        .then((id) =>
          cy
            .get(`#${CSS.escape(id!)}`)
            .clear()
            .type('models/new.sql')
        );
      cy.contains('label', 'Initial content')
        .invoke('attr', 'for')
        .then((id) => cy.get(`#${CSS.escape(id!)}`).type('select 42 as id'));
      cy.screenshot('explorer-file-draft');
      cy.contains('button', 'Create file').click();
    });
  cy.get('[role="dialog"]').should('not.exist');
  cy.get('button[aria-label="New file"]').should('be.focused');
  cy.then(() => {
    expect(writes).to.have.length(1);
    cy.get('[data-slot="workspace-file-code-editor"]').should(
      'have.attr',
      'data-file-path',
      writes[0]
    );
  });
  cy.get('[data-testid="monaco-code-viewer"] .view-lines').should((lines) => {
    expect(lines.text().replace(/\u00a0/g, ' ')).to.contain('select 42 as id');
  });
  cy.get('input[type="file"][aria-label="Import file"]').selectFile(
    {
      contents: Cypress.Buffer.from(importedContent),
      fileName: 'imported.sql',
      mimeType: 'text/plain',
    },
    { force: true }
  );
  cy.get('[role="dialog"]').within(() => {
    cy.contains('label', 'File path')
      .invoke('attr', 'for')
      .then((id) => cy.get(`#${CSS.escape(id!)}`).should('have.value', 'models/imported.sql'));
    cy.contains('button', 'Create file').click();
  });
  cy.get('[role="dialog"]').should('not.exist');
  cy.get('button[aria-label="Import file"]').should('be.focused');
  cy.then(() => {
    expect(writes).to.have.length(2);
    cy.get('[data-slot="workspace-file-code-editor"]').should(
      'have.attr',
      'data-file-path',
      writes[1]
    );
  });
  cy.get('[data-testid="monaco-code-viewer"] .view-lines').should((lines) => {
    expect(lines.text().replace(/\u00a0/g, ' ')).to.contain('select 84 as id');
  });
  cy.then(() => {
    expect(getE2eApiCalls(/\/workspace\/files\/.+/, 'POST')).to.have.length(2);
    expect(getE2eApiCalls('/plans/preview', 'POST')).to.have.length(0);
    expect(getE2eApiCalls('/runs', 'POST')).to.have.length(0);
  });
  cy.screenshot('explorer-file-actions');
});

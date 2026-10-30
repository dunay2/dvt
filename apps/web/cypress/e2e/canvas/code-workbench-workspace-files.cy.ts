/** Owned concern: prove read-only Canvas Project Code preserves inspection and Canvas position. */
import { sha256HexUtf8 } from '@dvt/crypto';

import type { FileContent } from '../../../src/app/ports/workspace';
import { resolveCodeInlineReferenceCopy } from '../../../src/app/views/code/codeViewCopy';
import { stubCanvasDraftRead } from '../../support/canvasDraftAuthoring';
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

const INITIAL_REVISION = 'a'.repeat(64);
const INITIAL_SQL = 'select * from orders';

function stubCodeWorkbenchBootstrapApis(): void {
  stubShellBootstrapApis();
  stubCanvasDraftRead();

  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '1.0.0',
    plugins: {
      dbt: { available: true },
      dvt: { available: true },
    },
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
}

function stubContextualCodeWorkbenchApis(
  files: ReadonlyArray<FileContent> = [
    {
      path: 'models/staging/stg_orders.sql',
      name: 'stg_orders.sql',
      language: 'sql',
      content: INITIAL_SQL,
      contentSha256: INITIAL_REVISION,
      lastModified: '2026-07-12T00:00:00.000Z',
    },
  ]
): void {
  stubCodeWorkbenchBootstrapApis();
  stubE2eJsonApi(
    'GET',
    '/workspace/files',
    files.map(({ path, name }) => ({ path, name, kind: 'file' }))
  );
  stubE2eApi('GET', /\/workspace\/files\/.+/, ({ url }) => {
    const path = decodeURIComponent(url.pathname.slice('/workspace/files/'.length));
    const file = files.find((candidate) => candidate.path === path);
    if (file === undefined) throw new Error(`Unexpected workspace file read: ${path}`);
    return { body: file };
  });
  stubE2eJsonApi('GET', /\/workspace\/file-history\/.+/, []);
  stubE2eApi('POST', /\/workspace\/files\/.+/, () => {
    throw new Error('Read-only Project Code must not save workspace files.');
  });
}

describe('Canvas Project Code read-only inspection', () => {
  it('reads authorized YAML and plain SQL without reference analysis or editor movement', () => {
    const authoringAuthority: FileContent['authoringAuthority'] = {
      kind: 'resolved',
      binding: {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'yaml-code-inspection',
        authority: { kind: 'dbt-project-files', projectRoot: 'inspection_project' },
      },
    };
    const files: FileContent[] = [
      {
        path: 'inspection_project/dbt_project.yml',
        name: 'dbt_project.yml',
        language: 'yaml',
        content: "name: inspection_project\nversion: '1.0'\nconfig-version: 2\nprofile: default\n",
        lastModified: '2026-10-30T00:00:00.000Z',
        authoringAuthority,
      },
      {
        path: 'inspection_project/models/schema.yml',
        name: 'schema.yml',
        language: 'yaml',
        content: 'version: 2\nmodels:\n  - name: stg_orders\n    description: Orders model\n',
        lastModified: '2026-10-30T00:00:00.000Z',
        authoringAuthority,
      },
      {
        path: 'inspection_project/models/clientes.sql',
        name: 'clientes.sql',
        language: 'sql',
        content: 'select client_id, country from raw.client where client_id is not null',
        lastModified: '2026-10-30T00:00:00.000Z',
        authoringAuthority,
      },
    ].map((file) => ({ ...file, contentSha256: sha256HexUtf8(file.content) }));
    stubContextualCodeWorkbenchApis(files);
    for (const endpoint of ['/workspace/dbt/graph', '/workspace/dbt/analysis/selected-model']) {
      stubE2eApi('GET', endpoint, () => {
        throw new Error(`YAML and plain SQL inspection must not request ${endpoint}.`);
      });
    }

    visitWithE2eWorkspaceSession('/canvas');
    cy.get('[data-slot="shell-file-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-open-project-code-command"]').click();
    waitForE2eApiCall(/\/workspace\/files\/.+/, 'GET');
    const surface = '[data-slot="canvas-code-workspace-surface"]';
    const editor = `${surface} [data-slot="workspace-file-code-editor"]`;
    const monaco = `${editor} [data-testid="monaco-code-viewer"] .monaco-editor`;
    cy.get(editor).should('have.attr', 'data-file-path', files[0]!.path);
    cy.get(monaco)
      .should('be.visible')
      .then(($monaco) => {
        const initialTop = $monaco[0]!.getBoundingClientRect().top;
        for (const file of [files[1]!, files[2]!, files[0]!]) {
          cy.get(`${surface} [data-workspace-path="${file.path}"]`).click();
          cy.get(editor).should('have.attr', 'data-file-path', file.path);
          cy.get(`${editor} .view-lines`).should(($lines) => {
            expect($lines.text().replace(/\u00a0/g, ' ')).to.contain(file.content.split('\n')[0]);
          });
          cy.get(monaco).should(($current) => {
            expect($current[0]!.getBoundingClientRect().top).to.be.closeTo(initialTop, 1);
          });
          cy.get(`${editor} [data-reference-id]`).should('not.exist');
          for (const language of ['en', 'es']) {
            const copy = resolveCodeInlineReferenceCopy(language);
            cy.get(editor)
              .should('not.contain.text', copy.checkingMessage)
              .and('not.contain.text', copy.unavailableMessage)
              .and('not.contain.text', copy.unsupportedMessage);
          }
        }
      });
    cy.get(`${editor} [data-testid="monaco-code-editor"]`).should('not.exist');
    cy.get(`${editor} textarea.inputarea`).should('have.prop', 'readOnly', true);
    cy.get(`${editor} [data-slot="code-working-tree-status"]`).should(
      'have.attr',
      'data-phase',
      'read_only'
    );
    cy.get(editor).children('[role="status"]').should('have.length', 1);
    cy.then(() => {
      const readPaths = getE2eApiCalls(/\/workspace\/files\/.+/, 'GET').map(({ url }) =>
        decodeURIComponent(url.pathname.slice('/workspace/files/'.length))
      );
      expect(readPaths).to.include.members(files.map(({ path }) => path));
      expect(getE2eApiCalls('/workspace/dbt/graph', 'GET')).to.have.length(0);
      expect(getE2eApiCalls('/workspace/dbt/analysis/selected-model', 'GET')).to.have.length(0);
      expect(getE2eApiCalls(/\/workspace\/files\/.+/, 'POST')).to.have.length(0);
    });
  });

  it('allows selection and copying without changing the file or Canvas position', () => {
    stubContextualCodeWorkbenchApis();

    visitWithE2eWorkspaceSession('/canvas');

    cy.get('.react-flow__node').first().click().should('have.class', 'selected');
    cy.get('.react-flow__viewport')
      .invoke('attr', 'style')
      .then((viewportStyle) => cy.wrap(viewportStyle).as('graphViewportStyle'));

    cy.get('[data-slot="shell-file-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-open-project-code-command"]').click();
    waitForE2eApiCall('/workspace/files', 'GET');
    waitForE2eApiCall(/\/workspace\/files\/.+/, 'GET');

    cy.get('[data-slot="canvas-code-workspace-surface"]')
      .should('be.visible')
      .within(() => {
        cy.get('[data-slot="code-working-tree-status"]')
          .should('be.visible')
          .and('have.attr', 'data-phase', 'read_only');
        cy.contains('button', 'Save').should('not.exist');
        cy.get('[data-testid="monaco-code-editor"]').should('not.exist');
        cy.get('[data-testid="monaco-code-viewer"]')
          .should('be.visible')
          .find('.view-line')
          .first()
          .click();
        cy.get('[data-testid="monaco-code-viewer"] textarea.inputarea')
          .should('have.prop', 'readOnly', true)
          .and('be.focused');
        cy.get('[data-testid="monaco-code-viewer"] textarea.inputarea').type(
          'blocked_workspace_edit',
          { force: true, delay: 0 }
        );
        cy.get('[data-testid="monaco-code-viewer"] .view-line').first().click();
        cy.window().then((window) => {
          const clipboardData = new window.DataTransfer();
          cy.get('[data-testid="monaco-code-viewer"] textarea.inputarea')
            .should('be.focused')
            .then(($input) => {
              const selectAll = {
                key: 'a',
                code: 'KeyA',
                keyCode: 65,
                ctrlKey: Cypress.platform !== 'darwin',
                metaKey: Cypress.platform === 'darwin',
                bubbles: true,
                cancelable: true,
              };
              $input[0]!.dispatchEvent(new window.KeyboardEvent('keydown', selectAll));
              $input[0]!.dispatchEvent(new window.KeyboardEvent('keyup', selectAll));
              $input[0]!.dispatchEvent(
                new window.ClipboardEvent('copy', {
                  clipboardData,
                  bubbles: true,
                  cancelable: true,
                })
              );
              expect(clipboardData.getData('text/plain')).to.equal(INITIAL_SQL);
            });
        });
        cy.get('[data-testid="monaco-code-viewer"] .selected-text').should('exist');
      });

    cy.wrap(null).should(() => {
      expect(getLastE2eApiCall(/\/workspace\/files\/.+/, 'POST')).to.equal(null);
    });

    cy.get('.react-flow__node').first().should('have.class', 'selected');
    cy.get('@graphViewportStyle').then((viewportStyle) => {
      cy.get('.react-flow__viewport').should(($viewport) => {
        expect($viewport.attr('style')).to.equal(viewportStyle);
      });
    });
  });
});

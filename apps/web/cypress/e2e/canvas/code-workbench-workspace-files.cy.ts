/** Prove authorized YAML and plain SQL inspection; keep requests, permissions and native gestures observable. */
import { DbtProjectGraphProjectionSchema } from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';

import type { FileContent } from '../../../src/app/ports/workspace';
import { resolveCodeInlineReferenceCopy } from '../../../src/app/views/code/codeViewCopy';
import { stubContextualCodeWorkbenchApis } from '../../support/codeWorkbench/bootstrap';
import {
  getE2eApiCalls,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import { visitWithE2eWorkspaceSession } from '../../support/workspaceSession';

describe('Canvas Project Code authorized YAML and plain SQL inspection', () => {
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
    stubE2eJsonApi(
      'GET',
      '/workspace/dbt/graph',
      DbtProjectGraphProjectionSchema.parse({
        schemaVersion: 'dbt-project-graph-projection.v1',
        authorityBinding: authoringAuthority.binding,
        freshness: 'fresh',
        analysisSha256: '1'.repeat(64),
        projectRevision: {
          projectRoot: 'inspection_project',
          projectName: 'inspection_project',
          contentSetSha256: '2'.repeat(64),
          analyzedAt: '2026-11-04T00:00:00.000Z',
          analyzerVersion: 'native-dbt',
        },
        nodes: [
          {
            uniqueId: 'model.inspection_project.clientes',
            resourceType: 'model',
            name: 'clientes',
            packageName: 'inspection_project',
            originalFilePath: 'models/clientes.sql',
            columns: [
              { name: 'client_id', dataType: 'text' },
              { name: 'country', dataType: 'text' },
            ],
            tags: [],
            visualEditability: { status: 'code_only', reasons: ['File authority'] },
          },
        ],
        edges: [],
        diagnostics: [],
        capabilities: { canPreview: false, canRun: false, codeOnlyResourceCount: 1 },
      })
    );
    stubE2eApi('GET', '/workspace/dbt/analysis/selected-model', () => {
      throw new Error('YAML and plain SQL inspection must not analyze model references.');
    });

    visitWithE2eWorkspaceSession('/canvas');
    cy.get(
      '[data-slot="canvas-explorer"] [data-element-id="dbt-model-reference:yaml-code-inspection:model.inspection_project.clientes"]'
    ).should('be.visible');
    cy.then(() => expect(getE2eApiCalls('/workspace/dbt/graph', 'GET')).to.have.length(1));
    cy.get('[data-slot="shell-project-code-command"]').click();
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
            // SQL owns a command row; only that measured row may move the editor.
            const commands = $current[0]!
              .closest('[data-slot="workspace-file-code-editor"]')!
              .querySelector('[data-slot="code-model-commands"]');
            expect($current[0]!.getBoundingClientRect().top).to.be.closeTo(
              initialTop + (commands?.getBoundingClientRect().height ?? 0),
              1
            );
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
      // Plain SQL resolves its model context without invoking reference analysis.
      expect(getE2eApiCalls('/workspace/dbt/graph', 'GET')).to.have.length(2);
      expect(getE2eApiCalls('/workspace/dbt/analysis/selected-model', 'GET')).to.have.length(0);
      expect(getE2eApiCalls(/\/workspace\/files\/.+/, 'POST')).to.have.length(0);
    });
  });
});

/** Prove explicit reference analysis and navigation reuse; keep requests, permissions and native gestures observable. */
import { sha256HexUtf8 } from '@dvt/crypto';

import { resolveCopyLanguage } from '../../../src/app/copyLanguage';
import type { FileContent } from '../../../src/app/ports/workspace';
import { resolveCodeInlineReferenceCopy } from '../../../src/app/views/code/codeViewCopy';
import { contextFixture } from '../../../src/app/views/code/codeWorkspaceFileContext.test-support';
import { stubContextualCodeWorkbenchApis } from '../../support/codeWorkbench/bootstrap';
import {
  getE2eApiCalls,
  installE2eApiFetchStub,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import { visitWithE2eWorkspaceSession } from '../../support/workspaceSession';

describe('Canvas Project Code explicit reference analysis and navigation reuse', () => {
  it('analyzes references once and retains them across navigation and full reload', () => {
    const { file, project, analysis } = contextFixture();
    const plainFile: FileContent = {
      ...file,
      path: 'inline_code_demo/models/clientes.sql',
      name: 'clientes.sql',
      content: 'select 1',
      contentSha256: sha256HexUtf8('select 1'),
    };
    const config = "name: demo\nversion: '1.0'\nconfig-version: 2\nprofile: default\n";
    const projectFile: FileContent = {
      ...file,
      path: 'inline_code_demo/dbt_project.yml',
      name: 'dbt_project.yml',
      language: 'yaml',
      content: config,
      contentSha256: sha256HexUtf8(config),
    };
    stubContextualCodeWorkbenchApis([file, plainFile, projectFile]);
    stubE2eJsonApi('GET', '/workspace/dbt/graph', project);
    let completeAnalysis: (() => void) | undefined;
    stubE2eApi(
      'GET',
      '/workspace/dbt/analysis/selected-model',
      () =>
        new Promise((resolve) => {
          completeAnalysis = () => resolve({ body: analysis });
        })
    );

    visitWithE2eWorkspaceSession('/canvas');
    cy.get(
      '[data-slot="canvas-explorer"] [data-element-id="dbt-model-reference:canvas-inline_code_demo:model.demo.ventas"]'
    ).should('be.visible');
    cy.get('[data-slot="shell-project-code-command"]').click();
    const surface = '[data-slot="canvas-code-workspace-surface"]';
    const editor = `${surface} [data-slot="workspace-file-code-editor"]`;
    const analyze = `${editor} [data-slot="code-analyze-references"]`;
    cy.get(`${surface} [data-workspace-path="${file.path}"]`).click();
    cy.document().then((document) => {
      const copy = resolveCodeInlineReferenceCopy(
        resolveCopyLanguage(document.documentElement.lang)
      );
      cy.get(editor).should('have.attr', 'data-file-path', file.path);
      cy.get(`${editor} [data-slot="code-working-tree-status"]`).should(
        'contain.text',
        copy.pendingAnalysisMessage
      );
      cy.get(analyze).should('be.enabled');
      cy.then(() =>
        expect(getE2eApiCalls('/workspace/dbt/analysis/selected-model', 'GET')).to.have.length(0)
      );
      cy.get(analyze).click();
      cy.get(analyze).should('be.disabled');
      cy.get(`${editor} [data-slot="code-working-tree-status"]`).should(
        'contain.text',
        copy.analyzingMessage
      );
      waitForE2eApiCall('/workspace/dbt/analysis/selected-model', 'GET');
      cy.then(() => {
        const requests = getE2eApiCalls('/workspace/dbt/analysis/selected-model', 'GET');
        expect(requests).to.have.length(1);
        const params = requests[0]!.url.searchParams;
        expect(params.get('tenantId')).to.equal('e2e-tenant');
        expect(params.get('projectId')).to.equal('e2e-project');
        expect(params.get('environmentId')).to.equal('e2e-env');
        expect(params.get('canvasId')).to.equal(project.authorityBinding.canvasId);
        expect(params.get('projectRoot')).to.equal(project.projectRevision.projectRoot);
        expect(params.get('selectedUniqueId')).to.equal(analysis.selectedUniqueId);
        expect(completeAnalysis).to.be.a('function');
        completeAnalysis!();
      });
      cy.get(editor).should('contain.text', copy.analyzedMessage);
      cy.get(`${editor} [data-reference-id]`).should('have.length', 2);
      cy.get(`${surface} [data-workspace-path="${plainFile.path}"]`).click();
      cy.get(editor).should('have.attr', 'data-file-path', plainFile.path);
      cy.get(analyze).should('not.exist');
      cy.get(`${surface} [data-workspace-path="${file.path}"]`).click();
      cy.get(editor).should('have.attr', 'data-file-path', file.path);
      cy.get(editor).should('contain.text', copy.analyzedMessage);
      cy.get(`${editor} [data-reference-id]`).should('have.length', 2);
      cy.then(() => {
        expect(getE2eApiCalls('/workspace/dbt/analysis/selected-model', 'GET')).to.have.length(1);
        expect(getE2eApiCalls(/\/workspace\/files\/.+/, 'POST')).to.have.length(0);
      });
      cy.on('window:before:load', installE2eApiFetchStub);
      cy.reload();
      cy.get('[data-slot="shell-project-code-command"]').click();
      cy.get(`${surface} [data-workspace-path="${file.path}"]`).click();
      cy.get(editor).should('contain.text', copy.analyzedMessage);
      cy.get(`${editor} [data-reference-id]`).should('have.length', 2);
      cy.then(() => {
        expect(getE2eApiCalls('/workspace/dbt/analysis/selected-model', 'GET')).to.have.length(1);
        expect(getE2eApiCalls(/\/workspace\/files\/.+/, 'POST')).to.have.length(0);
      });
    });
  });
});

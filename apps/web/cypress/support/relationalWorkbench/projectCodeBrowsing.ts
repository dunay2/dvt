/**
 * Owned concern: verify retained Canvas and project Code browsing through the existing Shell.
 * @decision Keep this browser journey separate from viewport geometry and spec registration.
 * @consequence File selection, metadata disclosure, identity and zero-write assertions stay together.
 */
import { getE2eApiCalls, stubE2eApi, stubE2eJsonApi } from '../e2eApiStub';

import { visitWorkbenchCanvas } from './navigation';

export function verifyRetainedProjectCodeBrowsing(): void {
  // Code may cover the Canvas, but must not discard its camera, search, or graph identity.
  stubE2eJsonApi('GET', '/workspace/files', [
    {
      path: 'notes',
      name: 'notes',
      kind: 'directory',
      children: [
        { path: 'notes/first.md', name: 'first.md', kind: 'file' },
        { path: 'notes/second.md', name: 'second.md', kind: 'file' },
      ],
    },
  ]);
  stubE2eApi('GET', /^\/workspace\/files\/.+/, ({ url }) => {
    const path = decodeURIComponent(url.pathname.slice('/workspace/files/'.length));
    return {
      body: {
        path,
        name: path.split('/').at(-1),
        language: 'markdown',
        content: `# ${path}`,
        contentSha256: 'a'.repeat(64),
        lastModified: '2026-10-28T00:00:00Z',
      },
    };
  });
  stubE2eJsonApi('GET', /^\/workspace\/file-history\/.+/, []);
  stubE2eApi('POST', /^\/workspace\/files\/.+/, () => {
    throw new Error('Clean project-file browsing must not save content.');
  });
  cy.viewport(1280, 720);
  visitWorkbenchCanvas();
  const main = '[data-slot="canvas-workspace-surface"]';
  const git = `[data-slot="shell-project-code-command"]`;
  const code = '[data-slot="canvas-code-workspace-surface"]';
  const tree = `${code} [data-slot="route-workbench-left-panel"]`;
  const properties = `${code} [data-slot="route-workbench-right-panel"] [role="region"]`;
  cy.get(`${main} .react-flow__viewport`).should(($viewport) => {
    expect($viewport[0]!.style.transform).to.contain('scale(0.82)');
  });
  cy.get(`${main} [data-slot="canvas-explorer-panel"] input[type="search"]`).type('customers');
  cy.get(`${main} .react-flow__viewport`).then(($viewport) => {
    const viewport = $viewport[0]!;
    const transform = viewport.getAttribute('style');
    const card = viewport.querySelector<HTMLElement>('[data-id="join-transform"]')!;
    const before = card.getBoundingClientRect();
    const assertStationary = (): void => {
      cy.get(`${main} .react-flow__viewport`)
        .should('be.visible')
        .should(($current) => {
          expect($current[0]).to.equal(viewport);
          expect($current.attr('style')).to.equal(transform);
          const bounds = card.getBoundingClientRect();
          expect(bounds.left).to.be.closeTo(before.left, 1);
          expect(bounds.top).to.be.closeTo(before.top, 1);
        });
    };
    cy.get(git).focus();
    cy.press(Cypress.Keyboard.Keys.ENTER);
    cy.get('[data-slot="canvas-code-main-tab"]').should('have.attr', 'aria-selected', 'true');
    cy.get(tree).find('[data-slot="code-workspace-file-entry"]').should('have.length', 3);
    cy.get(`${code} [data-slot="code-workspace-file-entry"]:visible`).should('have.length', 3);
    cy.get(code)
      .should('be.visible')
      .should(($code) => {
        const bounds = $code[0]!.getBoundingClientRect();
        const workspace = $code[0]!
          .closest('[data-slot="canvas-workspace-surfaces"]')!
          .getBoundingClientRect();
        expect(bounds.top).to.be.closeTo(workspace.top, 1);
        expect(bounds.right).to.be.closeTo(workspace.right, 1);
        expect(bounds.bottom).to.be.closeTo(workspace.bottom, 1);
      });
    cy.get(main).should('have.attr', 'inert');
    cy.get(`${main} .react-flow__viewport`).should('not.be.visible');
    cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(
      'have.attr',
      'data-file-path',
      'notes/first.md'
    );
    cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'notes/first.md');
    cy.get(properties).should('contain.text', 'notes/first.md');
    cy.get(`${properties} time`).should('have.attr', 'datetime', '2026-10-28T00:00:00Z');
    cy.screenshot('canvas-git-project-files');
    cy.get('a[data-slot="left-navigation-link"][href="/canvas"]').click();
    cy.get(code).should('not.be.visible');
    assertStationary();
    cy.get(`${main} [data-slot="canvas-explorer-panel"] input`).should('have.value', 'customers');
    cy.get(git).click();
    cy.get(code).should('be.visible');
    cy.get(tree).find('[data-workspace-path="notes/second.md"]').click();
    cy.get(code)
      .should('be.visible')
      .find('.monaco-editor .view-lines')
      .should('contain.text', 'notes/second.md');
    cy.get(tree).find('[data-workspace-path="notes/first.md"]').click();
    cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'notes/first.md');
    cy.get(tree).find('[data-workspace-path="notes/second.md"]').click();
    cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'notes/second.md');
    cy.get(properties)
      .should('contain.text', 'notes/second.md')
      .and('not.contain.text', 'notes/first.md');
    cy.get(properties).then(($properties) => {
      const panelId = $properties.attr('id');
      expect(panelId, 'the properties region has an accessible identity').to.be.a('string').and.not
        .be.empty;
      const toggle = `${code} button[aria-controls="${panelId}"]`;
      cy.get(`${code} [data-slot="workspace-file-code-editor"]`).then(($editor) => {
        const editor = $editor[0]!;
        const width = editor.getBoundingClientRect().width;
        cy.get(toggle)
          .should('have.length', 1)
          .click()
          .should('have.attr', 'aria-expanded', 'false');
        cy.get(properties).should('not.exist');
        cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(($current) => {
          expect($current[0]).to.equal(editor);
          expect($current[0]!.getBoundingClientRect().width).to.be.greaterThan(width);
        });
        cy.get(toggle)
          .should('have.length', 1)
          .click()
          .should('have.attr', 'aria-expanded', 'true');
        cy.get(properties).should('contain.text', 'notes/second.md');
        cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(($current) =>
          expect($current[0]).to.equal(editor)
        );
      });
    });
    cy.get('[data-slot="shell-project-code-command"]').click();
    cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'notes/second.md');
    cy.get('[data-slot="canvas-workspace-tab"]').click();
    cy.get(code).should('not.be.visible');
    cy.get(main).should('not.have.attr', 'inert');
    assertStationary();
    cy.get('[data-slot="shell-project-code-command"]').click();
    cy.get(code)
      .should('be.visible')
      .find('.monaco-editor .view-lines')
      .should('contain.text', 'notes/second.md');
    cy.get('[data-slot="canvas-workspace-tab"]').click();
    assertStationary();
    cy.then(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
      expect(getE2eApiCalls(/^\/workspace\/files\/.+/, 'POST')).to.have.length(0);
    });
  });
}

/**
 * Owned concern: zoom and source-rail layout preserve the draft, search and graph fit.
 * @baseline SaveWorkspaceGraphDraft: viewport gestures do not persist draft changes.
 * @decision Measure all writes after the hydrated model has been durably synchronized.
 * @consequence Bootstrap normalization cannot race the viewport-only assertions.
 * @version 1.0.0
 */
import { WorkspaceGraphDraftReadResponseSchema } from '@dvt/contracts';

import {
  adoptLiveDbtProjectFileAuthority,
  replaceLiveWorkspaceFile,
  seedLiveWorkspaceFiles,
} from '../../support/dbtProjectLive';
import {
  getE2eApiCalls,
  resetE2eApiStubs,
  stubE2eApi,
  stubE2eJsonApi,
} from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveGraphDraft,
  readLiveWorkspaceFile,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';
import {
  verifyWheelZoom,
  revealCardDetails,
  verifyCompleteTreeFit,
} from '../../support/relationalWorkbench/geometry';
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
} from '../../support/relationalWorkbench/navigation';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Workbench viewport', () => {
  beforeEach(() => {
    stubWorkbenchScenario('saved-join');
  });
  it('retains the Canvas while browsing Git and opening a project file', () => {
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
    const git = `${main} [data-slot="canvas-explorer-git-toggle"]`;
    const code = '[data-slot="canvas-code-workspace-surface"]';
    const tree = `${code} [data-slot="route-workbench-left-panel"]`;
    const properties = `${code} [data-slot="route-workbench-right-panel"] [role="region"]`;
    cy.get(`${main} .react-flow__viewport`).should(($viewport) => {
      expect($viewport[0]!.style.transform).to.contain('scale(0.82)');
    });
    cy.then(() => expect(getE2eApiCalls('/workspace/files', 'GET')).to.have.length(0));
    cy.get(`${main} section[aria-labelledby$="-sources-button"] input[type="search"]`).type(
      'customers'
    );
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
      for (const panel of ['elements', 'sources']) {
        cy.get('[data-slot="canvas-workspace-tab"]').click();
        cy.get(`${main} [data-slot="canvas-explorer-${panel}-toggle"]`).click();
        cy.get(code).should('not.be.visible');
        assertStationary();
      }
      cy.get(`${main} section[aria-labelledby$="-sources-button"] input`).should(
        'have.value',
        'customers'
      );
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
      cy.get(`${code} [data-slot="workspace-file-code-editor"]`).then(($editor) => {
        const editor = $editor[0]!;
        const width = editor.getBoundingClientRect().width;
        cy.get(`${code} button[aria-controls]`)
          .click()
          .should('have.attr', 'aria-expanded', 'false');
        cy.get(properties).should('not.exist');
        cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(($current) => {
          expect($current[0]).to.equal(editor);
          expect($current[0]!.getBoundingClientRect().width).to.be.greaterThan(width);
        });
        cy.get(`${code} button[aria-controls]`)
          .click()
          .should('have.attr', 'aria-expanded', 'true');
        cy.get(properties).should('contain.text', 'notes/second.md');
        cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(($current) =>
          expect($current[0]).to.equal(editor)
        );
      });
      cy.get('[data-slot="shell-file-menu-trigger"]').click();
      cy.get('[data-slot="canvas-workspace-open-project-code-command"]').click();
      cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'notes/second.md');
      cy.get('[data-slot="canvas-workspace-tab"]').click();
      cy.get(code).should('not.be.visible');
      cy.get(main).should('not.have.attr', 'inert');
      assertStationary();
      cy.get('[data-slot="shell-file-menu-trigger"]').click();
      cy.get('[data-slot="canvas-workspace-open-project-code-command"]').click();
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
  });
  it('keeps zoom and source search while expanding and collapsing the rail', () => {
    let writesBeforeZoom = 0;
    cy.viewport(1280, 720);
    visitWorkbenchCanvas();
    const main = '[data-slot="canvas-workspace-surface"]';
    cy.get(`${main} [data-element-id]:visible`).should('have.length', 2);
    cy.get(`${main} button[aria-label="Collapse explorer"]:visible`).click();
    cy.get(`${main} [data-slot="canvas-explorer-sources-toggle"]`).should('be.visible').click();
    cy.get(`${main} button[aria-label="Close explorer"]:visible`).click();
    cy.get(`${main} [data-slot="canvas-explorer-sources-toggle"]`).should('not.be.visible');
    cy.get('[data-slot="shell-menu-trigger"]').click();
    cy.get('[data-slot="canvas-explorer-view-command"]')
      .should('have.attr', 'aria-checked', 'false')
      .click();
    cy.get(`${main} [data-element-id]:visible`).should('have.length', 2);
    cy.get(
      '[data-slot="canvas-workspace-surface"] [data-slot="canvas-explorer-elements-toggle"]'
    ).click();
    cy.get('[data-slot="canvas-workspace-surface"] [data-element-id]:visible')
      .first()
      .then(($item) => {
        const id = $item.attr('data-element-id');
        cy.get('.react-flow__node')
          .its('length')
          .then((count) => {
            cy.wrap($item).click();
            cy.get(`.react-flow__node[data-id="${id}"]`).should('have.class', 'selected');
            cy.get('.react-flow__node').should('have.length', count);
          });
      });
    openWorkbenchModel();
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.then(() => {
      writesBeforeZoom = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    verifyWheelZoom('[data-slot="canvas-relational-tree-viewport"]');
    revealCardDetails(1);
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-card-detail"]')
      .scrollIntoView()
      .should('contain.text', 'EQUAL');
    cy.screenshot('semantic-editor-card-expressions');
    verifyCompleteTreeFit('[data-slot="canvas-relational-tree-viewport"]');
    cy.get('[data-slot="canvas-relational-card-detail"]').should('have.length', 1);
    cy.get('[data-slot="canvas-relational-tree-sources"] input').type('customers');
    cy.get(
      '[data-slot="canvas-relational-tree-workbench"] [role="separator"][aria-label="Resize explorer"]'
    ).focus();
    cy.press(Cypress.Keyboard.Keys.RIGHT);
    cy.get('[data-slot="canvas-relational-tree-zoom"]')
      .invoke('text')
      .then((zoom) => {
        cy.get('[data-slot="canvas-relational-tree-viewport"]').then(($viewport) => {
          const width = $viewport[0].clientWidth;
          cy.get(
            '[data-slot="canvas-relational-tree-workbench"] [data-slot="canvas-explorer-sources-toggle"]'
          )
            .click()
            .should('have.attr', 'aria-expanded', 'false');
          cy.get('[data-slot="canvas-relational-tree-viewport"]').should(($next) => {
            expect($next[0].clientWidth).to.be.greaterThan(width);
          });
        });
        cy.get('[data-slot="canvas-relational-tree-zoom"]').should('have.text', zoom);
      });
    cy.get('[data-slot="canvas-relational-tree-source-list"]').should('not.be.visible');
    verifyCompleteTreeFit('[data-slot="canvas-relational-tree-viewport"]');
    cy.screenshot('semantic-editor-sources-collapsed');
    const sourcesToggle =
      '[data-slot="canvas-relational-tree-workbench"] [data-slot="canvas-explorer-sources-toggle"]';
    cy.get(sourcesToggle).focus();
    cy.press(Cypress.Keyboard.Keys.ENTER);
    cy.get(
      '[data-slot="canvas-relational-tree-workbench"] [data-slot="canvas-explorer-sources-toggle"]'
    ).should('have.attr', 'aria-expanded', 'true');
    cy.get('[data-slot="canvas-relational-tree-sources"] input')
      .should('have.value', 'customers')
      .clear();
    cy.get(
      '[data-slot="canvas-relational-tree-workbench"] [data-slot="canvas-explorer-elements-toggle"]'
    ).click();
    cy.get('[data-slot="canvas-relational-tree-workbench"] [data-element-id]:visible').should(
      'have.length',
      3
    );
    cy.get(
      '[data-slot="canvas-relational-tree-workbench"] [data-slot="canvas-explorer-sources-toggle"]'
    ).click();
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('not.exist');
    // 1280x900 at 200% browser zoom has a 640x450 CSS viewport; this tests reflow,
    // independently of the graph's own zoom control.
    cy.viewport(640, 450);
    cy.get('[data-slot="shell-active-canvas-identity"]').should(($identity) => {
      const bounds = $identity[0]!.getBoundingClientRect();
      $identity.find('[role="tab"], [data-slot="canvas-model-tab-close"]').each((_, control) => {
        const tab = control.getBoundingClientRect();
        expect(tab.left).to.be.at.least(bounds.left);
        expect(tab.right).to.be.at.most(bounds.right);
      });
    });
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').click();
    cy.get('[data-canvas-inspector="true"]:visible').should(($panel) => {
      const bounds = $panel[0]!.getBoundingClientRect();
      expect(bounds.left).to.be.at.least(0);
      expect(bounds.right).to.be.at.most(640);
      expect(bounds.bottom).to.be.at.most(450);
    });
    cy.get('[data-slot="canvas-relational-collapse"]').should('be.visible').click();
    cy.get('[data-slot="canvas-model-toolbar"]').should(($footer) => {
      expect($footer[0]!.getBoundingClientRect().bottom).to.be.at.most(450);
    });
    cy.screenshot('semantic-editor-200-percent-equivalent-reflow');
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.then(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writesBeforeZoom)
    );
  });
});

describe('DBT project Git browsing with real file authority', () => {
  const projectRoot = 'git-browser-dbt';
  const canvasId = 'git-browser-dbt-files';
  const projectPath = `${projectRoot}/dbt_project.yml`;
  const firstPath = `${projectRoot}/models/a.sql`;
  const secondPath = `${projectRoot}/models/b.sql`;
  const outsidePath = 'git-browser-outside.md';
  const files = {
    [projectPath]:
      "name: git_browser_dbt\nversion: '1.0'\nconfig-version: 2\nprofile: dvt_live_proof\nmodel-paths: ['models']\n",
    [firstPath]: 'select 11 as git_a\n',
    [secondPath]: 'select 22 as git_b\n',
    [outsidePath]: '# Outside the bound DBT root\n',
  };

  before(() => {
    expect(hasLiveProtectedRuntimeEnv(), 'real protected API configuration').to.equal(true);
    resetE2eApiStubs();
    return seedLiveWorkspaceFiles(files).then(() =>
      adoptLiveDbtProjectFileAuthority(projectRoot, canvasId)
    );
  });

  it('retains repeated DBT file selection without file saves or persisted graph changes', () => {
    const hashes: Record<string, string> = {};
    const modified: Record<string, string> = {};
    let viewport: HTMLElement | undefined;
    let transform: string | null = null;
    let graphBefore:
      | {
          status: number;
          body: ReturnType<typeof WorkspaceGraphDraftReadResponseSchema.parse>;
        }
      | undefined;
    const main = '[data-slot="canvas-workspace-surface"]';
    const code = '[data-slot="canvas-code-workspace-surface"]';
    const git = `${code} [data-slot="route-workbench-left-panel"]`;
    const properties = `${code} [data-slot="route-workbench-right-panel"] [role="region"]`;
    for (const path of Object.keys(files)) {
      readLiveWorkspaceFile(path).then(({ status, body }) => {
        expect(status).to.equal(200);
        const file = body as { contentSha256: string; lastModified: string };
        expect(file.contentSha256).to.match(/^[a-f0-9]{64}$/);
        expect(file.lastModified).to.be.a('string');
        hashes[path] = file.contentSha256;
        modified[path] = file.lastModified;
      });
    }
    readLiveGraphDraft(undefined, { failOnStatusCode: false }).then(({ status, body }) => {
      expect(status).to.be.oneOf([200, 404]);
      const draft = WorkspaceGraphDraftReadResponseSchema.parse(body);
      expect(draft.kind).to.equal(status === 200 ? 'ok' : 'not_found');
      graphBefore = { status, body: draft };
    });
    cy.intercept({ method: 'GET', pathname: '/workspace/files' }).as('actualFileTree');
    cy.intercept({ method: 'POST', pathname: '/workspace/files/**' }).as('fileWrites');
    cy.viewport(1500, 900);
    visitWithLiveWorkspaceSession(
      `/canvas?authority=dbt-project-files&canvasId=${canvasId}&projectRoot=${projectRoot}`
    );
    cy.get(`${main} [data-slot="canvas-explorer-git-toggle"]`, { timeout: 60_000 }).should(
      'be.visible'
    );
    cy.get(`${main} .react-flow__node`).its('length').should('be.at.least', 2);
    cy.get(`${main} .react-flow__controls-fitview`).click();
    cy.get(`${main} .react-flow__viewport`)
      .should('be.visible')
      .should(($viewport) => {
        const current = $viewport[0]!;
        expect(
          new DOMMatrix(current.style.transform).a,
          'public Fit has applied its zoom'
        ).to.be.lessThan(1);
        const frame = current.closest('.react-flow')!.getBoundingClientRect();
        const cards = current.querySelectorAll('.react-flow__node');
        expect(cards.length).to.be.at.least(2);
        cards.forEach((card) => {
          const bounds = card.getBoundingClientRect();
          expect(bounds.width).to.be.greaterThan(0);
          expect(bounds.height).to.be.greaterThan(0);
          expect(bounds.left).to.be.at.least(frame.left);
          expect(bounds.right).to.be.at.most(frame.right);
          expect(bounds.top).to.be.at.least(frame.top);
          expect(bounds.bottom).to.be.at.most(frame.bottom);
        });
      })
      .then(($viewport) => {
        viewport = $viewport[0]!;
        transform = viewport.getAttribute('style');
      });
    cy.get(`${main} [data-slot="canvas-explorer-git-toggle"]`).click();
    cy.wait('@actualFileTree')
      .its('response')
      .should((response) => {
        expect(response?.statusCode).to.equal(200);
        expect(JSON.stringify(response?.body)).to.contain(outsidePath);
      });
    cy.get(`${git} [data-workspace-path]`).each(($entry) => {
      const path = $entry.attr('data-workspace-path')!;
      expect(path === projectRoot || path.startsWith(`${projectRoot}/`)).to.equal(true);
    });
    cy.get(`${git} [data-workspace-path="${outsidePath}"]`).should('not.exist');
    cy.get(`${git} [data-slot="code-workspace-file-entry"]:visible`)
      .its('length')
      .then((count) => {
        expect(count).to.be.greaterThan(0);
        cy.get(`${code} [data-slot="code-workspace-file-entry"]:visible`).should(
          'have.length',
          count
        );
      });
    cy.get(code).should('be.visible');
    cy.get(`${main} .react-flow__viewport`).should('not.be.visible');
    cy.get(main).should('have.attr', 'inert');
    cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(
      'have.attr',
      'data-file-path',
      projectPath
    );
    cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'git_browser_dbt');
    cy.get(properties).should('contain.text', projectPath);
    cy.get(`${git} [data-workspace-path="${secondPath}"]`).click();
    cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(
      'have.attr',
      'data-file-path',
      secondPath
    );
    cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'git_b');
    cy.get(properties).should('contain.text', secondPath).and('not.contain.text', outsidePath);
    cy.then(() => {
      cy.get(`${properties} time`).should('have.attr', 'datetime', modified[secondPath]);
      cy.get(properties).should('not.contain.text', hashes[secondPath]);
    });
    cy.get(`${git} [data-workspace-path="${firstPath}"]`).click();
    cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(
      'have.attr',
      'data-file-path',
      firstPath
    );
    cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'git_a');
    cy.get(`${git} [data-workspace-path="${secondPath}"]`).click();
    cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(
      'have.attr',
      'data-file-path',
      secondPath
    );
    cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'git_b');
    cy.get('[data-slot="shell-file-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-open-project-code-command"]').click();
    cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(
      'have.attr',
      'data-file-path',
      secondPath
    );
    cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'git_b');
    cy.get('[data-slot="canvas-workspace-tab"]').click();
    cy.get(code).should('not.be.visible');
    cy.get(`${main} .react-flow__viewport`)
      .should('be.visible')
      .should(($viewport) => {
        expect($viewport[0]).to.equal(viewport);
        expect($viewport.attr('style')).to.equal(transform);
      });
    cy.get(`${main} [data-slot="canvas-explorer-git-toggle"]`).click();
    cy.get(code).should('be.visible');
    cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(
      'have.attr',
      'data-file-path',
      secondPath
    );
    cy.get(properties).should('contain.text', secondPath);
    cy.get('[data-slot="canvas-workspace-tab"]').click();
    cy.get(`${main} [data-slot="canvas-explorer-elements-toggle"]`).click();
    cy.get(code).should('not.be.visible');
    cy.get('[data-slot="shell-file-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-open-project-code-command"]').click();
    cy.get(code).should('be.visible');
    cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(
      'have.attr',
      'data-file-path',
      secondPath
    );
    cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'git_b');
    cy.get('[data-slot="canvas-workspace-tab"]').click();
    cy.get(`${main} .react-flow__viewport`)
      .should('be.visible')
      .should(($viewport) => {
        expect($viewport[0]).to.equal(viewport);
        expect($viewport.attr('style')).to.equal(transform);
      });
    cy.get('@fileWrites.all').should('have.length', 0);
    readLiveGraphDraft(undefined, { failOnStatusCode: false }).then(({ status, body }) => {
      if (graphBefore === undefined) throw new Error('Persisted graph baseline was not captured.');
      const draft = WorkspaceGraphDraftReadResponseSchema.parse(body);
      expect(status, 'persisted graph presence is unchanged').to.equal(graphBefore.status);
      expect(draft.kind).to.equal(graphBefore.body.kind);
      if (draft.kind === 'ok' && graphBefore.body.kind === 'ok') {
        expect(draft.record, 'persisted graph record is unchanged').to.deep.equal(
          graphBefore.body.record
        );
      }
    });
    for (const path of Object.keys(files)) {
      readLiveWorkspaceFile(path).then(({ status, body }) => {
        expect(status).to.equal(200);
        expect((body as { contentSha256: string }).contentSha256).to.equal(hashes[path]);
      });
    }
  });

  it('preserves a conflicted project buffer before admitting another node inspection', () => {
    const handoffRoot = 'git-handoff-dbt';
    const handoffCanvas = 'git-handoff-dbt-files';
    const editedPath = `${handoffRoot}/models/handoff_a.sql`;
    const targetPath = `${handoffRoot}/models/handoff_b.sql`;
    const externalSql = 'select 101 as handoff_external\n';
    const main = '[data-slot="canvas-workspace-surface"]';
    const code = '[data-slot="canvas-code-workspace-surface"]';
    const target = `${main} .react-flow__node[data-id="model.git_handoff_dbt.handoff_b"]`;
    let loadedRevision: string;
    let editor: HTMLElement;
    resetE2eApiStubs();
    seedLiveWorkspaceFiles({
      [`${handoffRoot}/dbt_project.yml`]:
        "name: git_handoff_dbt\nversion: '1.0'\nconfig-version: 2\nprofile: dvt_live_proof\nmodel-paths: ['models']\n",
      [editedPath]: 'select 11 as handoff_loaded\n',
      [targetPath]: 'select 22 as handoff_target\n',
    }).then(() => adoptLiveDbtProjectFileAuthority(handoffRoot, handoffCanvas));
    cy.intercept({ method: 'POST', pathname: '/workspace/files/**' }).as('handoffFileWrite');
    cy.viewport(1500, 900);
    visitWithLiveWorkspaceSession(
      `/canvas?authority=dbt-project-files&canvasId=${handoffCanvas}&projectRoot=${handoffRoot}`
    );
    cy.get(target, { timeout: 60_000 }).should('be.visible');
    cy.get(`${main} .react-flow__controls-fitview`).click();
    cy.get(`${main} [data-slot="canvas-explorer-git-toggle"]`).click();
    cy.get(`${code} [data-workspace-path="${editedPath}"]`).click();
    cy.get(`${code} [data-slot="workspace-file-code-editor"]`)
      .should('be.visible')
      .and('have.attr', 'data-file-path', editedPath)
      .then(($editor) => {
        editor = $editor[0]!;
      });
    cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'handoff_loaded');
    readLiveWorkspaceFile(editedPath).then(({ status, body }) => {
      expect(status).to.equal(200);
      const file = body as { contentSha256: string };
      expect(file.contentSha256).to.match(/^[a-f0-9]{64}$/);
      loadedRevision = file.contentSha256;
    });
    replaceLiveWorkspaceFile(editedPath, externalSql);
    cy.get(`${code} [data-testid="monaco-code-editor"] .view-lines`).click();
    cy.focused()
      .should(($input) => {
        expect($input.is('textarea, [contenteditable="true"]')).to.equal(true);
      })
      .type('{ctrl+end}{enter}-- handoff_pending');
    cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'handoff_pending');
    cy.wait('@handoffFileWrite').then(({ request, response }) => {
      expect(request.body.expectedRevision).to.deep.equal({
        kind: 'content_sha256',
        value: loadedRevision,
      });
      expect(request.body.content).to.contain('handoff_pending');
      expect(response?.statusCode).to.equal(409);
    });
    cy.get(`${code} [data-slot="code-working-tree-status"]`).should(
      'have.attr',
      'data-phase',
      'conflict'
    );
    cy.get('[data-slot="canvas-workspace-tab"]').click();
    cy.get(target).find('[data-slot="graph-node-card-title"]').dblclick();
    cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(($editor) => {
      expect($editor[0], 'conflicted project editor is retained after node inspection').to.equal(
        editor
      );
    });
    cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'handoff_pending');
    cy.get(`${main} [data-slot="canvas-explorer-git-toggle"]`).click();
    cy.get(code).should('be.visible');
    cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(($editor) =>
      expect($editor[0]).to.equal(editor)
    );
    cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'handoff_pending');
    cy.get(`${code} [data-slot="code-working-tree-status"]`).should(
      'have.attr',
      'data-phase',
      'conflict'
    );
    readLiveWorkspaceFile(editedPath).then(({ status, body }) => {
      expect(status).to.equal(200);
      expect((body as { content: string }).content).to.equal(externalSql);
    });
    cy.get(`${code} [data-slot="code-working-tree-status"][data-phase="conflict"] button`)
      .should('have.length', 1)
      .click();
    cy.get(`${code} [data-slot="code-working-tree-status"]`).should(
      'have.attr',
      'data-phase',
      'synchronized'
    );
    cy.get(`${code} .monaco-editor .view-lines`)
      .should('contain.text', 'handoff_external')
      .and('not.contain.text', 'handoff_pending');
    cy.get('[data-slot="canvas-workspace-tab"]').click();
    cy.get(target).find('[data-slot="graph-node-card-title"]').dblclick();
    cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should('not.exist');
    cy.get('[data-slot="canvas-node-workbench-panel"] [data-slot="workspace-file-code-editor"]')
      .should('be.visible')
      .and('have.attr', 'data-file-path', targetPath);
    cy.get('[data-slot="canvas-node-workbench-tab-code"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.get('[data-slot="canvas-node-workbench-panel"] .monaco-editor .view-lines').should(
      'contain.text',
      'handoff_target'
    );
    cy.get('@handoffFileWrite.all').should('have.length', 1);
  });
});

/**
 * Owned concern: zoom and source-rail layout preserve the draft, search and graph fit.
 * @baseline SaveWorkspaceGraphDraft: viewport gestures do not persist draft changes.
 * @decision Measure all writes after the hydrated model has been durably synchronized.
 * @consequence Bootstrap normalization cannot race the viewport-only assertions.
 * @version 1.0.1
 */
import { WorkspaceGraphDraftReadResponseSchema } from '@dvt/contracts';

import { revealOperationalDrawer } from '../../support/canvasExecutionSelection';
import {
  adoptLiveDbtProjectFileAuthority,
  seedLiveWorkspaceFiles,
} from '../../support/dbtProjectLive';
import {
  getE2eApiCalls,
  installE2eApiFetchStub,
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
  revealWorkbenchCard,
} from '../../support/relationalWorkbench/navigation';
import { moveWorkbenchCard, panWorkbenchViewport } from '../../support/relationalWorkbench/pointer';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

function assertExplorerWidth(scope: string, widthPercent: number): void {
  cy.get(`${scope} [data-panel-id$="-dock"]`)
    .should('be.visible')
    .should(($dock) => {
      const dock = $dock[0];
      if (dock === undefined) throw new Error('Expected the visible explorer dock.');
      const group = dock.parentElement;
      if (group === null) throw new Error('Expected the explorer dock to belong to a panel group.');
      const groupWidth = group.getBoundingClientRect().width;
      expect(groupWidth, 'the panel group has a measured width').to.be.greaterThan(0);
      expect(
        Number(dock.getAttribute('data-panel-size')),
        'rendered panel percentage'
      ).to.be.closeTo(widthPercent, 0.1);
      expect(
        (dock.getBoundingClientRect().width / groupWidth) * 100,
        'visible width percentage'
      ).to.be.closeTo(widthPercent, 0.25);
    });
}

function assertModelCardTypography(): void {
  // Main and Model share type roles, while Model keeps its geometry and neutral operation identity.
  cy.get('[data-slot="canvas-relational-tree-node"]').should(($nodes) => {
    for (const node of $nodes.toArray()) {
      const style = node.ownerDocument.defaultView!.getComputedStyle(node);
      const title = node.querySelector<HTMLElement>('[data-slot="canvas-relational-node-title"]')!;
      const titleStyle = node.ownerDocument.defaultView!.getComputedStyle(title);
      expect(style.fontFamily).to.contain('IBM Plex Sans');
      expect(titleStyle.fontSize).to.equal('14px');
      expect(titleStyle.lineHeight).to.equal('20px');
      expect(titleStyle.textOverflow).to.equal('ellipsis');
      expect(title.getAttribute('title')).to.equal(title.textContent);
      expect(style.height, 'summary geometry is unchanged').to.equal('76px');
      expect(style.boxShadow).not.to.equal('none');
      const token =
        node.getAttribute('aria-selected') === 'true' ? '--surface-selected' : '--surface-elevated';
      const color = style.getPropertyValue(token).trim();
      const rgb = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
      expect(style.backgroundColor, `${node.dataset.operator} uses the common surface`).to.equal(
        `rgb(${rgb.join(', ')})`
      );
    }
  });
  cy.get('[data-slot="canvas-relational-tree-source"] > span:first-child span span')
    .should('have.css', 'font-size', '14px')
    .and('have.css', 'line-height', '20px')
    .should(($name) => {
      expect(
        $name[0]!.ownerDocument.defaultView!.getComputedStyle($name[0]!).fontFamily
      ).to.contain('IBM Plex Sans');
    });
  cy.get('[data-slot="canvas-relational-tree-output"]').should(($output) => {
    const output = $output[0]!;
    const window = output.ownerDocument.defaultView!;
    const style = window.getComputedStyle(output);
    const identity = output.querySelector(
      '[data-slot="canvas-relational-tree-output-open"] > span'
    )!;
    const name = window.getComputedStyle(identity.children[0]!);
    const label = window.getComputedStyle(identity.children[1]!);
    expect(name.fontSize).to.equal('14px');
    expect(name.lineHeight).to.equal('20px');
    expect(label.fontSize).to.equal('12px');
    expect(label.lineHeight).to.equal('16px');
    const ring = style.getPropertyValue('--canvas-node-port-output-ring').trim();
    const rgb = [1, 3, 5].map((offset) => Number.parseInt(ring.slice(offset, offset + 2), 16));
    expect(style.borderTopColor, 'Output is a role rather than a successful execution').to.equal(
      `rgb(${rgb.join(', ')})`
    );
    expect(identity.clientWidth).to.be.at.most(output.clientWidth);
  });
}

function assertResizeHandlePresentation(
  selector: string,
  direction: 'horizontal' | 'vertical'
): void {
  cy.get(selector)
    .should('be.focused')
    .should(($handle) => {
      const handle = $handle[0];
      if (handle === undefined) throw new Error('Expected the focused resize handle.');
      const window = handle.ownerDocument.defaultView;
      if (window === null) throw new Error('Expected the resize handle browser window.');
      const style = window.getComputedStyle(handle);
      const hitArea = window.getComputedStyle(handle, '::after');
      const bounds = handle.getBoundingClientRect();
      expect(handle.matches(':focus-visible'), 'keyboard resize keeps a visible focus cue').to.be
        .true;
      expect(style.outlineStyle).to.equal('none');
      expect(style.boxShadow, 'one-pixel white focus offset').to.contain(
        'rgb(255, 255, 255) 0px 0px 0px 1px'
      );
      expect(style.boxShadow, 'outer focus ring').to.match(/0px 0px 0px 2px/);
      expect(hitArea.position).to.equal('absolute');
      expect(hitArea.content).not.to.equal('none');
      expect(Number.parseFloat(hitArea.top)).to.be.closeTo(0, 0.1);
      if (direction === 'horizontal') {
        expect(bounds.width, 'visible vertical divider').to.be.closeTo(1, 0.1);
        expect(Number.parseFloat(hitArea.width), 'horizontal pointer target').to.be.closeTo(4, 0.1);
        expect(Number.parseFloat(hitArea.height)).to.be.closeTo(bounds.height, 0.5);
        expect(hitArea.translate).to.match(/^-50%(?: 0px)?$/);
      } else {
        expect(bounds.height, 'visible horizontal divider').to.be.closeTo(1, 0.1);
        expect(Number.parseFloat(hitArea.height), 'vertical pointer target').to.be.closeTo(4, 0.1);
        expect(Number.parseFloat(hitArea.width)).to.be.closeTo(bounds.width, 0.5);
        expect(Number.parseFloat(hitArea.left)).to.be.closeTo(0, 0.1);
        expect(hitArea.translate).to.equal('0px -50%');
        const grip = handle.firstElementChild;
        const icon = grip?.querySelector('svg');
        if (grip == null || icon == null)
          throw new Error('Expected the drawer resize grip and icon.');
        const gripStyle = window.getComputedStyle(grip);
        expect(gripStyle.rotate).to.equal('90deg');
        expect(Number.parseFloat(gripStyle.width)).to.be.closeTo(12, 0.1);
        expect(Number.parseFloat(gripStyle.height)).to.be.closeTo(16, 0.1);
        expect(grip.getBoundingClientRect().width, 'rotated grip width').to.be.closeTo(16, 0.5);
        expect(grip.getBoundingClientRect().height, 'rotated grip height').to.be.closeTo(12, 0.5);
        const iconStyle = window.getComputedStyle(icon);
        expect(Number.parseFloat(iconStyle.width)).to.be.closeTo(10, 0.1);
        expect(Number.parseFloat(iconStyle.height)).to.be.closeTo(10, 0.1);
      }
    });
}

describe('Workbench viewport', () => {
  beforeEach(() => {
    stubWorkbenchScenario('saved-join');
  });
  it('uses the arrow and left drag for the background and an arrowless cross for cards', () => {
    // Panning must move the camera, while dragging a card must keep its separate gesture owner.
    cy.viewport(1280, 800);
    visitWorkbenchCanvas();
    const main = '[data-slot="canvas-workspace-surface"]';
    const pane = `${main} .react-flow__pane`;
    const viewport = `${main} .react-flow__viewport`;
    const card = `${main} .react-flow__node.draggable`;
    let cardPosition = '';
    let camera: DOMMatrixReadOnly;

    cy.get(card).first().as('movableCard').should('have.css', 'cursor', 'crosshair');
    cy.get('@movableCard').then(($card) => {
      cardPosition = $card[0]!.style.transform;
    });
    cy.get(pane).should('have.css', 'cursor', 'default');
    cy.get(`${main} .react-flow__controls-interactive`).should('not.exist');
    cy.get(`${main} .react-flow__controls-fitview`).click();
    cy.get(viewport).should(($viewport) => {
      camera = new DOMMatrixReadOnly($viewport[0]!.style.transform);
      expect(camera.a).to.be.lessThan(1);
    });
    panWorkbenchViewport(pane, 48, 24, () => {
      cy.get(pane).should('have.class', 'dragging').and('have.css', 'cursor', 'grabbing');
    });
    cy.get(pane).should('not.have.class', 'dragging').and('have.css', 'cursor', 'default');
    cy.get(viewport).should(($viewport) => {
      const moved = new DOMMatrixReadOnly($viewport[0]!.style.transform);
      expect(moved.m41).to.be.closeTo(camera.m41 + 48, 2);
      expect(moved.m42).to.be.closeTo(camera.m42 + 24, 2);
      expect(moved.a).to.equal(camera.a);
    });
    cy.get('@movableCard').should(($card) => {
      expect($card[0]!.style.transform).to.equal(cardPosition);
    });
    cy.get('@movableCard').find('[data-slot="graph-node-card-header"]').as('cardDragTarget');
    moveWorkbenchCard('@cardDragTarget', 30, 15);
    cy.get('@movableCard')
      .should('have.css', 'cursor', 'crosshair')
      .and(($card) => {
        expect($card[0]!.style.transform).not.to.equal(cardPosition);
      });
    cy.get(`${main} .react-flow__handle.source`)
      .first()
      .as('sourcePort')
      .should('have.css', 'cursor', 'grab');
    moveWorkbenchCard('@sourcePort', 24, -30, undefined, () => {
      cy.get('@sourcePort')
        .should('have.class', 'connectingfrom')
        .and('have.css', 'cursor', 'grabbing');
      cy.get(pane).should('have.css', 'cursor', 'default');
      cy.get('@movableCard').should('have.css', 'cursor', 'crosshair');
    });
    cy.get(pane).should('have.css', 'cursor', 'default');
    cy.then(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
    });
  });
  it('uses the same pointer policy in the synthetic composition laboratory', () => {
    // The composition lab consumes the same gesture contract as the persisted Canvas.
    cy.visit('/lab/relational-composition');
    cy.get('.react-flow__node.draggable').first().should('have.css', 'cursor', 'crosshair');
    cy.get('.react-flow__pane').should('have.css', 'cursor', 'default');
    panWorkbenchViewport('.react-flow__pane', 24, 16, () => {
      cy.get('.react-flow__pane')
        .should('have.class', 'dragging')
        .and('have.css', 'cursor', 'grabbing');
    });
    cy.get('.react-flow__pane')
      .should('not.have.class', 'dragging')
      .and('have.css', 'cursor', 'default');
    cy.then(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
    });
  });
  it('retains the Canvas while browsing Git and opening a project file', () => {
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
    const git = `[data-slot="canvas-activity-rail-host"] [data-slot="canvas-explorer-git-toggle"]`;
    const code = '[data-slot="canvas-code-workspace-surface"]';
    const tree = `${code} [data-slot="route-workbench-left-panel"]`;
    const properties = `${code} [data-slot="route-workbench-right-panel"] [role="region"]`;
    cy.get(`${main} .react-flow__viewport`).should(($viewport) => {
      expect($viewport[0]!.style.transform).to.contain('scale(0.82)');
    });
    cy.get(`${main} section[aria-labelledby$="-elements-button"] input[type="search"]`).type(
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
      for (const panel of ['elements']) {
        cy.get(
          `[data-slot="canvas-activity-rail-host"] [data-slot="canvas-explorer-${panel}-toggle"]`
        ).click();
        cy.get(code).should('not.be.visible');
        assertStationary();
      }
      cy.get(`${main} section[aria-labelledby$="-elements-button"] input`).should(
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
  describe('Explorer layout', () => {
    const main = '[data-slot="canvas-workspace-surface"]';
    const model = '[data-slot="canvas-relational-tree-workbench"]';
    const canvasEntry = 'a[data-slot="left-navigation-link"][href="/canvas"]';
    const modelViewport = '[data-slot="canvas-relational-tree-viewport"]';
    const modelZoom = '[data-slot="canvas-relational-tree-zoom"]';
    const modelSearch = '[data-slot="canvas-relational-tree-sources"] input';

    beforeEach(() => {
      cy.viewport(1280, 720);
      visitWorkbenchCanvas();
      cy.get(`${main} [data-element-id]:visible`).should('have.length', 3);
      assertExplorerWidth(main, 22);
    });

    function resizeExplorer(
      scope: string,
      direction: 'LEFT' | 'RIGHT',
      widthPercent: number
    ): void {
      const handle = `${scope} [role="separator"][aria-label="Resize explorer"]`;
      cy.get(handle).focus();
      cy.press(Cypress.Keyboard.Keys[direction]);
      assertExplorerWidth(scope, widthPercent);
      // A working resize alone would miss a CSS regression in the hit target or keyboard focus.
      assertResizeHandlePresentation(handle, 'horizontal');
    }

    function reopenExplorerFromView(): void {
      cy.get('[data-slot="shell-menu-trigger"]').click();
      cy.get('[data-slot="canvas-explorer-view-command"]')
        .should('have.attr', 'aria-checked', 'false')
        .click();
      cy.get(canvasEntry).should('be.visible').and('have.attr', 'aria-expanded', 'true');
    }

    function fitAndOpenModel(): void {
      cy.get(`${main} .react-flow__controls-fitview`).click();
      openWorkbenchModel();
    }

    it('keeps zoom, source search and narrow reflow while toggling the rail', () => {
      // Layout gestures must preserve the editor's local search and camera without saving semantics.
      let writesBeforeZoom = 0;
      let zoomBeforeCollapse = '';
      let expandedViewportWidth = 0;
      cy.get(`${main} .react-flow__node`)
        .its('length')
        .then((count) => {
          openWorkbenchModel();
          cy.get(`${main} .react-flow__node`).should('have.length', count);
        });
      cy.get('[data-slot="canvas-relational-tree-source-list"] > li').each(($row) => {
        const [source, add] = Array.from($row[0]!.querySelectorAll('button'));
        expect(source, 'source control').to.exist;
        expect(add, 'instance control').to.exist;
        const sourceBounds = source!.getBoundingClientRect();
        const addBounds = add!.getBoundingClientRect();
        const addCenter = addBounds.top + addBounds.height / 2;
        expect(addCenter, 'instance control stays beside its source').to.be.within(
          sourceBounds.top,
          sourceBounds.bottom
        );
      });
      cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
      assertModelCardTypography();
      // Verify the exact focus token at native scale before exercising fractional graph zoom.
      cy.get(modelZoom).should('have.text', '100%');
      revealWorkbenchCard('[data-slot="canvas-relational-tree-node"][data-operator="join"]');
      cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]')
        .should('be.focused')
        .and('have.css', 'outline-style', 'solid')
        .and('have.css', 'outline-width', '2px')
        .and('have.css', 'outline-offset', '2px');
      cy.then(() => {
        writesBeforeZoom = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
      });
      verifyWheelZoom(modelViewport);
      revealCardDetails(1);
      cy.get('[data-slot="canvas-relational-tree-detail"]').should('not.exist');
      revealWorkbenchCard('[data-slot="canvas-relational-card-detail"]');
      cy.get('[data-slot="canvas-relational-card-detail"]').should('contain.text', 'EQUAL');
      cy.get('[data-slot="canvas-relational-expression-node"]')
        .first()
        .should('have.css', 'font-size', '13px')
        .and('have.css', 'line-height', '20px')
        .should(($expression) => {
          expect(
            $expression[0]!.ownerDocument.defaultView!.getComputedStyle($expression[0]!).fontFamily
          ).to.contain('IBM Plex Mono');
        });
      cy.screenshot('semantic-editor-card-expressions');
      verifyCompleteTreeFit(modelViewport);
      cy.get('[data-slot="canvas-relational-card-detail"]').should('have.length', 1);
      cy.get(modelSearch).type('customers');
      resizeExplorer(model, 'RIGHT', 32);
      cy.get(modelZoom)
        .invoke('text')
        .then((zoom) => {
          zoomBeforeCollapse = zoom;
        });
      cy.get(modelViewport).then(($viewport) => {
        const viewport = $viewport[0];
        if (viewport === undefined) throw new Error('Expected the relational tree viewport.');
        expandedViewportWidth = viewport.clientWidth;
      });
      cy.get(`${model} button[aria-label="Collapse explorer"]:visible`).click();
      cy.get(canvasEntry).should('be.focused').and('have.attr', 'aria-expanded', 'false');
      cy.get(modelViewport).should(($viewport) => {
        const viewport = $viewport[0];
        if (viewport === undefined) throw new Error('Expected the resized relational viewport.');
        expect(viewport.clientWidth).to.be.greaterThan(expandedViewportWidth);
      });
      cy.get(modelZoom).should(($zoom) => {
        expect($zoom.text(), 'collapsing the rail retains Model zoom').to.equal(zoomBeforeCollapse);
      });
      cy.get('[data-slot="canvas-relational-tree-source-list"]').should('not.be.visible');
      verifyCompleteTreeFit(modelViewport);
      cy.screenshot('semantic-editor-sources-collapsed');
      cy.get(canvasEntry).focus();
      cy.press(Cypress.Keyboard.Keys.ENTER);
      cy.get(canvasEntry).should('have.attr', 'aria-expanded', 'true').click();
      cy.get(canvasEntry).should('have.attr', 'aria-expanded', 'true');
      cy.get('[data-slot="canvas-model-main-tab"]').should('have.attr', 'aria-selected', 'true');
      assertExplorerWidth(model, 32);
      cy.get(modelSearch).should('have.value', 'customers').clear();
      cy.get('[data-slot="canvas-relational-tree-sources"]').should('have.length', 1);
      cy.get('[data-slot="canvas-relational-tree-source"]').should('have.length', 2);
      cy.get(`${model} [data-slot="canvas-explorer-sources-toggle"]`).should('not.exist');
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
      revealWorkbenchCard('[data-slot="canvas-relational-tree-node"][data-operator="join"]');
      cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').click();
      cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').should(
        'have.attr',
        'aria-selected',
        'true'
      );
      cy.get('[data-canvas-inspector="true"]:visible').should(($panel) => {
        const bounds = $panel[0]!.getBoundingClientRect();
        expect(bounds.left).to.be.at.least(0);
        expect(bounds.right).to.be.at.most(640);
        expect(bounds.bottom).to.be.at.most(450);
      });
      cy.get('[data-slot="canvas-relational-collapse"]').should('be.visible').click();
      revealWorkbenchCard('[data-slot="canvas-relational-tree-node"][data-operator="join"]');
      cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]')
        .should('be.focused')
        .and('have.css', 'outline-style', 'solid')
        .should(($node) => {
          // CSS zoom snaps outlines to device pixels; reflow must preserve a visible focus cue.
          const style = $node[0]!.ownerDocument.defaultView!.getComputedStyle($node[0]!);
          expect(Number.parseFloat(style.outlineWidth)).to.be.greaterThan(0);
          expect(Number.parseFloat(style.outlineOffset)).to.be.greaterThan(0);
        });
      cy.get('[data-slot="canvas-model-toolbar"]').should(($footer) => {
        expect($footer[0]!.getBoundingClientRect().bottom).to.be.at.most(450);
      });
      cy.screenshot('semantic-editor-200-percent-equivalent-reflow');
      assertExplorerWidth(model, 32);
      cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
      cy.then(() => {
        expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writesBeforeZoom);
      });
    });

    it('shares resized width across retained and reopened Canvas and Model surfaces', () => {
      // Both surfaces consume one width preference; switching views must retain their live DOM state.
      let writesBeforeResize = 0;
      let drawerSizeBeforeResize = 0;
      let retainedMainViewport: HTMLElement | undefined;
      let retainedModelViewport: HTMLElement | undefined;
      let retainedModelZoom = '';
      resizeExplorer(main, 'LEFT', 15);
      cy.get(`${main} .react-flow__viewport`).then(($viewport) => {
        retainedMainViewport = $viewport[0];
      });
      cy.get(`${main} button[aria-label="Collapse explorer"]:visible`).click();
      cy.get(canvasEntry).should('be.visible').click();
      assertExplorerWidth(main, 15);
      cy.get(`${main} button[aria-label="Close explorer"]:visible`).click();
      cy.get(canvasEntry).should('be.visible').and('have.attr', 'aria-expanded', 'false');
      reopenExplorerFromView();
      cy.get(`${main} [data-element-id]:visible`).should('have.length', 3);
      assertExplorerWidth(main, 15);
      openWorkbenchModel();
      assertExplorerWidth(model, 15);
      cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
      cy.then(() => {
        writesBeforeResize = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
      });
      // The shared primitive also owns the vertical drawer, whose grip and keyboard cue must survive.
      revealOperationalDrawer();
      const drawer = '#app-shell-bottom-drawer-panel';
      const drawerHandle = '#app-shell-bottom-drawer-resize-handle';
      cy.get(drawer).then(($drawer) => {
        drawerSizeBeforeResize = Number($drawer.attr('data-panel-size'));
      });
      cy.get(drawerHandle).focus();
      cy.press(Cypress.Keyboard.Keys.UP);
      cy.get(drawer).should(($drawer) => {
        expect(Number($drawer.attr('data-panel-size'))).to.be.greaterThan(drawerSizeBeforeResize);
      });
      assertResizeHandlePresentation(drawerHandle, 'vertical');
      cy.press(Cypress.Keyboard.Keys.DOWN);
      cy.get(drawer).should(($drawer) => {
        expect(Number($drawer.attr('data-panel-size'))).to.be.closeTo(drawerSizeBeforeResize, 0.1);
      });
      cy.get('[data-slot="bottom-operational-drawer-close"]').click();
      cy.get(drawerHandle).should('not.exist');
      cy.get(modelSearch).type('customers');
      resizeExplorer(model, 'RIGHT', 25);
      cy.get(modelViewport).then(($viewport) => {
        retainedModelViewport = $viewport[0];
      });
      cy.get(modelZoom)
        .invoke('text')
        .then((zoom) => {
          retainedModelZoom = zoom;
        });
      cy.get('[data-slot="canvas-workspace-tab"]').click();
      assertExplorerWidth(main, 25);
      cy.get(`${main} .react-flow__viewport`).should(($viewport) => {
        expect($viewport[0], 'resizing the Model retains the Main Canvas').to.equal(
          retainedMainViewport
        );
      });
      cy.get('[data-slot="canvas-model-main-tab"]').click();
      assertExplorerWidth(model, 25);
      cy.get(modelViewport).should(($viewport) => {
        expect($viewport[0], 'switching tabs retains the Model viewport').to.equal(
          retainedModelViewport
        );
      });
      cy.get(modelZoom).should(($zoom) => {
        expect($zoom.text(), 'switching tabs retains Model zoom').to.equal(retainedModelZoom);
      });
      cy.get(modelSearch).should('have.value', 'customers').clear();
      cy.get('[data-slot="canvas-model-tab-close"]').click();
      cy.get('[data-slot="canvas-model-editor"]').should('not.exist');
      assertExplorerWidth(main, 25);
      fitAndOpenModel();
      assertExplorerWidth(model, 25);
      cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
      cy.then(() => {
        expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writesBeforeResize);
      });
    });

    it('restores collapsed and closed explorer modes with their width after reload', () => {
      // Reload must rehydrate disclosure and width together, without reopening a rail the user hid.
      let writesBeforeDisclosure = 0;
      openWorkbenchModel();
      cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
      cy.then(() => {
        writesBeforeDisclosure = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
      });
      resizeExplorer(model, 'RIGHT', 32);
      cy.get(`${model} button[aria-label="Collapse explorer"]`).click();
      cy.get(canvasEntry).should('have.attr', 'aria-expanded', 'false');
      cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
      cy.then(() => {
        expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(
          writesBeforeDisclosure
        );
      });
      // Reload can normalize the fixture again; the no-write assertion belongs to
      // the completed presentation gestures above, not a fresh bootstrap.
      cy.on('window:before:load', installE2eApiFetchStub);
      cy.reload();
      cy.get(canvasEntry).should('be.visible').and('have.attr', 'aria-expanded', 'false');
      cy.get(`${main} [data-panel-id$="-dock"]`).should('not.be.visible');
      cy.get(canvasEntry).click();
      assertExplorerWidth(main, 32);
      fitAndOpenModel();
      assertExplorerWidth(model, 32);
      cy.get(`${model} button[aria-label="Close explorer"]`).click();
      cy.get(canvasEntry).should('be.visible').and('have.attr', 'aria-expanded', 'false');
      cy.reload();
      cy.get(canvasEntry).should('be.visible').and('have.attr', 'aria-expanded', 'false');
      cy.get(`${main} [data-panel-id$="-dock"]`).should('not.be.visible');
      // The one Canvas destination can also reopen a durably closed Explorer.
      cy.get(canvasEntry).click().should('have.attr', 'aria-expanded', 'true');
      assertExplorerWidth(main, 32);
      cy.get(`${main} button[aria-label="Close explorer"]:visible`).click();
      reopenExplorerFromView();
      assertExplorerWidth(main, 32);
      fitAndOpenModel();
      assertExplorerWidth(model, 32);
    });
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
    // Real file and graph baselines distinguish clean browsing from accidental persistence.
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
    cy.get(`[data-slot="canvas-activity-rail-host"] [data-slot="canvas-explorer-git-toggle"]`, {
      timeout: 60_000,
    }).should('be.visible');
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
    cy.get(
      `[data-slot="canvas-activity-rail-host"] [data-slot="canvas-explorer-git-toggle"]`
    ).click();
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
    cy.get(`${git} [data-workspace-path="${firstPath}"]`).should('be.visible');
    cy.get(`${git} [data-workspace-path="${projectRoot}/models"]`).then(($directory) => {
      const directory = $directory[0]!;
      cy.then(() => {
        cy.get(`${git} [data-workspace-path="${projectRoot}/models"]`).click();
        cy.get(`${git} [data-workspace-path="${firstPath}"]`).should('not.exist');
        cy.get(`${git} [data-workspace-path="${secondPath}"]`).should('not.exist');
        cy.get('[data-slot="canvas-workspace-tab"]').click();
        cy.get(code).should('not.be.visible');
        cy.get(main).should('be.visible');
        cy.get('[data-slot="canvas-code-main-tab"]').click();
        cy.get(code).should('be.visible');
        cy.get(`${git} [data-workspace-path="${projectRoot}/models"]`).should(($current) => {
          expect($current[0], 'the real directory survives the workspace roundtrip').to.equal(
            directory
          );
        });
        cy.get(`${git} [data-workspace-path="${firstPath}"]`).should('not.exist');
        cy.get(`${git} [data-workspace-path="${secondPath}"]`).should('not.exist');
        // Elements may refresh the scoped catalogue; disclosure itself retains
        // the existing Code tree and performs no file or semantic writes.
        cy.get(`${git} [data-workspace-path="${projectRoot}/models"]`).click();
        cy.get(`${git} [data-workspace-path="${firstPath}"]`).should('be.visible');
      });
    });
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
    cy.get(
      `[data-slot="canvas-activity-rail-host"] [data-slot="canvas-explorer-git-toggle"]`
    ).click();
    cy.get(code).should('be.visible');
    cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(
      'have.attr',
      'data-file-path',
      secondPath
    );
    cy.get(properties).should('contain.text', secondPath);
    cy.get('[data-slot="canvas-workspace-tab"]').click();
    cy.get('a[data-slot="left-navigation-link"][href="/canvas"]').click();
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

  it('hands read-only project Code to node inspection without writes or viewport movement', () => {
    // Inspecting another node must hand off read-only Code without moving or rewriting the graph.
    const handoffRoot = 'git-handoff-dbt';
    const handoffCanvas = 'git-handoff-dbt-files';
    const sourcePath = `${handoffRoot}/models/handoff_a.sql`;
    const targetPath = `${handoffRoot}/models/handoff_b.sql`;
    const main = '[data-slot="canvas-workspace-surface"]';
    const code = '[data-slot="canvas-code-workspace-surface"]';
    const target = `${main} .react-flow__node[data-id="model.git_handoff_dbt.handoff_b"]`;
    const hashes: Record<string, string> = {};
    let viewport: HTMLElement | undefined;
    let transform: string | null = null;
    resetE2eApiStubs();
    seedLiveWorkspaceFiles({
      [`${handoffRoot}/dbt_project.yml`]:
        "name: git_handoff_dbt\nversion: '1.0'\nconfig-version: 2\nprofile: dvt_live_proof\nmodel-paths: ['models']\n",
      [sourcePath]: 'select 11 as handoff_loaded\n',
      [targetPath]: 'select 22 as handoff_target\n',
    }).then(() => adoptLiveDbtProjectFileAuthority(handoffRoot, handoffCanvas));
    for (const path of [sourcePath, targetPath]) {
      readLiveWorkspaceFile(path).then(({ status, body }) => {
        expect(status).to.equal(200);
        hashes[path] = (body as { contentSha256: string }).contentSha256;
        expect(hashes[path]).to.match(/^[a-f0-9]{64}$/);
      });
    }
    cy.intercept({ method: 'POST', pathname: '/workspace/files/**' }).as('handoffFileWrite');
    cy.viewport(1500, 900);
    visitWithLiveWorkspaceSession(
      `/canvas?authority=dbt-project-files&canvasId=${handoffCanvas}&projectRoot=${handoffRoot}`
    );
    cy.get(target, { timeout: 60_000 }).should('be.visible');
    cy.get(`${main} .react-flow__controls-fitview`).click();
    cy.get(`${main} .react-flow__viewport`)
      .should('be.visible')
      .then(($viewport) => {
        viewport = $viewport[0]!;
        transform = viewport.getAttribute('style');
      });
    cy.get(
      '[data-slot="canvas-activity-rail-host"] [data-slot="canvas-explorer-git-toggle"]'
    ).click();
    cy.get(`${code} [data-workspace-path="${sourcePath}"]`).click();
    cy.get(`${code} [data-slot="workspace-file-code-editor"]`)
      .should('be.visible')
      .and('have.attr', 'data-file-path', sourcePath);
    cy.get(`${code} [data-testid="monaco-code-editor"]`).should('not.exist');
    cy.get(`${code} [data-testid="monaco-code-viewer"] .view-lines`).should(
      'contain.text',
      'handoff_loaded'
    );
    cy.get(`${code} [data-testid="monaco-code-viewer"] .view-line`).first().click();
    cy.get(`${code} [data-testid="monaco-code-viewer"] textarea.inputarea`)
      .should('have.prop', 'readOnly', true)
      .and('be.focused');
    cy.get(`${code} [data-testid="monaco-code-viewer"] textarea.inputarea`).type(
      'handoff_blocked',
      { force: true, delay: 0 }
    );
    cy.get(`${code} .view-lines`).should('not.contain.text', 'handoff_blocked');
    cy.get(`${code} [data-slot="code-working-tree-status"]`).should(
      'have.attr',
      'data-phase',
      'read_only'
    );
    cy.get('[data-slot="canvas-workspace-tab"]').click();
    cy.get(`${main} .react-flow__viewport`)
      .should('be.visible')
      .should(($viewport) => {
        expect($viewport[0]).to.equal(viewport);
        expect($viewport.attr('style')).to.equal(transform);
      });
    cy.get(target).find('[data-slot="graph-node-card-title"]').click();
    cy.get('[data-slot="canvas-node-workbench-tab-code"]').should('be.visible').click();
    cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should('not.exist');
    cy.get('[data-slot="canvas-node-workbench-panel"] [data-slot="workspace-file-code-editor"]')
      .should('be.visible')
      .and('have.attr', 'data-file-path', targetPath);
    cy.get('[data-slot="canvas-node-workbench-tab-code"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.get(
      '[data-slot="canvas-node-workbench-panel"] [data-testid="monaco-code-viewer"] .view-lines'
    ).should('contain.text', 'handoff_target');
    cy.get('[data-slot="canvas-node-workbench-panel"] [data-testid="monaco-code-editor"]').should(
      'not.exist'
    );
    cy.get(`${main} .react-flow__viewport`).should(($viewport) => {
      expect($viewport[0]).to.equal(viewport);
      expect($viewport.attr('style')).to.equal(transform);
    });
    cy.get('@handoffFileWrite.all').should('have.length', 0);
    for (const path of [sourcePath, targetPath]) {
      readLiveWorkspaceFile(path).then(({ status, body }) => {
        expect(status).to.equal(200);
        expect((body as { contentSha256: string }).contentSha256).to.equal(hashes[path]);
      });
    }
  });
});

/** Owned concern: keyboard Model entry and workspace navigation, without authoring scenarios. */
import { getE2eApiCalls } from '../../support/e2eApiStub';
import {
  openWorkbenchProperties,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Workbench navigation', () => {
  beforeEach(() => {
    stubWorkbenchScenario('saved-join');
  });
  it('keeps Canvas cards and zoom stationary while inspecting Source and Model properties', () => {
    cy.viewport(1280, 720);
    visitWorkbenchCanvas();
    // Wait for the fixture's initial fit (capped at 82%), not an arbitrary delay.
    cy.get('.react-flow__viewport').should(($viewport) => {
      expect($viewport[0]!.style.transform).to.contain('scale(0.82)');
    });
    for (const zoomOut of [false, true]) {
      if (zoomOut) {
        cy.get('.react-flow__viewport').then(($viewport) => {
          const previousZoom = new DOMMatrix($viewport[0]!.style.transform).a;
          cy.get('.react-flow__controls-zoomout').click();
          cy.get('.react-flow__viewport').should(($current) => {
            expect(new DOMMatrix($current[0]!.style.transform).a).to.be.lessThan(previousZoom);
          });
        });
      }
      cy.get('.react-flow__viewport').then(($viewport) => {
        const viewport = $viewport[0]!;
        const document = viewport.ownerDocument;
        const transform = viewport.getAttribute('style');
        const host = document.querySelector('[data-testid="canvas-viewport"]')!;
        const hostBounds = host.getBoundingClientRect();
        const explorerToggle = document.querySelector(
          '[data-slot="canvas-explorer-sources-toggle"]'
        )!;
        expect(explorerToggle.getAttribute('aria-expanded')).to.equal('true');
        const dock = document.getElementById(explorerToggle.getAttribute('aria-controls')!)!;
        const dockWidth = dock.getBoundingClientRect().width;
        expect(dockWidth, 'visible Explorer width before Properties').to.be.greaterThan(0);
        const nodeIds = ['source-customers', 'source-orders', 'join-transform'];
        const cards = nodeIds.map((nodeId) => {
          const card = document.querySelector(`.react-flow__node[data-id="${nodeId}"]`)!;
          const bounds = card.getBoundingClientRect();
          return { nodeId, x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
        });
        expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
        for (const [step, nodeId] of (
          [
            'source-customers',
            'source-orders',
            null,
            'source-customers',
            null,
            'join-transform',
            null,
          ] as const
        ).entries()) {
          const phase = `${zoomOut ? 'zoomed-out' : 'initial-fit'} step ${step + 1} ${nodeId ?? 'close'}`;
          if (nodeId === null) {
            cy.get('[data-slot="canvas-node-workbench-close"]').click();
            cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
          } else {
            cy.get(`.react-flow__node[data-id="${nodeId}"] [data-slot="graph-node-card-title"]`)
              .should('be.visible')
              .click();
            cy.get('[data-slot="canvas-node-workbench-overlay"]')
              .should('be.visible')
              .and(($panel) => {
                expect($panel[0]!.tagName).to.equal('ASIDE');
                const bounds = $panel[0]!.getBoundingClientRect();
                expect(bounds.right).to.be.closeTo(1280, 30);
                expect(bounds.width).to.be.at.most(450);
              });
            if (nodeId !== 'join-transform') {
              cy.get('[data-slot="canvas-node-workbench-tab-columns"]').should(
                'have.attr',
                'aria-selected',
                'true'
              );
              cy.get('[data-slot="canvas-open-semantic-editor"]').should('not.exist');
            }
            cy.get('[data-slot="canvas-node-workbench-drag-handle"]').should('not.exist');
          }
          cy.get('[data-slot="canvas-model-editor"]').should('not.exist');
          cy.get('.react-flow__viewport').should(($current) => {
            expect($current[0], `${phase}: viewport identity`).to.equal(viewport);
            expect($current.attr('style'), `${phase}: viewport transform`).to.equal(transform);
            for (const card of cards) {
              const bounds = document
                .querySelector(`.react-flow__node[data-id="${card.nodeId}"]`)!
                .getBoundingClientRect();
              expect(
                bounds.left + bounds.width / 2,
                `${phase}: ${card.nodeId} screen center x`
              ).to.be.closeTo(card.x, 1);
              expect(
                bounds.top + bounds.height / 2,
                `${phase}: ${card.nodeId} screen center y`
              ).to.be.closeTo(card.y, 1);
            }
            expect(
              dock.getBoundingClientRect().width,
              `${phase}: Explorer width`
            ).to.be.greaterThan(0);
            expect(dock.getBoundingClientRect().width, `${phase}: Explorer width`).to.be.closeTo(
              dockWidth,
              1
            );
            expect(
              host.getBoundingClientRect().left,
              `${phase}: Canvas host screen origin x`
            ).to.be.closeTo(hostBounds.left, 1);
            expect(
              host.getBoundingClientRect().top,
              `${phase}: Canvas host screen origin y`
            ).to.be.closeTo(hostBounds.top, 1);
          });
          cy.then(() => {
            expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
          });
        }
      });
    }
    cy.then(() => {
      const calls = getE2eApiCalls(/.*/);
      expect(
        calls
          .filter((call) => /sample|preview/.test(call.url.pathname))
          .map((call) => call.url.pathname)
      ).to.deep.equal([]);
    });
  });
  it('opens and closes the Model by its supported keyboard and workspace controls', () => {
    cy.viewport(1280, 720);
    visitWorkbenchCanvas();

    cy.get('.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]')
      .should('have.attr', 'aria-keyshortcuts', 'Enter')
      .should('be.visible')
      .focus()
      .should('be.focused')
      .type('{enter}');

    cy.get('[data-slot="canvas-model-main-tab"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-slot="canvas-model-editor"]').should('be.focused');
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.get(
      '[data-slot="canvas-relational-tree-workbench"] [data-slot="canvas-explorer-sources-toggle"]'
    ).should('be.focused');
    cy.get('[data-slot="canvas-model-view-tab"]').should('not.exist');
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="semantic"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-workbench"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-source"]')
      .should('have.length', 2)
      .each(($source) => {
        cy.wrap($source).should('contain.text', 'Participating');
      });
    cy.get('[data-slot="canvas-relational-tree"]').should('contain.text', 'JOIN');
    cy.get('[data-slot="canvas-relational-tree-layout"]')
      .should('have.attr', 'data-layout', 'graph')
      .and('have.attr', 'data-direction', 'left-to-right');
    cy.get('[data-slot="canvas-relational-tree-viewport"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]')
      .should('have.length', 2)
      .each(($card) => {
        cy.wrap($card).should('not.contain.text', 'READ');
        cy.wrap($card).find('[data-slot="canvas-relational-node-title"]').should('not.be.empty');
      });
    cy.get('[data-slot="canvas-relational-tree-input-label"][data-role="left"] text')
      .should('be.visible')
      .and('have.text', 'L');
    cy.get('[data-slot="canvas-relational-tree-input-label"][data-role="right"] text')
      .should('be.visible')
      .and('have.text', 'R');
    cy.get('[data-slot="canvas-model-toolbar"]').should(($toolbar) => {
      expect($toolbar[0]!.getBoundingClientRect().height).to.be.at.most(48);
      expect($toolbar.find('[role="tab"], button')).to.have.length(0);
    });
    cy.get('[data-slot="canvas-model-editor"]').should(($editor) => {
      const footer = $editor.find('[data-slot="canvas-model-toolbar"]')[0]!;
      const viewport = $editor.find('[data-slot="canvas-relational-tree-viewport"]')[0]!;
      expect(footer.tagName).to.equal('FOOTER');
      expect(footer.getBoundingClientRect().top).to.be.at.least(
        viewport.getBoundingClientRect().bottom
      );
    });
    cy.get('[data-slot="canvas-relational-tree-zoom"]')
      .invoke('text')
      .should('match', /^\d+%$/);
    cy.screenshot('semantic-editor-wide');

    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers').click();
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-workbench"] button[aria-label="Zoom out"]').click();
    cy.get(
      '[data-slot="canvas-relational-tree-workbench"] button[aria-label="Fit graph to view"]'
    ).click();
    cy.get('[data-slot="canvas-relational-tree-zoom"]')
      .invoke('text')
      .should('match', /^\d+%$/);
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
    cy.viewport(1024, 720);
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('not.exist');
    cy.get('[data-slot="canvas-model-view-tab"]').should('not.exist');
    cy.screenshot('semantic-editor-compact');
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.get('.react-flow__node[data-id="join-transform"]').should('exist');
    openWorkbenchProperties('join-transform');
    cy.get('[data-slot="canvas-node-workbench-tab-general"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.get(
      '[data-slot="canvas-node-workbench-header-actions"] [data-slot="canvas-open-semantic-editor"]'
    )
      .should('be.visible')
      .and('have.attr', 'aria-label', 'Open semantic editor');
    cy.get('[data-slot="canvas-node-workbench-general-content"]')
      .should('be.visible')
      .find('[data-slot="canvas-open-semantic-editor"]')
      .should('not.exist');
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="canvas-node-workbench-columns-section"]').should(
      'contain.text',
      'customer'
    );
    cy.get(
      '[data-slot="dvt-relation-authoring"], [data-slot="dvt-relational-operation-chooser"]'
    ).should('not.exist');
    cy.get('[data-slot="canvas-node-workbench-tab-code"]').click();
    cy.get('[data-slot="canvas-node-workbench-code-content"]')
      .should('be.visible')
      .find('[data-slot="canvas-open-semantic-editor"]')
      .should('not.exist');
    for (const [width, height] of [
      [1366, 768],
      [1920, 1080],
      [3440, 1440],
      [900, 720],
      [640, 450],
    ] as const) {
      cy.viewport(width, height);
      cy.get('[data-slot="canvas-node-workbench-code-content"] .monaco-editor')
        .should('be.visible')
        .and(($editor) => {
          const editor = $editor[0]!;
          const panel = editor.closest('[data-slot="canvas-node-workbench-panel"]')!;
          const content = editor.closest('[data-slot="canvas-node-workbench-code-content"]')!;
          const bounds = editor.getBoundingClientRect();
          const panelBounds = panel.getBoundingClientRect();
          const viewport = editor.ownerDocument.defaultView!;
          const controls = [
            ...panel.querySelectorAll<HTMLButtonElement>(
              '[data-slot="canvas-node-workbench-header-actions"] button'
            ),
          ];
          expect(controls.map((control) => control.dataset.slot)).to.deep.equal([
            'canvas-open-semantic-editor',
            'canvas-node-workbench-help',
            'canvas-node-workbench-close',
          ]);
          const controlBounds = controls.map((control) => control.getBoundingClientRect());
          controlBounds.forEach((control, index) => {
            expect(control.width, 'compact header target width').to.be.closeTo(28, 0.5);
            expect(control.height, 'compact header target height').to.be.closeTo(28, 0.5);
            expect(control.left).to.be.at.least(Math.max(panelBounds.left, 0));
            expect(control.right).to.be.at.most(Math.min(panelBounds.right, viewport.innerWidth));
            expect(control.top + control.height / 2).to.be.closeTo(
              controlBounds[0]!.top + controlBounds[0]!.height / 2,
              1
            );
            if (index > 0)
              expect(control.left, 'adjacent controls without overlap').to.be.closeTo(
                controlBounds[index - 1]!.right,
                0.5
              );
          });
          expect(bounds.height, 'usable code editor height').to.be.greaterThan(0);
          if (width >= 1024) expect(bounds.height).to.be.at.least(160);
          expect(bounds.bottom, 'editor fills remaining Code height').to.be.closeTo(
            content.getBoundingClientRect().bottom,
            2
          );
          expect(bounds.bottom, 'editor stays inside visible Inspector').to.be.at.most(
            Math.min(panelBounds.bottom, viewport.innerHeight)
          );
          expect(bounds.left, 'editor stays inside visible Inspector').to.be.at.least(
            Math.max(panelBounds.left, 0)
          );
          expect(bounds.right, 'editor stays inside Inspector width').to.be.at.most(
            Math.min(panelBounds.right, viewport.innerWidth)
          );
          expect(
            editor.querySelector('.view-lines')?.textContent?.replace(/\s/g, ''),
            'rendered canonical code'
          ).to.contain('schemaVersion');
        });
      cy.get('[data-slot="dvt-transform-output-view"]').should(($output) => {
        expect($output[0]!.scrollWidth, 'output has no horizontal overflow').to.be.at.most(
          $output[0]!.clientWidth
        );
        const select = $output[0]!.querySelector<HTMLSelectElement>('select')!;
        const label = select.labels?.[0];
        expect(label, 'native accessible output label').not.to.equal(undefined);
        const caption = label!.querySelector('span')!.getBoundingClientRect();
        const control = select.getBoundingClientRect();
        expect(label!.textContent).to.contain('Output view');
        expect(caption.top + caption.height / 2, 'one compact selector row').to.be.closeTo(
          control.top + control.height / 2,
          1
        );
        expect(label!.getBoundingClientRect().height, 'no stacked label row').to.be.at.most(
          Math.max(caption.height, control.height) + 2
        );
        expect($output.find('p').text(), 'no technical document caption').not.to.match(
          /Canonical Substrait document|Documento Substrait|SHA-256/
        );
      });
      cy.get('[data-slot="canvas-node-workbench-panel"]').screenshot(
        `inspector-code-visible-${width}`
      );
    }
    cy.viewport(1024, 720);
    cy.get('[data-slot="dvt-transform-output-view-selector"]').focus().should('be.focused');
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().closest('.monaco-editor').should('have.length', 1);
    cy.get('[data-slot="canvas-node-workbench-tabs-list"] [role="tab"]')
      .last()
      .should('have.attr', 'data-slot', 'canvas-node-workbench-tab-code');
    cy.get('[data-slot="canvas-node-workbench-tab-general"]').click();
    cy.get('[data-slot="canvas-node-workbench-tab-code"]').click();
    cy.get('[data-slot="canvas-node-workbench-code-content"] .monaco-editor')
      .should('be.visible')
      .and(($editor) => {
        expect($editor[0]!.getBoundingClientRect().height).to.be.at.least(160);
      });
    cy.get('[data-slot="dvt-transform-output-view-selector"]').select('postgres-sql');
    cy.get('[data-slot="canvas-node-workbench-code-content"] [data-testid="monaco-code-viewer"]')
      .should('have.length', 1)
      .find('.view-lines')
      .should(($lines) => {
        expect($lines.text(), 'derived SQL uses the shared viewer').to.match(/\bselect\b/i);
      });
    cy.get('[data-slot="canvas-node-workbench-code-content"] .monaco-editor').should(($editor) => {
      expect(
        $editor[0]!.getBoundingClientRect().height,
        'SQL keeps the usable editor height'
      ).to.be.at.least(160);
      expect(
        $editor[0]!.getBoundingClientRect().bottom,
        'SQL fills remaining height'
      ).to.be.closeTo(
        $editor[0]!
          .closest('[data-slot="canvas-node-workbench-code-content"]')!
          .getBoundingClientRect().bottom,
        2
      );
    });
    cy.viewport(1024, 600);
    cy.get('[data-slot="canvas-node-workbench-code-content"] .monaco-editor').should(($editor) => {
      expect($editor[0]!.getBoundingClientRect().bottom, 'SQL adapts after resize').to.be.closeTo(
        $editor[0]!
          .closest('[data-slot="canvas-node-workbench-code-content"]')!
          .getBoundingClientRect().bottom,
        2
      );
    });
    cy.get('[data-slot="canvas-node-workbench-panel"]').screenshot('inspector-derived-sql');
    cy.get('[data-slot="dvt-transform-output-view-selector"]').select('substrait');
    cy.get('[data-slot="canvas-node-workbench-code-content"] .view-lines').should(
      'contain.text',
      'schemaVersion'
    );
    cy.then(() => {
      expect(
        getE2eApiCalls('/workspace/graph/draft', 'PUT'),
        'inspection does not save the graph'
      ).to.have.length(0);
    });
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    // Bring the card back into view after deliberately resizing the viewport.
    cy.get('.react-flow__controls-fitview').should('be.visible').click();
    openWorkbenchProperties('join-transform');
    cy.get('[data-slot="canvas-node-workbench-tab-general"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.get(
      '[data-slot="canvas-node-workbench-header-actions"] [data-slot="canvas-open-semantic-editor"]'
    )
      .focus()
      .should('be.focused');
    cy.get('[role="tooltip"]').should('contain.text', 'Open semantic editor');
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.get('[data-slot="canvas-node-workbench-help"]').should('be.focused');
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.get('[data-slot="canvas-node-workbench-close"]').should('be.focused');
    cy.get('[data-slot="canvas-open-semantic-editor"]').focus().should('be.focused').click();
    cy.get('[data-slot="canvas-model-main-tab"]')
      .should('have.length', 1)
      .and('have.attr', 'aria-selected', 'true');
    cy.get('[data-slot="canvas-relational-tree"]').should('contain.text', 'JOIN');
  });
});

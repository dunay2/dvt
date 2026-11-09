/** Owned concern: discover operations with keyboard, without changing semantics until Apply. */
import {
  openWorkbenchModel,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { semanticWrites } from '../../support/relationalWorkbench/persistence';
import { panWorkbenchViewport } from '../../support/relationalWorkbench/pointer';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

const trigger = '[data-slot="canvas-operation-menu-trigger"]';
const search = '[role="combobox"]';

function addFilterFromBackground(viewportSelector: string): void {
  let expectedPosition = { x: 0, y: 0 };
  let pointerPosition = { x: 0, y: 0 };
  let zoomBefore = '';
  cy.get('[data-slot="canvas-relational-tree-zoom"]')
    .parent()
    .find('button[aria-label="Zoom in"]')
    .click();
  panWorkbenchViewport(viewportSelector, 42, 26);
  cy.get('[data-slot="canvas-relational-tree-zoom"]').then(($zoom) => {
    zoomBefore = $zoom.text();
  });
  cy.get(viewportSelector).then(($viewport) => {
    const surface = $viewport[0]!;
    const bounds = surface.getBoundingClientRect();
    const content = surface.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-tree"], [data-slot="canvas-relational-tree-draft"]'
    )!;
    const background = new Set<Element | null>([
      surface,
      content,
      surface.querySelector('[data-slot="canvas-relational-tree-layout"]'),
    ]);
    let point: { x: number; y: number } | undefined;
    for (let y = 8; y < bounds.height && point == null; y += 24) {
      for (let x = 8; x < bounds.width && point == null; x += 24) {
        if (background.has(surface.ownerDocument.elementFromPoint(bounds.left + x, bounds.top + y)))
          point = { x, y };
      }
    }
    expect(point, 'visible background belonging to this Model viewport').not.to.equal(undefined);
    pointerPosition = point!;
    const contentBounds = content.getBoundingClientRect();
    const zoom = Number.parseFloat(content.style.zoom);
    expectedPosition = {
      x: (bounds.left + point!.x - contentBounds.left) / zoom,
      y: (bounds.top + point!.y - contentBounds.top) / zoom,
    };
    cy.get(viewportSelector).dblclick(point!.x, point!.y);
  });
  cy.get('[data-slot="popover-content"] [role="combobox"]').should('be.focused').type('{esc}');
  cy.get('[role="listbox"]').should('not.exist');
  cy.get(viewportSelector).should('be.focused');
  cy.then(() => expect(semanticWrites('join-transform')).to.have.length(0));
  // Reopen at the same pointer after pan/zoom; keyboard search retains the actual placement point.
  cy.get(viewportSelector).then(() =>
    cy.get(viewportSelector).dblclick(pointerPosition.x, pointerPosition.y)
  );
  cy.get('[data-slot="canvas-model-editor"]').screenshot(
    viewportSelector.includes('draft')
      ? 'model-background-add--pending'
      : 'model-background-add--applied'
  );
  cy.get('[data-slot="popover-content"] [role="combobox"]')
    .should('be.focused')
    .type('Filter{enter}');
  cy.get('[role="listbox"]').should('not.exist');
  cy.get('[data-pending-operation="true"] [data-operator="filter"]').should('have.length', 1);
  cy.get('[data-slot="canvas-relational-tree-zoom"]').should(($zoom) => {
    expect($zoom.text()).to.equal(zoomBefore);
  });
  cy.get('[data-pending-operation="true"] [data-operator="filter"]')
    .closest('[data-slot="canvas-relational-card"]')
    .should(($card) => {
      expect(Number.parseFloat($card[0]!.style.left)).to.be.closeTo(expectedPosition.x, 1);
      expect(Number.parseFloat($card[0]!.style.top)).to.be.closeTo(expectedPosition.y, 1);
    });
  cy.then(() => expect(semanticWrites('join-transform')).to.have.length(0));
}

describe('Compact semantic operation menu', () => {
  beforeEach(() => {
    stubWorkbenchScenario('pending-join');
    cy.viewport(1280, 800);
    visitWorkbenchCanvas();
    openWorkbenchModel();
  });
  it('keeps one entry at rest, searches all groups and restores focus without writes', () => {
    cy.get('[data-slot="canvas-relational-tree-operation-shelf"] button').should('have.length', 1);
    cy.get('[role="listbox"]').should('not.exist');
    cy.get(trigger)
      .focus()
      .should('be.focused')
      .then(() => cy.press(Cypress.Keyboard.Keys.ENTER));
    cy.get(search).should('be.focused');
    cy.get('[data-operation="filter"]')
      .should('have.attr', 'aria-disabled', 'false')
      .and('have.attr', 'draggable', 'true');
    cy.get(search).type('does-not-exist');
    cy.contains('No matching operations.').should('be.visible');
    cy.get(search).type('{esc}');
    cy.get(trigger).should('be.focused');
    cy.get('[role="listbox"]').should('not.exist');
    cy.then(() => expect(semanticWrites('join-transform')).to.have.length(0));
  });
  it('shares background Add, keyboard search and pointer placement in a pending Model', () => {
    // A pending Model must use the same Add command as its toolbar without requiring a canonical tree.
    addFilterFromBackground('[data-slot="canvas-relational-tree-draft-viewport"]');
  });
  it('places a pending Filter without an Input and cancels without semantic writes', () => {
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]').should('not.exist');
    cy.get(trigger).click();
    cy.get('[data-operation="filter"]').scrollIntoView().click();
    cy.get('[data-pending-operation="true"] [data-operator="filter"]').should('exist');
    cy.get('[data-slot="canvas-staged-operation-inspector"]')
      .should('contain.text', 'Pending')
      .find('[data-slot="canvas-staged-operation-input-property"]')
      .should('contain.text', 'Missing');
    cy.then(() => expect(semanticWrites('join-transform')).to.have.length(0));
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-pending-operation="true"]').should('not.exist');
    cy.then(() => expect(semanticWrites('join-transform')).to.have.length(0));
  });
  it('chooses the exact JOIN by search and keyboard, then cancels without persisting it', () => {
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers').click();
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'orders').click();
    cy.get(trigger).click();
    for (const heading of ['Combine', 'Transform', 'Order and limit']) {
      cy.contains('[cmdk-group-heading]', heading).should('exist');
    }
    cy.screenshot('operation-menu-groups');
    cy.get(search).type('LEFT JOIN');
    cy.get('[data-operation="left_join"]')
      .should('have.css', 'font-family')
      .and('contain', 'sans-serif');
    cy.get('[role="option"][data-selected="true"]').should('contain.text', 'LEFT JOIN');
    cy.get(search).type('{enter}');
    cy.get('[role="listbox"]').should('not.exist');
    cy.get('[data-operator="join"]').should('contain.text', 'LEFT JOIN');
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-operator="join"]').should('not.exist');
    cy.then(() => expect(semanticWrites('join-transform')).to.have.length(0));
  });
  it('keeps the menu inside a narrow viewport and closes on outside activation', () => {
    cy.viewport(820, 700);
    cy.get(trigger).click();
    cy.get('[data-slot="popover-content"]').then(($menu) => {
      const bounds = $menu[0]!.getBoundingClientRect();
      expect(bounds.left).to.be.at.least(0);
      expect(bounds.right).to.be.at.most(820);
    });
    cy.screenshot('compact-operation-menu');
    cy.get('[data-slot="canvas-relational-tree-source"]').first().click();
    cy.get('[role="listbox"]').should('not.exist');
    cy.then(() => expect(semanticWrites('join-transform')).to.have.length(0));
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-cancel"]').should('not.exist');
  });
});

describe('Applied Model background Add entry', () => {
  it('opens the same operation menu and stages at the projected point without applying', () => {
    // Opening from an applied view must retain its command and layout session when staging begins.
    stubWorkbenchScenario('saved-join');
    cy.viewport(1280, 800);
    visitWorkbenchCanvas();
    openWorkbenchModel();
    addFilterFromBackground('[data-slot="canvas-relational-tree-viewport"]');
  });
});

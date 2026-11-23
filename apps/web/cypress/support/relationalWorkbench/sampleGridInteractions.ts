/** Exercise interactions on the displayed sample while retaining its query identity. */
import { getE2eApiCalls } from '../e2eApiStub';

export const tableSelector = '[data-slot="bottom-operational-data-table"]';
export const frameSelector = '[data-slot="bottom-operational-data-table-frame"]';
export const searchSelector = '[data-slot="data-grid-toolbar"] input[type="search"]';

export function inspectColumnType(): void {
  cy.get(tableSelector).find('tbody tr').should('have.length', 20);
  const nameHeader = `${tableSelector} [data-column-id="name"]`;
  cy.get(nameHeader).closest('th').should('have.text', 'name');
  cy.get(nameHeader).trigger('pointermove', {
    eventConstructor: 'PointerEvent',
    pointerType: 'mouse',
  });
  cy.contains('[data-slot="tooltip-content"]', 'name · Type: string').should('be.visible');
  cy.press(Cypress.Keyboard.Keys.ESC);
  cy.contains('[data-slot="tooltip-content"]', 'name · Type: string').should('not.exist');
  cy.get(nameHeader).focus();
  cy.contains('[data-slot="tooltip-content"]', 'name · Type: string').should('be.visible');
}

export function toggleEmailColumn(): void {
  const columnPicker = '[data-slot="data-grid-toolbar"] button[aria-label="Show or hide columns"]';
  cy.get(columnPicker).click();
  cy.get('[role="dialog"][aria-label="Show or hide columns"]').within(() => {
    cy.get('button[aria-label="Show email"]').should('have.attr', 'aria-pressed', 'true').click();
    cy.get('button[aria-label="Show email"]').should('have.attr', 'aria-pressed', 'false');
  });
  cy.get(tableSelector).find('[data-column-id="email"]').should('not.exist');
  cy.get(tableSelector).find('tbody tr').first().find('td').should('have.length', 2);
  cy.screenshot('data-grid-column-visibility');
  cy.get('button[aria-label="Show email"]').click();
  cy.press(Cypress.Keyboard.Keys.ESC);
  cy.focused().should('match', columnPicker);
  cy.get(tableSelector).find('tbody tr').first().find('td').should('have.length', 3);
  cy.wrap(null).should(() => {
    expect(getE2eApiCalls(/\/transforms\/transform-customers\/data-sample$/, 'GET')).to.have.length(
      1
    );
  });
}

function pressControlKey(key: string, message: string): void {
  cy.focused().then(($cell) => {
    const cell = $cell[0]!;
    const view = cell.ownerDocument.defaultView!;
    const event = new view.KeyboardEvent('keydown', {
      key,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    expect(cell.dispatchEvent(event), message).to.be.false;
  });
}

export function copySelectedCells(): void {
  const selectedValue = 'td[data-selected="true"] button';
  cy.get(tableSelector).find('tbody tr').first().find('td button').first().click();
  pressControlKey('ArrowRight', 'selection consumes the arrow');
  cy.get(tableSelector).find(selectedValue).should('have.length', 2);
  cy.get(tableSelector).find('tbody tr').first().find('td button').eq(1).click({ ctrlKey: true });
  cy.get(tableSelector).find('tbody tr').eq(1).find('td button').eq(1).click({ ctrlKey: true });
  cy.get(tableSelector).find(selectedValue).should('have.length', 2);
  cy.window().then((window) => {
    const expected = Array.from(window.document.querySelectorAll(`${tableSelector} tbody tr`))
      .slice(0, 2)
      .map((row, index) => {
        const value = row.querySelector(selectedValue)?.textContent;
        return index === 0 ? `${value}\t` : `\t${value}`;
      })
      .join('\n');
    const writeText = cy.stub(window.navigator.clipboard, 'writeText').resolves();
    pressControlKey('c', 'selection consumes copy');
    cy.wrap(writeText).should('have.been.calledOnceWithExactly', expected);
  });
  cy.get('[data-slot="data-grid-toolbar"] button[aria-label="Copy range"]').should('be.enabled');
}

export function changeGridColor(): void {
  cy.get(frameSelector)
    .invoke('css', 'background-image')
    .should('include', 'linear-gradient')
    .then((before) => {
      cy.get<HTMLInputElement>('[data-slot="data-grid-toolbar"] input[type="color"]')
        .should('have.attr', 'aria-label', 'Data grid background color')
        .then(($swatch) => {
          const input = $swatch[0]!;
          const view = input.ownerDocument.defaultView!;
          Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, 'value')!.set!.call(
            input,
            '#e19b57'
          );
          input.dispatchEvent(new view.Event('input', { bubbles: true }));
        });
      cy.get(frameSelector).invoke('css', 'background-image').should('not.equal', before);
    });
}

export function filterAndOrderSample(): void {
  cy.get(searchSelector).type('customer');
  cy.get(tableSelector)
    .find('[data-column-id="name"]')
    .click()
    .should('have.attr', 'data-sort-priority', '1');
  cy.get(tableSelector)
    .find('[data-column-id="country"]')
    .click()
    .should('have.attr', 'data-sort-priority', '2');
  cy.get(tableSelector).find('button[aria-label="Filter email"]').click();
  cy.get('input[aria-label="Filter email"]').type('customer-1@');
  cy.get(tableSelector).find('tbody tr').should('have.length', 1);
  cy.get(tableSelector)
    .find('button[aria-label="Filter email"]')
    .should('have.attr', 'data-filter-priority', '1');
  cy.get(tableSelector)
    .find('[data-column-id="name"]')
    .should('have.attr', 'data-sort', 'ascending');
  cy.get('input[aria-label="Filter email"]').clear();
  cy.press(Cypress.Keyboard.Keys.ESC);
  cy.get(tableSelector).find('tbody tr').should('have.length', 20);
  cy.get(frameSelector)
    .scrollTo(0, 48)
    .should(($frame) => {
      const frame = $frame[0];
      if (frame === undefined) throw new Error('Expected the loaded result frame.');
      expect(frame.scrollTop, 'loaded rows can scroll').to.be.greaterThan(0);
    });
}

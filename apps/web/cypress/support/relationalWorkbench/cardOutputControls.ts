/** Exercise output selection, pointer/keyboard ordering, focus and reload on the real card. */
import { getE2eApiCalls } from '../e2eApiStub';

import { toggleColumns, reloadFieldSelection } from './fieldSelection';
import { savedOutputs } from './savedOutputs';

export function proveCardOutputControls(sourceCount: number): void {
  const card = '.react-flow__node[data-id="join-transform"]';
  const field = (name: string): string =>
    `${card} [data-slot="graph-node-column-piece"][data-column-name="${name}"]`;
  const toggle = `${field('order_id')} [data-slot="graph-node-column-output-state"]`;
  let position: string;
  let originalRows: HTMLElement[];
  let originalToggle: HTMLElement;
  let baseline: ReturnType<typeof savedOutputs>;
  const expectSavedOrder = (names: string[], action: string): void => {
    cy.wrap(null, { timeout: 20_000 }).should(() => {
      expect(getE2eApiCalls('/workspace/graph/draft').at(-1)?.method).to.equal('GET');
      const result = savedOutputs();
      expect(result.operands.length).to.equal(sourceCount);
      expect(
        result.outputs.slice(0, 3).map((output) => output.displayName),
        action
      ).to.deep.equal(names);
      if (baseline != null) {
        expect(result.operands).to.deep.equal(baseline.operands);
        expect(result.predicates).to.deep.equal(baseline.predicates);
      }
    });
  };

  toggleColumns('join-transform');
  cy.get(card).then(($card) => {
    position = $card[0]!.style.transform;
    originalRows = [
      ...$card[0]!.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-row"]'),
    ];
    originalToggle = $card[0]!.querySelector<HTMLElement>(
      '[data-column-name="order_id"] [data-slot="graph-node-column-output-state"]'
    )!;
  });
  cy.get(toggle)
    .should('have.attr', 'aria-disabled', 'false')
    .and('have.attr', 'aria-pressed', 'true')
    .click();
  cy.get(toggle).should('have.attr', 'aria-pressed', 'false');
  cy.get(toggle).should(($toggle) => {
    expect($toggle[0], 'same checkbox after exclusion').to.equal(originalToggle);
    expect($toggle[0]!.ownerDocument.activeElement, 'checkbox focus retained').to.equal(
      originalToggle
    );
  });
  cy.wrap(null, { timeout: 20_000 }).should(() => {
    expect(getE2eApiCalls('/workspace/graph/draft').at(-1)?.method).to.equal('GET');
    const result = savedOutputs();
    expect(
      result.outputs.map((output) => output.displayName),
      'persisted fields after exclusion'
    ).not.to.include('order_id');
    baseline = result;
  });
  cy.get(card).should(($card) => expect($card[0]!.style.transform).to.equal(position));
  cy.get(`${card} [data-slot="graph-node-column-row"]`).should(($rows) => {
    expect($rows.length).to.equal(originalRows.length);
    [...$rows].forEach((row, index) =>
      expect(row, 'unchanged row after save').to.equal(originalRows[index])
    );
  });
  cy.get(toggle).should('have.attr', 'aria-disabled', 'false').click();
  cy.get(toggle).should('have.attr', 'aria-pressed', 'true');
  cy.get(toggle).should(($toggle) =>
    expect($toggle[0], 'same checkbox after inclusion').to.equal(originalToggle)
  );
  expectSavedOrder(['customer_id', 'name', 'order_id'], 'reinclude');

  cy.get(`${card} [data-slot="graph-node-column-piece"][data-output="true"]`).should(($fields) => {
    const outputs = savedOutputs().outputs;
    for (const field of $fields) {
      expect(field.dataset.fieldId, `command identity of ${field.dataset.columnName}`).to.equal(
        outputs.find((output) => output.displayName === field.dataset.columnName)?.fieldId
      );
    }
  });

  cy.window().then((window) => {
    const dataTransfer = new window.DataTransfer();
    cy.get(field('order_id'))
      .should('have.attr', 'draggable', 'true')
      .trigger('dragstart', { dataTransfer });
    cy.get(`${field('customer_id')}[data-output="true"]`)
      .should('have.length', 1)
      .closest('[data-slot="graph-node-column-row"]')
      .trigger('dragover', 'topLeft', { dataTransfer })
      .should('have.attr', 'data-drop-placement', 'before')
      .trigger('drop', 'topLeft', { dataTransfer });
    cy.get(field('order_id')).trigger('dragend');
  });
  cy.get(`${card} [data-slot="graph-node-column-piece"][data-output="true"]`).should(($fields) =>
    expect(
      [...$fields].slice(0, 3).map((element) => element.dataset.columnName),
      'displayed pointer order'
    ).to.deep.equal(['order_id', 'customer_id', 'name'])
  );
  expectSavedOrder(['order_id', 'customer_id', 'name'], 'persisted pointer order');
  cy.get(card).should(($card) => expect($card[0]!.style.transform).to.equal(position));
  reloadFieldSelection();
  cy.get(`${card} [data-slot="graph-node-column-piece"][data-output="true"]`).should(($fields) => {
    expect([...$fields].slice(0, 3).map((element) => element.dataset.columnName)).to.deep.equal([
      'order_id',
      'customer_id',
      'name',
    ]);
  });
  cy.get(toggle).should('have.attr', 'aria-pressed', 'true');
  cy.get(field('order_id')).focus().trigger('keydown', { key: 'ArrowDown', altKey: true });
  expectSavedOrder(['customer_id', 'order_id', 'name'], 'persisted keyboard order');
}

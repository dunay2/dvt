/**
 * Owned concern: prove output selection, ordering and focus through the Model inspector.
 * @baseline GH-3578: canonical identities, operands and predicates survive each save.
 * @decision Retain row/control identity at the current owner and Canvas card position.
 * @consequence Pointer and keyboard ordering must survive an actual reopen.
 * @version 1.0.0
 */
import { getE2eApiCalls } from '../e2eApiStub';

import { openModelOutputs, reloadFieldSelection } from './fieldSelection';
import { savedOutputs } from './savedOutputs';

export function proveCardOutputControls(sourceCount: number): void {
  const card = '.react-flow__node[data-id="join-transform"]';
  const inspector = '[data-slot="canvas-model-output-inspector"]';
  const rows = `${inspector} [data-slot="relation-output-field"]`;
  const selected = `${inspector} [data-slot="relation-output-toggle"][data-included="true"]`;
  const field = (name: string): string =>
    `${rows}:has([data-slot="relation-output-toggle"][data-field-name="${name}"])`;
  const toggle = `${field('order_id')} [data-slot="relation-output-toggle"]`;
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

  cy.get(card).then(($card) => {
    position = $card[0]!.style.transform;
  });
  openModelOutputs();
  cy.get(inspector).then(($panel) => {
    originalRows = [
      ...$panel[0]!.querySelectorAll<HTMLElement>('[data-slot="relation-output-field"]'),
    ];
    originalToggle = $panel[0]!.querySelector<HTMLElement>(
      '[data-slot="relation-output-toggle"][data-field-name="order_id"]'
    )!;
  });
  cy.get(toggle)
    .should('be.enabled')
    .and('not.have.attr', 'aria-disabled', 'true')
    .and('have.attr', 'data-included', 'true')
    .focus()
    .click();
  cy.get(toggle).should('have.attr', 'data-included', 'false');
  cy.get(toggle).should(($toggle) => {
    expect($toggle[0], 'same inclusion control after exclusion').to.equal(originalToggle);
    expect($toggle[0]!.ownerDocument.activeElement, 'inclusion control focus retained').to.equal(
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
  cy.get(rows).should(($rows) => {
    expect($rows.length).to.equal(originalRows.length);
    [...$rows].forEach((row, index) =>
      expect(row, 'unchanged row after save').to.equal(originalRows[index])
    );
  });
  cy.get(toggle).should('not.have.attr', 'aria-disabled', 'true').click();
  cy.get(toggle).should('have.attr', 'data-included', 'true').and('be.focused');
  cy.get(toggle).should(($toggle) =>
    expect($toggle[0], 'same inclusion control after inclusion').to.equal(originalToggle)
  );
  expectSavedOrder(['customer_id', 'name', 'order_id'], 'reinclude');

  cy.get(selected).should(($fields) => {
    const outputs = savedOutputs().outputs;
    for (const field of $fields) {
      expect(
        field.closest<HTMLElement>('[data-slot="relation-output-field"]')?.dataset.fieldId,
        `command identity of ${field.dataset.fieldName}`
      ).to.equal(outputs.find((output) => output.displayName === field.dataset.fieldName)?.fieldId);
    }
  });

  cy.window().then((window) => {
    const dataTransfer = new window.DataTransfer();
    cy.get(field('order_id'))
      .should('have.attr', 'draggable', 'true')
      .trigger('dragstart', { dataTransfer });
    cy.get(field('customer_id'))
      .should('have.length', 1)
      .trigger('dragover', 'topLeft', { dataTransfer })
      .should('have.attr', 'data-drop-placement', 'before')
      .trigger('drop', 'topLeft', { dataTransfer });
    cy.get(field('order_id')).trigger('dragend');
  });
  cy.get(selected).should(($fields) =>
    expect(
      [...$fields].slice(0, 3).map((element) => element.dataset.fieldName),
      'displayed pointer order'
    ).to.deep.equal(['order_id', 'customer_id', 'name'])
  );
  expectSavedOrder(['order_id', 'customer_id', 'name'], 'persisted pointer order');
  cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
  cy.get('[data-slot="canvas-model-tab-close"]').click();
  cy.get(card).should(($card) => expect($card[0]!.style.transform).to.equal(position));
  reloadFieldSelection();
  cy.get(selected).should(($fields) => {
    expect([...$fields].slice(0, 3).map((element) => element.dataset.fieldName)).to.deep.equal([
      'order_id',
      'customer_id',
      'name',
    ]);
  });
  cy.get(toggle).should('have.attr', 'data-included', 'true');
  cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
  cy.get(field('order_id')).focus().should('be.focused').type('{alt}{downarrow}');
  expectSavedOrder(['customer_id', 'order_id', 'name'], 'persisted keyboard order');
  cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
  cy.get(field('order_id')).should('be.focused');
}

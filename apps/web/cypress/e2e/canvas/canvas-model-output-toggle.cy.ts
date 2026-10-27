/** Owned concern: prove Model output authoring and column-menu lifecycle through save and reload. */
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { allocateDvtFieldId, ConnectedSourceRefSchema } from '@dvt/contracts';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../../src/app/services/workspace/workspaceGraphDraftProjection';
import { projectCanonicalNodeToAuthoringNode } from '../../../src/app/views/canvas/canvasDraftAuthoring';
import { createDvtSubstraitProjectionDraft } from '../../../src/app/views/canvas/canvasDvtSubstraitProjection';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { normalizeProjectCanvasDraft } from '../../../src/app/views/canvas/canvasProjectCanvasLifecycle';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import { openModelOutputs } from '../../support/relationalWorkbench/fieldSelection';
import {
  openWorkbenchProperties,
  revisitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { hoverWorkbenchCard } from '../../support/relationalWorkbench/pointer';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

function stubConnectedModel(
  publishAllOutputs = false,
  useRelationshipIdLabels = false
): ReturnType<typeof createDvtSubstraitProjectionDraft> {
  stubShellBootstrapApis({
    scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save'],
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: { dvt: { available: true } },
  });
  const draft = stubStatefulCanvasDraftAuthoring({
    canvasKind: 'transformation',
    columnMapping: true,
    columnMappingNotNullCustomer: true,
  });
  const source = draft.nodes.find((node) => node.id === 'source-orders')!;
  const model = draft.nodes.find((node) => node.id === 'model-orders')!;
  if (useRelationshipIdLabels) {
    source.name = source.id;
    const sink = draft.nodes.find((node) => node.id === 'sink-orders')!;
    sink.name = sink.id;
  }
  const columns = source.metadata!.columns as { name: string; type: string; nullable?: boolean }[];
  const document = createDvtSubstraitProjectionDraft({
    source: {
      nodeId: source.id,
      schema: 'raw',
      table: 'orders',
      sourceRef: ConnectedSourceRefSchema.parse(source.metadata!.connectedSourceRef),
      fields: columns.map((column) => ({ name: column.name, dataType: column.type })),
    },
    targetNodeId: model.id,
    outputs: publishAllOutputs
      ? columns.map((column) => ({
          fieldId: allocateDvtFieldId(),
          name: column.name,
          sourceFieldName: column.name,
        }))
      : [],
  });
  const root = document.plan.relations[0]!.relType;
  if (root.case !== 'root' || root.value.input?.relType.case !== 'project')
    throw new Error('Expected Project root');
  const read = root.value.input.relType.value.input!.relType;
  if (read.case !== 'read') throw new Error('Expected physical Read');
  read.value.baseSchema!.struct!.types.forEach((type, ordinal) => {
    if (columns[ordinal]!.nullable !== false) return;
    if (type.kind.value == null || !('nullability' in type.kind.value))
      throw new Error('Expected nullable physical type');
    type.kind.value.nullability = Type_Nullability.REQUIRED;
  });
  model.metadata = {
    ...model.metadata,
    transformAuthoring: {
      version: 'v1',
      mode: 'substrait',
      semanticDocument: encodeDvtSubstraitSemanticDocument(document),
    },
  };
  const { canonicalNodes } = projectWorkspaceGraphAuthoringDraftSemanticGraph(draft);
  const normalized = normalizeProjectCanvasDraft({
    ...draft,
    nodes: canonicalNodes.map(projectCanonicalNodeToAuthoringNode),
  });
  expect(normalized.nodes.find((node) => node.id === model.id)!.metadata).to.deep.equal(
    model.metadata
  );
  Object.assign(draft, normalized);
  return document;
}

function visitCanvas(): void {
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
      window.localStorage.setItem(
        'dvt-web-canvas-interaction',
        JSON.stringify({
          state: {
            impactOverlayEnabled: false,
            columnLevelLineageEnabled: true,
            canvasLayouts: {},
          },
          version: 0,
        })
      );
    },
  });
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

type DraftSave = {
  draft?: {
    nodes?: Array<{ id?: string; metadata?: Record<string, unknown> }>;
  };
};

function getModelSemanticSaves(): ReturnType<typeof getE2eApiCalls> {
  return getE2eApiCalls('/workspace/graph/draft', 'PUT').filter((call) => {
    const savedModel = (call.body as DraftSave | undefined)?.draft?.nodes?.find(
      (node) => node.id === 'model-orders'
    );
    return savedModel?.metadata?.transformAuthoring != null;
  });
}

function savedOutputNames(index: number): string[] {
  const savedModel = (
    getModelSemanticSaves()[index]?.body as DraftSave | undefined
  )?.draft?.nodes?.find((node) => node.id === 'model-orders');
  const authority = savedModel?.metadata?.transformAuthoring as
    { semanticDocument?: unknown } | undefined;
  const document = decodeDvtSubstraitSemanticDocument(authority?.semanticDocument);
  const { index: relations, schemas } = deriveSubstraitSchemas(document);
  const read = [...relations.relations.values()].find(
    (entry) => entry.relation.relType.case === 'read'
  )!;
  const customerBinding = read.fields.find((field) => field.displayName === 'customer')!;
  const customer = schemas.get(read.binding.relationId)![customerBinding.outputOrdinal]!;
  const customerType = customer.type.kind.value;
  if (customerType == null || !('nullability' in customerType))
    throw new Error('Expected customer nullability');
  expect(customerType.nullability, 'source NN survives inclusion and exclusion').to.equal(
    Type_Nullability.REQUIRED
  );
  return relations.relations
    .get(relations.rootId)!
    .fields.filter((field) => field.parentFieldId == null)
    .toSorted((left, right) => left.outputOrdinal - right.outputOrdinal)
    .map((field) => field.displayName!);
}

function modelCard(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get('.react-flow__node[data-id="model-orders"]');
}

function modelColumnRow(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
  return modelCard().contains('[data-slot="graph-node-column-row"]', name);
}

function expectOutput(name: string, output: boolean): void {
  cy.get(
    `[data-slot="canvas-model-output-inspector"] [data-slot="relation-output-toggle"][data-field-name="${name}"]`
  )
    .should('not.be.disabled')
    .and('have.attr', 'data-included', String(output));
}

function openModelColumns(): void {
  modelCard().contains('button[aria-expanded]:visible', 'Columns').should('be.visible').click();
}

function showCustomerType(): void {
  hoverWorkbenchCard(
    '.react-flow__node[data-id="model-orders"] [data-slot="graph-node-column-piece"][data-column-name="customer"]'
  );
  cy.get('[role="tooltip"]').should('have.text', 'text');
}

function assertColumnMenuStaysOpenAndReopens(): void {
  modelCard()
    .find('[data-slot="graph-node-column-piece"][data-column-name="customer"]')
    .rightclick(20, 10);
  cy.get('[data-slot="graph-node-column-function-menu"]').should('be.visible');
  cy.wait(1500);
  cy.get('[data-slot="graph-node-column-function-menu"]').should('be.visible');
  cy.get('body').type('{esc}');
  cy.get('[data-slot="graph-node-column-function-menu"]').should('not.exist');
  modelCard()
    .find('[data-slot="graph-node-column-piece"][data-column-name="customer"]')
    .rightclick(20, 10);
  cy.get('[data-slot="graph-node-column-function-menu"]').should('be.visible');
}

describe('Canvas Model output toggle lifecycle', () => {
  for (const idLabels of [false, true]) {
    it(`summarizes both real graph relationships without property labels${idLabels ? ' or identity fallbacks' : ''}`, () => {
      cy.viewport(1366, 768);
      stubConnectedModel(true, idLabels);
      visitCanvas();
      openWorkbenchProperties('model-orders');
      cy.get('[data-slot="canvas-node-workbench-tab-inputs-outputs"]').click();
      const records = '[data-slot="node-property-relationship-record"]';
      const summary = '[data-slot="node-property-relationship-summary"]';
      const direction = '[data-slot="node-property-relationship-direction"]';
      const node = '[data-slot="node-property-relationship-node"]';
      const relation = '[data-slot="node-property-relationship-relation"]';
      const connection = '[data-slot="node-property-relationship-connection"]';
      cy.get(records)
        .should('have.length', 2)
        .each(($record, index) => {
          cy.wrap($record).within(() => {
            cy.get(summary).should('be.visible');
            cy.get(direction).should('have.text', index === 0 ? 'Input' : 'Output');
            cy.get(node).should(
              'have.text',
              idLabels ? '-' : index === 0 ? 'Orders source' : 'Orders sink'
            );
            cy.get(relation)
              .should('be.visible')
              .invoke('text')
              .should('match', /^lineage$/i);
            cy.get(summary).should(($header) => {
              const document = $header[0]!.ownerDocument;
              const window = document.defaultView!;
              const host = document.querySelector('[data-slot="canvas-node-workbench-panel"]')!;
              const panel = host.getBoundingClientRect();
              const visibleLeft = Math.max(0, panel.left);
              const visibleRight = Math.min(window.innerWidth, panel.right);
              const relationBounds = $header[0]!.querySelector(relation)!.getBoundingClientRect();
              const evidence = JSON.stringify({
                panel: { left: panel.left, right: panel.right, width: panel.width },
                innerWidth: window.innerWidth,
                scrollClientWidth: host.querySelector('[data-radix-scroll-area-viewport]')
                  ?.clientWidth,
                relation: {
                  left: relationBounds.left,
                  right: relationBounds.right,
                  width: relationBounds.width,
                },
              });
              const centers = [direction, node, relation].map((selector) => {
                const element = $header[0]!.querySelector(selector)!;
                const bounds = element.getBoundingClientRect();
                expect(bounds.left, `${selector} remains visible: ${evidence}`).to.be.at.least(
                  visibleLeft
                );
                expect(bounds.right, `${selector} remains visible: ${evidence}`).to.be.at.most(
                  visibleRight
                );
                return bounds.top + bounds.height / 2;
              });
              expect(
                Math.max(...centers) - Math.min(...centers),
                'direction, node and relation share one business line'
              ).to.be.lessThan(1);
            });
            if (index === 0) {
              cy.get(connection)
                .should('have.text', 'postgres · canvas-e2e-postgres')
                .and(($context) => {
                  const header = $record[0]!.querySelector(summary)!.getBoundingClientRect();
                  const bounds = $context[0]!.getBoundingClientRect();
                  expect(bounds.top, 'connection is secondary context').to.be.at.least(
                    header.bottom
                  );
                  expect($context[0]!.scrollWidth).to.be.at.most($context[0]!.clientWidth + 1);
                });
            } else cy.get(connection).should('not.exist');
            cy.get('dt, dl').should('not.exist');
          });
        });
      cy.get(records).should(($records) => {
        for (const record of $records) {
          const accessibleText = [
            record.textContent,
            ...[record, ...record.querySelectorAll('*')].flatMap((element) =>
              ['title', 'aria-label', 'aria-description'].map(
                (attribute) => element.getAttribute(attribute) ?? ''
              )
            ),
          ].join(' ');
          expect(accessibleText).not.to.include('source-orders');
          expect(accessibleText).not.to.include('sink-orders');
          expect(accessibleText).not.to.match(/nodeId|Node ID|direction:|relation:|connection:/);
        }
      });
      // Keep the image inside the native headless capture surface after
      // checking the wider application viewport above.
      cy.viewport(1100, 600);
      cy.get(relation).should(($relations) => {
        for (const element of $relations) {
          const window = element.ownerDocument.defaultView!;
          const panel = element
            .closest('[data-slot="canvas-node-workbench-panel"]')!
            .getBoundingClientRect();
          const bounds = element.getBoundingClientRect();
          expect(bounds.left).to.be.at.least(Math.max(0, panel.left));
          expect(bounds.right).to.be.at.most(Math.min(window.innerWidth, panel.right));
        }
      });
      cy.get('[data-slot="canvas-node-workbench-panel"]').screenshot(
        `model-relationship-summary${idLabels ? '-identity-fallback' : ''}`
      );
      cy.get('[data-slot="canvas-node-workbench-close"]').click();
      cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
    });
  }

  it('keeps six logical column disclosures compact and keyboard-accessible without writing', () => {
    cy.viewport(1440, 900);
    const document = stubConnectedModel(true);
    const technicalFieldIds = [...deriveSubstraitSchemas(document).index.fields.keys()];
    expect(technicalFieldIds, 'real canonical field identities cover the fixture').not.to.be.empty;
    visitCanvas();
    openWorkbenchProperties('model-orders');
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    const disclosures = '[data-slot="node-property-column-disclosure"]';
    const summaries = `${disclosures} > summary`;
    cy.get(disclosures).should('have.length', 6).and('not.have.attr', 'open');
    for (const [width, height] of [
      [1366, 768],
      [1920, 1080],
      [3440, 1440],
    ]) {
      cy.viewport(width!, height!);
      cy.get(summaries).should(($summaries) => {
        expect([...$summaries].map((summary) => summary.textContent)).to.deep.equal([
          'order_id',
          'customer',
          'amount',
          'status',
          'created_at',
          'region',
        ]);
        for (const summary of $summaries) {
          const window = summary.ownerDocument.defaultView!;
          const style = window.getComputedStyle(summary);
          expect(style.fontSize, 'logical column summary text').to.equal('12px');
          expect(style.lineHeight, 'logical column summary line').to.equal('16px');
          expect(summary.getBoundingClientRect().height, 'single-line summary height').to.be.within(
            28,
            28.5
          );
          const name = summary.querySelector('span')!;
          expect(name.getBoundingClientRect().height, 'one complete name line').to.equal(16);
          const arrow = summary.querySelector(
            '[data-slot="node-property-column-disclosure-arrow"]'
          )!;
          expect(arrow.getBoundingClientRect().width, 'compact chevron width').to.equal(12);
          expect(arrow.getBoundingClientRect().height, 'compact chevron height').to.equal(12);
        }
      });
    }
    cy.viewport(1366, 768);
    cy.get('[data-slot="canvas-node-workbench-panel"]').screenshot(
      'model-columns-compact-six-rows'
    );
    cy.contains(summaries, /^customer$/).as('customerSummary');
    cy.get('[data-slot="node-property-column-list"]')
      .parent('[role="region"]')
      .focus()
      .should('be.focused');
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.contains(summaries, /^order_id$/).should('be.focused');
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.get('@customerSummary').should('be.focused');
    // Cypress 15.18.1 omits Enter's CR text and virtual key code. Send the
    // complete native key so Chromium performs the disclosure's default action.
    cy.then(async () => {
      await Cypress.automation('remote:debugger:protocol', {
        command: 'Input.dispatchKeyEvent',
        params: {
          type: 'keyDown',
          key: 'Enter',
          code: 'Enter',
          windowsVirtualKeyCode: 13,
          nativeVirtualKeyCode: 13,
          text: '\r',
          unmodifiedText: '\r',
        },
      });
      await Cypress.automation('remote:debugger:protocol', {
        command: 'Input.dispatchKeyEvent',
        params: {
          type: 'keyUp',
          key: 'Enter',
          code: 'Enter',
          windowsVirtualKeyCode: 13,
          nativeVirtualKeyCode: 13,
        },
      });
    });
    cy.get('@customerSummary')
      .should('be.focused')
      .parent('details')
      .should('have.prop', 'open', true)
      .and(($details) => {
        const labels = [...$details[0]!.querySelectorAll('dt')].map((label) =>
          label.textContent?.trim().toLowerCase()
        );
        expect(labels, 'complete business metadata').to.deep.equal([
          'type',
          'nullable',
          'key',
          'default',
          'comment',
          'source',
          'selection',
        ]);
        expect(labels, 'English Reference label stays private').not.to.include('reference');
        expect(labels, 'Spanish Reference label stays private').not.to.include('referencia');
        const accessibleText = [
          $details[0]!.textContent,
          ...[$details[0]!, ...$details[0]!.querySelectorAll('*')].flatMap((element) =>
            ['title', 'aria-label', 'aria-description'].map(
              (attribute) => element.getAttribute(attribute) ?? ''
            )
          ),
        ].join(' ');
        for (const fieldId of technicalFieldIds)
          expect(accessibleText, 'canonical field identities stay private').not.to.include(fieldId);
      });
    cy.get('@customerSummary')
      .parent('details')
      .find('dd')
      .should(($values) => {
        const values = [...$values].map((value) => value.textContent);
        expect(values, 'complete expanded type').to.include('text');
        expect(values, 'complete expanded nullability').to.include('not null');
        expect(values, 'complete expanded origin').to.include('Orders source');
        expect(values, 'complete expanded publication selection').to.include('available');
        for (const value of $values) {
          expect(value.scrollWidth, 'expanded metadata stays in its panel').to.be.at.most(
            value.clientWidth + 1
          );
        }
      });
    cy.get(`${disclosures}[open]`).should('have.length', 1);
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.get('@customerSummary')
      .should('be.focused')
      .parent('details')
      .should('have.prop', 'open', false);
    cy.contains(summaries, /^created_at$/)
      .click()
      .parent('details')
      .should('have.prop', 'open', true);
    cy.contains(summaries, /^created_at$/)
      .parent('details')
      .find('dd')
      .should(($values) => {
        expect(
          [...$values].map((value) => value.textContent),
          'complete expanded timestamp type'
        ).to.include('timestamp');
      });
    cy.get(`${disclosures}[open]`).should('have.length', 1);
    cy.get('[data-slot="canvas-node-workbench-panel"]').screenshot(
      'model-columns-compact-expanded'
    );
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
  });

  it('persists one selected inherited output without timed menu dismissal', () => {
    cy.viewport(1920, 1080);
    stubConnectedModel();
    visitCanvas();

    openModelColumns();
    showCustomerType();
    cy.get('[data-slot="tooltip-content"]')
      .should('be.visible')
      .invoke('outerWidth')
      .should('be.lessThan', 160);
    cy.screenshot('column-type-only', { capture: 'viewport' });
    openModelOutputs('model-orders');
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
    expectOutput('customer', false);
    cy.get('[data-slot="relation-output-toggle"][data-field-name="customer"]').click();

    cy.wrap(null).should(() => {
      expect(getModelSemanticSaves()).to.have.length(1);
      expect(savedOutputNames(0)).to.deep.equal(['customer']);
    });
    expectOutput('customer', true);
    expectOutput('order_id', false);
    expectOutput('amount', false);
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');

    revisitWorkbenchCanvas(visitCanvas);
    modelCard()
      .contains('[role="tab"]', /^Output/)
      .click();
    openModelColumns();
    modelColumnRow('customer').should('contain.text', 'NN');
    modelColumnRow('customer')
      .find('[data-slot="graph-node-column-piece"]')
      .should('have.attr', 'data-output', 'true');
    openWorkbenchProperties('model-orders');
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="node-property-column-disclosure"]')
      .should('have.length', 1)
      .and('contain.text', 'customer');
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').should('contain.text', '1');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    showCustomerType();
    assertColumnMenuStaysOpenAndReopens();

    revisitWorkbenchCanvas(visitCanvas);
    openModelColumns();

    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="amount"]')
      .focus()
      .trigger('keydown', { key: 'ArrowUp', altKey: true })
      .trigger('keydown', { key: 'ArrowUp', altKey: true });
    modelCard()
      .find('[data-slot="graph-node-column-piece"]')
      .then(($columns) => {
        expect([...$columns].map((column) => column.dataset.columnName).slice(0, 3)).to.deep.equal([
          'order_id',
          'customer',
          'amount',
        ]);
      });
    cy.then(() => expect(getModelSemanticSaves()).to.have.length(1));

    openModelOutputs('model-orders');
    expectOutput('customer', true);
    cy.get('[data-slot="relation-output-toggle"][data-field-name="customer"]').click();
    cy.wrap(null).should(() => {
      expect(getModelSemanticSaves()).to.have.length(2);
      expect(savedOutputNames(1)).to.deep.equal([]);
    });
    expectOutput('customer', false);
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');

    revisitWorkbenchCanvas(visitCanvas);
    openModelOutputs('model-orders');
    expectOutput('customer', false);
    expectOutput('order_id', false);
    expectOutput('amount', false);
    cy.wrap(null).should(() => {
      expect(getModelSemanticSaves()).to.have.length(2);
    });
  });
});

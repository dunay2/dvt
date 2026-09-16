/** Owned concern: prove Substrait INNER JOIN field authoring through the governed Canvas draft rail. */
import {
  decodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitInnerJoinGroupedWindowDraft,
  inspectDvtSubstraitNInputJoinDraft,
} from '../../../src/app/views/canvas/canvasDvtSubstraitJoinComposition';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  getE2eApiCalls,
  installE2eApiFetchStub,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

type CanvasDraftSaveRequestBody = {
  draft: {
    edges?: Array<{ sourceId: string; targetId: string }>;
    nodes: Array<{
      id: string;
      metadata?: Record<string, unknown>;
    }>;
  };
};

function stubRuntimeCapabilities(): void {
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
  waitForE2eApiCall('/healthz', 'GET');
  waitForE2eApiCall('/capabilities', 'GET');
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

function toggleColumns(nodeId: string): void {
  cy.get(`.react-flow__node[data-id="${nodeId}"]`)
    .find('button[aria-expanded]')
    .contains(/Columns|Columnas/)
    .click();
}

function openJoinWorkbench(): void {
  cy.get(
    '.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]'
  ).rightclick();
  cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Properties').click();
}

function proveCardOutputControls(sourceCount: number): void {
  const card = '.react-flow__node[data-id="join-transform"]';
  const field = (name: string): string =>
    `${card} [data-slot="graph-node-column-piece"][data-column-name="${name}"]`;
  const toggle = `${field('order_id')} [data-slot="graph-node-column-output-state"]`;
  let position: string;
  let baseline: ReturnType<typeof inspectDvtSubstraitNInputJoinDraft>;
  const inspectSave = (): ReturnType<typeof inspectDvtSubstraitNInputJoinDraft> => {
    expect(getE2eApiCalls('/workspace/graph/draft').at(-1)?.method).to.equal('GET');
    const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
      CanvasDraftSaveRequestBody | undefined;
    const node = saved?.draft.nodes.find((candidate) => candidate.id === 'join-transform');
    const authoring = node?.metadata?.transformAuthoring as
      { semanticDocument?: unknown } | undefined;
    return inspectDvtSubstraitNInputJoinDraft(
      decodeDvtSubstraitInnerJoinDocument(authoring?.semanticDocument)
    );
  };
  const expectSavedOrder = (names: string[]): void => {
    cy.wrap(null).should(() => {
      const result = inspectSave();
      expect(result.ok && result.projection.inputs.length).to.equal(sourceCount);
      expect(
        result.ok && result.projection.outputs.slice(0, 3).map((output) => output.name)
      ).to.deep.equal(names);
      if (baseline?.ok && result.ok) {
        expect(result.projection.inputs).to.deep.equal(baseline.projection.inputs);
        expect(result.projection.joins).to.deep.equal(baseline.projection.joins);
      }
    });
  };

  toggleColumns('join-transform');
  cy.get(card).then(($card) => {
    position = $card[0]!.style.transform;
  });
  cy.get(toggle).should('not.be.disabled').and('have.attr', 'aria-pressed', 'true').click();
  cy.get(toggle).should('have.attr', 'aria-pressed', 'false');
  cy.wrap(null).should(() => {
    const result = inspectSave();
    expect(
      result.ok && result.projection.outputs.some((output) => output.name === 'order_id')
    ).to.equal(false);
    baseline = result;
  });
  cy.get(card).should(($card) => expect($card[0]!.style.transform).to.equal(position));
  cy.get(toggle).click();
  cy.get(toggle).should('have.attr', 'aria-pressed', 'true');
  expectSavedOrder(['customer_id', 'name', 'order_id']);

  cy.window().then((window) => {
    const dataTransfer = new window.DataTransfer();
    cy.get(field('order_id'))
      .should('have.attr', 'draggable', 'true')
      .trigger('dragstart', { dataTransfer });
    cy.get(field('customer_id'))
      .closest('[data-slot="graph-node-column-row"]')
      .then(($target) => {
        const clientY = $target[0]!.getBoundingClientRect().top + 1;
        cy.wrap($target)
          .trigger('dragover', { clientY, dataTransfer })
          .trigger('drop', { clientY, dataTransfer });
      });
    cy.get(field('order_id')).trigger('dragend');
  });
  expectSavedOrder(['order_id', 'customer_id', 'name']);
  cy.get(card).should(($card) => expect($card[0]!.style.transform).to.equal(position));
  cy.on('window:before:load', installE2eApiFetchStub);
  cy.reload();
  toggleColumns('join-transform');
  cy.get(`${card} [data-slot="graph-node-column-piece"]`).should(($fields) => {
    expect([...$fields].slice(0, 3).map((element) => element.dataset.columnName)).to.deep.equal([
      'order_id',
      'customer_id',
      'name',
    ]);
  });
  cy.get(toggle).should('have.attr', 'aria-pressed', 'true');
  cy.get(field('order_id')).focus().trigger('keydown', { key: 'ArrowDown', altKey: true });
  expectSavedOrder(['customer_id', 'order_id', 'name']);
}

function proveEmptyJoinOutput(sourceCount: number): void {
  const card = '.react-flow__node[data-id="join-transform"]';
  const controls = `${card} [data-slot="graph-node-column-output-state"]`;
  const stageEdges = '.react-flow__edge:not(.react-flow__edge-columnLineage)';
  let baseline: ReturnType<typeof inspectDvtSubstraitNInputJoinDraft>;
  const assertSaved = (outputCount?: number): void => {
    cy.wrap(null).should(() => {
      expect(getE2eApiCalls('/workspace/graph/draft').at(-1)?.method).to.equal('GET');
      const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)
        ?.body as CanvasDraftSaveRequestBody;
      expect(saved.draft.edges?.filter((edge) => edge.targetId === 'join-transform')).to.deep.equal(
        []
      );
      const authoring = saved.draft.nodes.find((node) => node.id === 'join-transform')?.metadata
        ?.transformAuthoring as { semanticDocument?: unknown };
      const inspected = inspectDvtSubstraitNInputJoinDraft(
        decodeDvtSubstraitInnerJoinDocument(authoring.semanticDocument)
      );
      expect(inspected.ok).to.equal(true);
      if (!inspected.ok) return;
      expect(inspected.projection.inputs).to.have.length(sourceCount);
      if (outputCount == null) baseline = inspected;
      else {
        expect(inspected.projection.outputs).to.have.length(outputCount);
        if (baseline?.ok) {
          expect(inspected.projection.inputs).to.deep.equal(baseline.projection.inputs);
          expect(inspected.projection.joins).to.deep.equal(baseline.projection.joins);
          expect(inspected.projection.joinRelations).to.deep.equal(
            baseline.projection.joinRelations
          );
        }
      }
    });
  };
  cy.get(stageEdges).then(($edges) => {
    for (let index = 0; index < $edges.length; index += 1) {
      cy.get<SVGPathElement>(`${stageEdges} .react-flow__edge-interaction`)
        .first()
        .then(($path) => {
          const path = $path[0]!;
          const matrix = path.getScreenCTM()!;
          const rect = path.getBoundingClientRect();
          const points = Array.from({ length: 19 }, (_, index) =>
            path
              .getPointAtLength((path.getTotalLength() * (index + 1)) / 20)
              .matrixTransform(matrix)
          );
          const visible = points.find(
            (point) => path.ownerDocument.elementFromPoint(point.x, point.y) === path
          );
          expect(visible, 'visible connection segment').not.to.equal(undefined);
          cy.wrap($path).rightclick(visible!.x - rect.left, visible!.y - rect.top);
        });
      cy.contains('[data-slot="canvas-context-menu-item"]', 'Remove connection').click();
      cy.get(stageEdges).should('have.length', $edges.length - index - 1);
    }
  });
  assertSaved();
  toggleColumns('join-transform');
  cy.get(`${controls}[aria-pressed="true"]`).then(($selected) => {
    const names = [...$selected].map(
      (element) => element.closest<HTMLElement>('[data-column-name]')!.dataset.columnName!
    );
    names.forEach((name, index) => {
      cy.get(
        `${card} [data-column-name="${name}"] [data-slot="graph-node-column-output-state"]`
      ).click();
      assertSaved(names.length - index - 1);
    });
  });
  cy.get(controls).should('have.attr', 'aria-pressed', 'false');
  cy.get(`${controls}[aria-pressed="true"]`).should('not.exist');
  cy.on('window:before:load', installE2eApiFetchStub);
  cy.reload();
  toggleColumns('join-transform');
  cy.get(controls).should('have.attr', 'aria-pressed', 'false');
  cy.get(`${controls}[aria-pressed="true"]`).should('not.exist');
  cy.screenshot(`empty-${sourceCount}-input-join`, { capture: 'viewport' });
  cy.get(controls).first().click();
  assertSaved(1);
  cy.get(`${controls}[aria-pressed="true"]`).should('have.length', 1);
}

describe('Canvas Substrait INNER JOIN field selection', () => {
  beforeEach(() => {
    stubRuntimeCapabilities();
    stubStatefulCanvasDraftAuthoring({
      substraitInnerJoin: true,
      title: 'Substrait field selection',
    });
  });

  it('retains checkbox, drag, keyboard order and reload behavior on the JOIN card', () => {
    cy.viewport(1440, 1000);
    visitCanvas();
    proveCardOutputControls(2);
  });

  it('clears the last output after disconnecting both Sources and restores it after reload', () => {
    cy.viewport(1440, 1000);
    visitCanvas();
    proveEmptyJoinOutput(2);
  });

  it('shows canonical Substrait provenance without SQL or dbt authority in the Transform inspector', () => {
    visitCanvas();

    cy.get('.react-flow__node[data-id="join-transform"]')
      .should('contain.text', 'Customer Orders')
      .and('contain.text', 'Not calculated')
      .and('not.contain.text', 'SQL transform')
      .and('not.contain.text', 'DBT artifact');
    openJoinWorkbench();
    cy.get('[data-slot="canvas-node-workbench-tab-code"]').click();
    cy.get('[data-slot="canvas-node-workbench-code-content"]')
      .should('contain.text', 'Canonical Substrait document')
      .and('contain.text', 'SHA-256');
    cy.get('[data-testid="monaco-code-viewer"] .view-lines').should(($lines) => {
      const code = $lines.text().replaceAll('\u00a0', ' ');
      expect(code).to.contain('dvt-substrait-semantic-document.v1');
      expect(code).to.contain('semanticPlan');
    });
  });

  it('edits a persisted JOIN predicate again after reload without replacing stable identities', () => {
    let fieldIds: string[] = [];
    let relationIds: string[] = [];
    const inspectLatestSave = (): ReturnType<typeof inspectDvtSubstraitNInputJoinDraft> => {
      const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)
        ?.body as CanvasDraftSaveRequestBody;
      const authoring = saved.draft.nodes.find((node) => node.id === 'join-transform')?.metadata
        ?.transformAuthoring as { semanticDocument?: unknown };
      return inspectDvtSubstraitNInputJoinDraft(
        decodeDvtSubstraitInnerJoinDocument(authoring.semanticDocument)
      );
    };

    visitCanvas();
    openJoinWorkbench();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="semantic-workbench-join-condition-list"]').should('be.visible');
    cy.get('[aria-label="Editar condición"]').click();
    cy.get('[aria-label="Comparador de la condición"]').select('gt');
    cy.contains('button', 'Guardar condición').click();
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();

    cy.wrap(null).should(() => {
      const inspected = inspectLatestSave();
      expect(inspected.ok).to.equal(true);
      if (!inspected.ok) return;
      const condition = inspected.projection.joins[0]?.conditions[0];
      expect(condition != null && condition.kind !== 'group' && condition.operator).to.equal('gt');
      fieldIds = inspected.projection.inputs.flatMap((input) =>
        input.fields.map((field) => field.fieldId)
      );
      relationIds = inspected.projection.joinRelations.map((relation) => relation.relationId);
    });

    cy.on('window:before:load', installE2eApiFetchStub);
    cy.reload();
    openJoinWorkbench();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[aria-label="Editar condición"]').click();
    cy.get('[aria-label="Comparador de la condición"]').should('have.value', 'gt').select('lt');
    cy.contains('button', 'Guardar condición').click();
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();

    cy.wrap(null).should(() => {
      const inspected = inspectLatestSave();
      expect(inspected.ok).to.equal(true);
      if (!inspected.ok) return;
      const condition = inspected.projection.joins[0]?.conditions[0];
      expect(condition != null && condition.kind !== 'group' && condition.operator).to.equal('lt');
      expect(
        inspected.projection.inputs.flatMap((input) => input.fields.map((field) => field.fieldId))
      ).to.deep.equal(fieldIds);
      expect(
        inspected.projection.joinRelations.map((relation) => relation.relationId)
      ).to.deep.equal(relationIds);
    });
  });

  it('selects, groups, ranks, persists, and reloads fields from Substrait authority', () => {
    visitCanvas();

    openJoinWorkbench();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('input[name="dvt-substrait-inner-join-field"][value="left.customer_id"]').uncheck();
    cy.get('input[data-slot="dvt-substrait-inner-join-output-name"][data-field-key="left.name"]')
      .clear()
      .type('customer_name', { delay: 0 });
    cy.get('input[data-slot="dvt-substrait-inner-join-output-name"][data-field-key="left.name"]')
      .should('have.value', 'customer_name')
      .blur();
    cy.get(
      'button[data-action="move-substrait-inner-join-field-up"][data-field-key="right.order_id"]'
    ).click();
    cy.get('[data-slot="dvt-substrait-inner-join-grain-field"]').select('customer_name');
    cy.get('[data-slot="dvt-substrait-inner-join-count-output-name"]')
      .clear()
      .type('order_count', { delay: 0 });
    cy.get('[data-slot="dvt-substrait-inner-join-apply-grouping"]').click();
    cy.get('[data-slot="dvt-substrait-inner-join-window-output-name"]')
      .clear()
      .type('count_rank', { delay: 0 });
    cy.get('[data-slot="dvt-substrait-inner-join-window-output-name"]').should(
      'have.value',
      'count_rank'
    );
    cy.get('[data-slot="dvt-substrait-inner-join-apply-window"]').click();
    cy.get('[data-slot="dvt-substrait-inner-join-grouped-window-authoring"]').should('exist');
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();

    cy.wrap(null).should(() => {
      const savedTransform = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) => call.body as CanvasDraftSaveRequestBody)
        .map((body) => body.draft.nodes.find((node) => node.id === 'join-transform'))
        .filter((node) => node != null)
        .at(-1);
      const transformAuthoring = savedTransform?.metadata?.transformAuthoring as
        { semanticDocument?: unknown } | undefined;
      const inspection = inspectDvtSubstraitInnerJoinGroupedWindowDraft(
        decodeDvtSubstraitInnerJoinDocument(transformAuthoring?.semanticDocument)
      );

      expect(
        inspection.ok &&
          inspection.projection.outputs.map(({ name, dataType, outputOrdinal }) => ({
            name,
            dataType,
            outputOrdinal,
          }))
      ).to.deep.equal([
        { name: 'customer_name', dataType: 'string', outputOrdinal: 0 },
        { name: 'order_count', dataType: 'i64', outputOrdinal: 1 },
        { name: 'count_rank', dataType: 'i64', outputOrdinal: 2 },
      ]);
      const fieldIds = inspection.ok
        ? inspection.projection.outputs.map((output) => output.fieldId)
        : [];
      expect(fieldIds).to.have.length(3);
      expect(new Set(fieldIds).size).to.equal(3);
      expect(fieldIds.every((fieldId) => /^dvt_fld_/.test(fieldId))).to.equal(true);
    });

    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    visitCanvas();
    openJoinWorkbench();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="dvt-substrait-inner-join-grouped-window-authoring"]').should('exist');
    cy.get('[data-slot="dvt-substrait-inner-join-window-output-name"]').should(
      'have.value',
      'count_rank'
    );
  });
});

describe('Canvas Substrait N-input INNER JOIN authoring', () => {
  beforeEach(() => {
    stubRuntimeCapabilities();
    stubStatefulCanvasDraftAuthoring({
      substraitNInputJoin: true,
      title: 'Substrait N-input authoring',
    });
  });

  it('retains the same card output controls after adding a third Source', () => {
    cy.viewport(1440, 1000);
    visitCanvas();
    openJoinWorkbench();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="dvt-substrait-append-right-field"]').select(
      'source-shipments\u001fcustomer_id'
    );
    cy.get('[data-slot="dvt-substrait-append-submit"]').click();
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    proveCardOutputControls(3);
  });

  it('clears the last N-input output after disconnecting Sources and restores it after reload', () => {
    cy.viewport(1440, 1000);
    visitCanvas();
    openJoinWorkbench();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="dvt-substrait-append-right-field"]').select(
      'source-shipments\u001fcustomer_id'
    );
    cy.get('[data-slot="dvt-substrait-append-submit"]').click();
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    proveEmptyJoinOutput(3);
  });

  it('appends, edits, groups, ranks, and reloads N-input joins through one revision', () => {
    visitCanvas();

    openJoinWorkbench();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="dvt-substrait-append-right-field"]').select(
      'source-shipments\u001fcustomer_id'
    );
    cy.get('[data-slot="dvt-substrait-append-submit"]').click();
    cy.get('[data-slot="dvt-substrait-n-input-join-authoring"]').should(
      'contain.text',
      'customers + orders + shipments'
    );
    cy.get('[data-slot="dvt-substrait-append-right-field"]').select(
      'source-tickets\u001fcustomer_id'
    );
    cy.get('[data-slot="dvt-substrait-append-submit"]').click();
    cy.get('[data-slot="dvt-substrait-n-input-join-authoring"]').should(
      'contain.text',
      'customers + orders + shipments + tickets'
    );
    cy.get(
      'input[name="dvt-substrait-n-input-field"][aria-label$="shipments.customer_id"]'
    ).check();
    cy.get(
      'input[data-slot="dvt-substrait-n-input-output-name"][aria-label$="shipments.customer_id"]'
    )
      .should('have.value', 'shipments_customer_id')
      .clear()
      .type('shipping_customer', { delay: 0 });
    cy.get(
      'input[data-slot="dvt-substrait-n-input-output-name"][aria-label$="shipments.customer_id"]'
    ).should('have.value', 'shipping_customer');
    cy.get(
      'input[data-slot="dvt-substrait-n-input-output-name"][aria-label$="shipments.customer_id"]'
    )
      .closest('[data-slot="dvt-substrait-n-input-field"]')
      .find('button[data-action="move-substrait-n-input-field-up"]')
      .click();
    cy.get('[data-slot="dvt-substrait-inner-join-grain-field"]').select('shipment_id');
    cy.get('[data-slot="dvt-substrait-inner-join-count-output-name"]')
      .clear()
      .type('shipment_count', { delay: 0 });
    cy.get('[data-slot="dvt-substrait-inner-join-apply-grouping"]').click();
    cy.get('[data-slot="dvt-substrait-inner-join-grouping-authoring"]').should('exist');
    cy.get('[data-slot="dvt-substrait-inner-join-window-output-name"]')
      .clear()
      .type('shipment_rank', { delay: 0 });
    cy.get('[data-slot="dvt-substrait-inner-join-window-output-name"]').should(
      'have.value',
      'shipment_rank'
    );
    cy.get('[data-slot="dvt-substrait-inner-join-apply-window"]').click();
    cy.get('[data-slot="dvt-substrait-inner-join-grouped-window-authoring"]').should('exist');
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();

    cy.wrap(null).should(() => {
      const savedTransform = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) => call.body as CanvasDraftSaveRequestBody)
        .map((body) => body.draft.nodes.find((node) => node.id === 'join-transform'))
        .filter((node) => node != null)
        .at(-1);
      const transformAuthoring = savedTransform?.metadata?.transformAuthoring as
        { semanticDocument?: unknown } | undefined;
      const inspection = inspectDvtSubstraitInnerJoinGroupedWindowDraft(
        decodeDvtSubstraitInnerJoinDocument(transformAuthoring?.semanticDocument)
      );

      expect(
        inspection.ok &&
          inspection.projection.kind === 'n-input' &&
          inspection.projection.inputs.map((input) => input.table)
      ).to.deep.equal(['customers', 'orders', 'shipments', 'tickets']);
      expect(inspection.ok && inspection.projection)
        .to.have.property('groupField')
        .that.deep.includes({ name: 'shipment_id' });
      if (inspection.ok && 'groupField' in inspection.projection) {
        expect(inspection.projection.groupField.fieldId).to.match(/^dvt_fld_/);
      }
      expect(inspection.ok && inspection.projection)
        .to.have.property('result')
        .that.deep.includes({ name: 'shipment_rank' });
      expect(
        inspection.ok && inspection.projection.outputs.map((output) => output.name)
      ).to.deep.equal(['shipment_id', 'shipment_count', 'shipment_rank']);
      const outputFieldIds = inspection.ok
        ? inspection.projection.outputs.map((output) => output.fieldId)
        : [];
      expect(outputFieldIds.every((fieldId) => /^dvt_fld_/.test(fieldId))).to.equal(true);
    });

    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    visitCanvas();
    openJoinWorkbench();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="dvt-substrait-inner-join-grouped-window-authoring"]').should(
      'contain.text',
      'customers + orders + shipments + tickets'
    );
    cy.get('[data-slot="dvt-substrait-inner-join-window-output-name"]').should(
      'have.value',
      'shipment_rank'
    );
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    for (const nodeId of [
      'source-customers',
      'source-orders',
      'source-shipments',
      'source-tickets',
      'join-transform',
    ]) {
      toggleColumns(nodeId);
    }
    cy.get('.react-flow__edge-columnLineage').should('have.length', 1);
    cy.get('.react-flow__edge-columnLineage[aria-label="shipment_id → shipment_id"]').should(
      'exist'
    );
  });
});

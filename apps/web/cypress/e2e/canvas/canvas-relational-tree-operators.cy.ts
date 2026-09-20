/** Owned concern: verify admitted operator tools, draft isolation and canonical persistence. */
import {
  inspectDvtSubstraitSortFetchRoot,
  selectDvtSubstraitRelation,
} from '@dvt/postgres-projection';

import { inspectDvtSubstraitInnerJoinGroupedWindowDraft } from '../../../src/app/views/canvas/canvasDvtSubstraitJoinComposition';
import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { inspectDvtSubstraitUnionAllGroupedWindowDraft } from '../../../src/app/views/canvas/canvasDvtSubstraitSetComposition';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  getE2eApiCalls,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const form = '[data-slot="canvas-relational-operator-form"]';
const tool = (id: string): string => `[data-operator-tool="${id}"]`;
function openEditor(union = false, readOnly = false, nInput = false): void {
  stubShellBootstrapApis({
    scopes: readOnly
      ? ['workspace:graph-draft:view']
      : ['workspace:graph-draft:view', 'workspace:graph-draft:save'],
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
  stubStatefulCanvasDraftAuthoring({
    substraitUnionAll: union,
    substraitInnerJoin: !union,
    substraitNInputJoin: nInput,
    readOnly,
  });
  cy.viewport(1440, 900);
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
  cy.get('[data-slot="canvas-relational-composition-badge"][role="button"]').first().click();
  cy.get('[data-slot="canvas-relational-tree-workbench"]').should('be.visible');
}

function activateMenu(slot: string): void {
  const selector = `[data-slot="context-menu-content"][data-state="open"] [data-slot="${slot}"]`;
  cy.get(selector).then(($item) => {
    const document = $item[0]!.ownerDocument;
    const event = new document.defaultView!.MouseEvent('pointerdown', {
      button: 0,
      bubbles: true,
      cancelable: true,
    });
    $item[0]!.dispatchEvent(event);
    expect(event.defaultPrevented, 'viewport must not cancel a portalled menu activation').to.equal(
      false
    );
    expect(
      document.querySelector('[data-panning="true"]'),
      'viewport must not capture menu activation'
    ).to.equal(null);
  });
  cy.get(selector).click();
  cy.get('[data-slot="context-menu-content"][data-state="open"]').should('not.exist');
}

function addWrapper(id: string): void {
  cy.get(tool(id)).click();
  cy.get(
    '[role="dialog"] ' + form + ', [role="dialog"][data-slot="canvas-relational-operator-form"]'
  )
    .find('button[type="submit"]')
    .click();
}

describe('Relational operator toolbar', () => {
  it('keeps compact expression, editing and selected-operation rows beside one another', () => {
    openEditor();
    addWrapper('aggregate');
    cy.get('[data-operator="aggregate"]').invoke('attr', 'data-relation-id').as('aggregateId');
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
    cy.get<string>('@aggregateId').then((relationId) => {
      cy.wrap(null).should(() => {
        expect(
          JSON.stringify(getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body)
        ).to.contain(relationId);
      });
    });
    visitWithE2eWorkspaceSession('/canvas');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.get('[data-slot="canvas-relational-composition-badge"][role="button"]').first().click();
    const samplePath = /\/workspace\/graph\/canvases\/[^/]+\/transforms\/[^/]+\/data-sample$/;
    stubE2eApi('GET', samplePath, ({ url }) => ({
      body: {
        contractVersion: 1,
        canvasId: url.pathname.split('/')[4],
        transformNodeId: url.pathname.split('/')[6],
        relationId: url.searchParams.get('relationId'),
        semanticPlanSha256: url.searchParams.get('semanticPlanSha256'),
        draftRevision: 'selected-preview-fixture',
        columns: [{ name: 'selected_order_id', type: 'integer', nullable: false }],
        rows: [{ values: ['selected-operation-42'] }],
        limit: 20,
        truncated: false,
        sampledAt: '2026-09-19T00:00:00.000Z',
      },
    }));
    cy.get('[data-operator="join"]').first().dblclick();
    cy.get('[data-slot="canvas-operation-data-preview"]:visible').as('preview');
    cy.get('@preview').find('[data-slot="canvas-model-preview"]').should('be.enabled').click();
    cy.get('@preview').find('table').should('contain.text', 'selected-operation-42');
    cy.get('.canvas-operation-panels.with-preview:visible').then(($panels) => {
      const controls = $panels[0]!
        .querySelector('.canvas-operation-controls')!
        .getBoundingClientRect();
      const preview = $panels[0]!.querySelector('aside')!.getBoundingClientRect();
      expect(preview.left).to.be.greaterThan(controls.right);
      expect(Math.abs(preview.top - controls.top)).to.be.lessThan(2);
      expect(preview.width).to.be.greaterThan(300);
    });
    cy.screenshot('selected-operation-preview-desktop');
    cy.get('[data-operator="aggregate"]').click();
    cy.get('[data-slot="canvas-operation-data-preview"]:visible table').should('not.exist');
    cy.then(() => expect(getE2eApiCalls(samplePath, 'GET')).to.have.length(1));
    cy.viewport(1000, 800);
    cy.get('[data-slot="canvas-relational-tree-draft-viewport"]').should('be.visible');
    cy.get('.canvas-operation-panels.with-preview:visible').then(($panels) => {
      const controls = $panels[0]!
        .querySelector('.canvas-operation-controls')!
        .getBoundingClientRect();
      const preview = $panels[0]!.querySelector('aside')!.getBoundingClientRect();
      expect(preview.top).to.be.greaterThan(controls.bottom);
    });
  });

  for (const applied of [false, true]) {
    it(`stages a dragged source on a ${applied ? 'saved' : 'local'} filtered projection without losing it`, () => {
      openEditor();
      cy.get('[data-operator="join"]').rightclick();
      activateMenu('canvas-relational-remove-left');
      cy.get(tool('filter')).click();
      cy.get(form).find('input').type('C-001');
      cy.get(form).find('button[type="submit"]').click();
      if (applied) {
        cy.get('[data-slot="canvas-relational-tree-apply"]').click();
        cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
      }
      const viewport = applied
        ? '[data-slot="canvas-relational-tree-viewport"]'
        : '[data-slot="canvas-relational-tree-draft-viewport"]';
      const join = '[data-slot="dvt-select-operation-inner-join"]';
      cy.get(join).should('be.visible').and('be.disabled');
      cy.get('[data-slot="dvt-select-operation-union-all"]').should('be.visible');
      cy.get('[data-operator="filter"]').then(($filter) => {
        const identity = $filter.attr('data-relation-id');
        cy.window().then((window) => {
          const dataTransfer = new window.DataTransfer();
          cy.contains('[data-slot="canvas-relational-tree-source"]', 'orders')
            .should('have.attr', 'draggable', 'true')
            .trigger('dragstart', { dataTransfer });
          cy.get('[data-operator="filter"]').should(($current) =>
            expect($current[0]).to.equal($filter[0])
          );
          cy.get(viewport).trigger('dragover', { dataTransfer }).trigger('drop', { dataTransfer });
        });
        cy.get('[data-operator="filter"]').should('have.attr', 'data-relation-id', identity);
        cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
        cy.get(join).should('be.enabled').click();
        cy.get('[role="alertdialog"]').should('contain.text', 'filters and windows');
        cy.contains('[role="alertdialog"] button', 'Cancel').click();
        cy.get('[data-operator="filter"]').should('have.attr', 'data-relation-id', identity);
        cy.get(tool('filter')).click();
        cy.get(form).find('input').should('have.value', 'C-001');
        cy.get(form).find('button[type="submit"]').click();
        cy.get(join).click();
        cy.contains('[role="alertdialog"] button', 'Apply').click();
      });
      cy.get('[data-operator="join"]').should('have.length', 1);
      cy.get('[data-operator="read"]').should('have.length', 2);
      cy.get('[data-slot="canvas-relational-tree-apply"]').click();
      cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
      cy.get('[data-slot="canvas-model-view-tab"][data-view="sql"]').click();
      cy.get('[data-slot="canvas-model-sql"]').should('contain.text', 'JOIN');
      visitWithE2eWorkspaceSession('/canvas');
      waitForE2eApiCall('/workspace/graph/draft', 'GET');
      cy.get('[data-slot="canvas-relational-composition-badge"][role="button"]').first().click();
      cy.get('[data-operator="join"]').should('have.length', 1);
      cy.screenshot(`projection-source-drop-${applied ? 'saved' : 'local'}`);
    });
  }
  it('activates context menus below wrappers and preserves the draft between main workspace tabs', () => {
    openEditor(false, false, true);
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'shipments').click();
    cy.get('[data-slot="canvas-relational-tree-existing-field"]').select('customers.customer_id');
    cy.get('[data-slot="canvas-relational-tree-connected-field"]').select('shipments.customer_id');
    cy.get('[data-slot="canvas-relational-tree-append-input"]').click();
    addWrapper('aggregate');
    addWrapper('window');
    cy.get('[data-operator="join"]').should('have.length', 2).first().rightclick();
    activateMenu('canvas-relational-edit-operation');
    cy.get('[data-slot="semantic-workbench-join-condition-editor"]').should('be.visible');
    let catalogueContextEvent: Event | null = null;
    cy.document().then((document) => {
      document.addEventListener(
        'contextmenu',
        (event) => {
          catalogueContextEvent = event;
        },
        { once: true, capture: true }
      );
    });
    cy.get('[data-slot="canvas-relational-tree-source"]')
      .first()
      .find('span.block.truncate')
      .rightclick();
    cy.then(() =>
      expect(catalogueContextEvent?.defaultPrevented, 'no native menu in the editor').to.equal(true)
    );
    cy.get('[data-slot="shell-top-bar"] [data-slot="canvas-workspace-tab"]').click();
    cy.get('[data-slot="canvas-model-editor"]').should('not.be.visible');
    cy.get('[data-slot="canvas-model-main-tab"]').click();
    cy.get('[data-operator="join"]').should('have.length', 2);
    cy.get('[data-slot="semantic-workbench-join-condition-editor"]').should('be.visible');
    cy.get('[data-operator="join"]').first().rightclick();
    activateMenu('canvas-relational-remove-left');
    cy.get('[data-operator="join"]').should('have.length', 1);
    cy.get('[data-operator="aggregate"]').should('have.length', 1);
    cy.contains('[data-operator="project"]', 'Window').should('be.visible');
    cy.get('[data-operator="join"]').rightclick();
    activateMenu('canvas-relational-remove-right');
    cy.get('[role="alertdialog"]')
      .should('contain.text', 'AGGREGATE')
      .and('contain.text', 'WINDOW');
    cy.contains('[role="alertdialog"] button', 'Keep editing').click();
    cy.get('body').should('not.have.css', 'pointer-events', 'none');
    cy.get('[data-operator="join"]').should('have.length', 1).rightclick();
    activateMenu('canvas-relational-remove-right');
    cy.get('[data-slot="canvas-relational-removal-confirm"]').click();
    cy.get('[data-operator="join"], [data-operator="aggregate"]').should('not.exist');
    cy.get('[data-operator="read"]').should('have.length', 1);
    cy.get('[data-slot="canvas-relational-node-title"]').should('not.contain.text', 'Window');
    cy.screenshot('workspace-tabs-contextual-removal');
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-operator="join"]').should('have.length', 1);
  });
  it('keeps editing or applies local composition changes before closing the Model', () => {
    openEditor();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    let initialWrites = 0;
    cy.then(() => {
      initialWrites = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    addWrapper('aggregate');
    cy.get('[data-operator="aggregate"]').should('have.length', 1);

    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.get('[role="alertdialog"]').should('be.visible');
    cy.contains('[role="alertdialog"] button', 'Keep editing').click();
    cy.get('[data-slot="canvas-model-editor"]').should('be.visible');
    cy.get('[data-operator="aggregate"]').should('have.length', 1);

    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.contains('[role="alertdialog"] button', 'Apply and continue').click();
    cy.get('[data-slot="canvas-model-editor"]').should('not.exist');
    cy.get('[data-slot="canvas-model-main-tab"]').should('not.exist');
    cy.wrap(null).should(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(initialWrites + 1)
    );
  });
  it('discards local composition changes before closing the Model', () => {
    openEditor();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    let initialWrites = 0;
    cy.then(() => {
      initialWrites = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    addWrapper('aggregate');
    cy.get('[data-operator="aggregate"]').should('have.length', 1);

    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.get('[role="alertdialog"]').should('be.visible');
    cy.contains('[role="alertdialog"] button', 'Discard changes').click();
    cy.get('[data-slot="canvas-model-editor"]').should('not.exist');
    cy.get('[data-slot="canvas-model-main-tab"]').should('not.exist');
    cy.then(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(initialWrites)
    );
  });
  it('keeps the selected JOIN editable below grouping and windows, and removes the selected wrapper', () => {
    openEditor();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    let initialWrites = 0;
    cy.then(() => {
      initialWrites = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get('[data-operator="join"]').dblclick();
    cy.get('[data-slot="canvas-join-expression-node"]').should('have.length.at.least', 3);
    cy.get('[data-slot="semantic-workbench-join-condition-editor"]').should('be.visible');
    cy.get(tool('aggregate')).click();
    cy.get(
      '[role="dialog"] ' + form + ', [role="dialog"][data-slot="canvas-relational-operator-form"]'
    )
      .find('button[type="submit"]')
      .click();
    cy.get('[data-slot="semantic-workbench-join-condition-editor"]').should('be.visible');
    cy.get(tool('window')).click();
    cy.get(
      '[role="dialog"] ' + form + ', [role="dialog"][data-slot="canvas-relational-operator-form"]'
    )
      .find('button[type="submit"]')
      .click();
    cy.get('[data-slot="canvas-join-expression-node"][data-kind="field"]').first().click();
    cy.get('[data-slot="semantic-workbench-join-condition-editor"]').should('be.visible');
    cy.screenshot('selected-join-connected-expression-under-window');
    cy.get('[aria-label="Comparador de la condición"]').select('not_equal');
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
    cy.get('[data-operator="aggregate"]').rightclick();
    cy.get('[data-slot="canvas-relational-edit-operation"]').click();
    cy.get('[data-slot="context-menu-content"][data-state="open"]').should('not.exist');
    cy.get('[data-slot="canvas-join-expression-tree"]').should('contain.text', 'COUNT');
    cy.contains(
      '[data-slot="canvas-relational-tree-inline-editor"]',
      'downstream dependencies'
    ).should('be.visible');
    cy.get('[data-operator="join"]').dblclick();
    cy.get('[aria-label="Comparador de la condición"]').should('have.value', 'not_equal');
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
    cy.contains('button', 'Guardar condición').click();
    cy.contains('[data-operator="project"]', 'Window').rightclick();
    cy.get(
      '[data-slot="context-menu-content"][data-state="open"] [data-slot="canvas-relational-remove-source"]'
    ).click();
    cy.get('[data-slot="canvas-relational-node-title"]').should('not.contain.text', 'Window');
    cy.get('[data-operator="aggregate"]').rightclick();
    cy.get(
      '[data-slot="context-menu-content"][data-state="open"] [data-slot="canvas-relational-remove-source"]'
    ).click();
    cy.get('[data-operator="aggregate"]').should('not.exist');
    cy.get('[data-operator="join"]').should('exist');
    cy.then(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(initialWrites)
    );
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
  });
  for (const union of [false, true]) {
    it(`${union ? 'UNION ALL' : 'INNER JOIN'} → COUNT → ROW_NUMBER survives save and reopen`, () => {
      openEditor(union);
      if (union) {
        cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers_north').click();
        cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers_south').click();
        cy.get('[data-slot="dvt-select-operation-union-all"]').click();
      }
      cy.get(tool('aggregate')).should('be.enabled').click();
      cy.get(form).find('input').clear().type('customer_count');
      cy.get(form).find('button[type="submit"]').click();
      cy.get('[data-operator="aggregate"]').should('have.length', 1);
      cy.get(tool('window')).click();
      cy.get(form).should('contain.text', 'customer_count DESC NULLS LAST');
      cy.get(form).should('not.contain.text', 'PARTITION BY');
      cy.get(form).find('input').clear().type('ranked_customer');
      cy.get(form).find('button[type="submit"]').click();
      cy.get('[data-slot="canvas-relational-node-title"]').should('contain.text', 'Window');
      cy.get('[data-slot="canvas-relational-tree-apply"]').click();
      cy.wrap(null).should(() => {
        const saves = getE2eApiCalls('/workspace/graph/draft', 'PUT');
        const saved = saves.at(-1)?.body as
          | {
              draft: {
                nodes: {
                  id: string;
                  metadata?: { transformAuthoring?: { semanticDocument: unknown } };
                }[];
              };
            }
          | undefined;
        const document = saved?.draft.nodes.find(
          (node) => node.id === (union ? 'union-transform' : 'join-transform')
        )?.metadata?.transformAuthoring?.semanticDocument;
        expect(document).to.not.equal(undefined);
        const draft = decodeDvtSubstraitSemanticDocument(document);
        const inspection = union
          ? inspectDvtSubstraitUnionAllGroupedWindowDraft(draft)
          : inspectDvtSubstraitInnerJoinGroupedWindowDraft(draft);
        expect(inspection.ok, 'saved Substrait contains the window').to.equal(true);
        if (inspection.ok) expect(inspection.projection.result.name).to.equal('ranked_customer');
      });
      cy.get('[data-slot="canvas-relational-tree-fit"]').click();
      cy.screenshot(`operators-${union ? 'union' : 'join'}-count-window`);
      cy.get(tool('window')).click();
      cy.get(form).find('input').should('have.value', 'ranked_customer');
      cy.contains(form + ' button', 'Remove operation').click();
      cy.get('[data-slot="canvas-relational-node-title"]').should('not.contain.text', 'Window');
      cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
      cy.get('[data-slot="canvas-relational-node-title"]').should('contain.text', 'Window');
      visitWithE2eWorkspaceSession('/canvas');
      waitForE2eApiCall('/workspace/graph/draft', 'GET');
      cy.get('[data-slot="canvas-relational-composition-badge"][role="button"]').click();
      // The workspace-session fixture restores the default Spanish locale on reload.
      cy.get('[data-slot="canvas-relational-node-title"]').should('contain.text', 'Ventana');
    });
  }
  it('edits FILTER and a source ROW_NUMBER through the same canonical projection', () => {
    openEditor();
    cy.get('[data-operator="join"]').rightclick();
    cy.get('[data-slot="canvas-relational-remove-left"]').click();
    cy.get(tool('filter')).click();
    cy.get(form).find('input').type('C-001');
    cy.get(form).find('button[type="submit"]').click();
    cy.get('[data-operator="filter"]').should('have.length', 1);
    cy.get(tool('filter')).click();
    cy.get(form).find('input').should('have.value', 'C-001');
    cy.contains(form + ' button', 'Remove operation').click();
    cy.get('[data-operator="filter"]').should('not.exist');
    cy.get(tool('window')).click();
    cy.get(form).find('select').should('exist');
    cy.get(form).find('input').clear().type('source_row');
    cy.get(form).find('button[type="submit"]').click();
    cy.get('[data-slot="canvas-relational-node-title"]').should('contain.text', 'Window');
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
  });
  it('authors, reopens, edits and contextually removes ORDER BY below LIMIT', () => {
    openEditor();
    cy.get(tool('sort')).should('be.enabled').click();
    cy.get(form).find('button').contains('Add key').click();
    cy.get(form).find('select[aria-label^="Field"]').should('have.length', 2);
    cy.get(form).find('select[aria-label="Field 2"]').select(1);
    cy.get(form).find('select[aria-label="Direction and nulls 1"]').select('DESC · NULLS LAST');
    cy.get(form).find('button[type="submit"]').click();
    cy.get('[data-operator="sort"]')
      .should('have.length', 1)
      .and('contain.text', 'DESC NULLS LAST');

    cy.get(tool('fetch')).should('be.enabled').click();
    cy.get(form).find('input').eq(0).clear().type('2');
    cy.get(form).find('input').eq(1).clear().type('3');
    cy.get(form).find('button[type="submit"]').click();
    cy.get('[data-operator="fetch"]')
      .should('have.length', 1)
      .and('contain.text', 'LIMIT 3 · OFFSET 2');
    cy.get('[data-operator="sort"]')
      .invoke('attr', 'data-relation-id')
      .should('be.a', 'string')
      .as('sortRelationId', { type: 'static' });
    cy.get('[data-operator="fetch"]')
      .invoke('attr', 'data-relation-id')
      .should('be.a', 'string')
      .as('fetchRelationId', { type: 'static' });

    cy.get('[data-operator="sort"]').rightclick();
    activateMenu('canvas-relational-edit-operation');
    cy.get('[data-slot="canvas-relational-tree-inline-editor"]')
      .find('select[aria-label="Direction and nulls 1"]')
      .select('ASC · NULLS FIRST');
    cy.get('[data-slot="canvas-relational-tree-inline-editor"] button[type="submit"]').click();
    cy.get('[data-operator="sort"]').should('contain.text', 'ASC NULLS FIRST');
    cy.get('[data-operator="fetch"]').should('exist');

    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.wrap(null).should(() => {
      const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
        | {
            draft: {
              nodes: {
                id: string;
                metadata?: { transformAuthoring?: { semanticDocument: unknown } };
              }[];
            };
          }
        | undefined;
      const document = saved?.draft.nodes.find((node) => node.id === 'join-transform')?.metadata
        ?.transformAuthoring?.semanticDocument;
      expect(document).to.not.equal(undefined);
      const draft = decodeDvtSubstraitSemanticDocument(document);
      const fetch = inspectDvtSubstraitSortFetchRoot(draft);
      expect(fetch.ok && fetch.operation).to.equal('fetch');
      if (!fetch.ok) return;
      const sorted = selectDvtSubstraitRelation(draft, fetch.inputRelationId);
      const sort = inspectDvtSubstraitSortFetchRoot(sorted);
      expect(sort.ok && sort.operation).to.equal('sort');
      if (sort.ok && sort.operation === 'sort') expect(sort.keys).to.have.length(2);
    });

    visitWithE2eWorkspaceSession('/canvas');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.get('[data-slot="canvas-relational-composition-badge"][role="button"]').first().click();
    cy.get<string>('@sortRelationId').then((relationId) => {
      cy.get(`[data-operator="sort"][data-relation-id="${relationId}"]`).rightclick();
    });
    activateMenu('canvas-relational-remove-source');
    cy.get('[data-operator="sort"]').should('not.exist');
    cy.get<string>('@fetchRelationId').then((relationId) => {
      cy.get(`[data-operator="fetch"][data-relation-id="${relationId}"]`).should('exist');
    });
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-operator="sort"], [data-operator="fetch"]').should('have.length', 2);
  });
  it('does not enable mutations for a read-only model', () => {
    openEditor(false, true);
    cy.get(tool('aggregate')).should('be.disabled');
    cy.get(tool('window')).should('be.disabled');
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
  });
});

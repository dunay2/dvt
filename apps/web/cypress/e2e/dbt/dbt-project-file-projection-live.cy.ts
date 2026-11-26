/**
 * Owned concern: prove the file-authoritative dbt Canvas against real workspace
 * files, protected HTTP, server-side dbt parse, and browser rendering.
 */
import {
  readInitialProjectRevision,
  assertProjectedResourceCards,
  inspectSourceColumns,
  inspectReadOnlyModelCode,
  inspectModelProperties,
} from '../../support/dbtFileProjection/inspection';
import { inspectMixedModel, seedMixedModel } from '../../support/dbtFileProjection/mixedModelSql';
import {
  assertFileAuthority,
  CANVAS_ID,
  INVALID_CANVAS_ID,
  INVALID_PROJECT_CONFIG,
  INVALID_PROJECT_ROOT,
  PROJECT_FILES,
  PROJECT_ROOT,
  visitProjectCanvas,
} from '../../support/dbtFileProjection/project';
import {
  placeProjectReferences,
  assertIndependentMetrics,
  inspectAndRemoveRestoredReference,
  assertRemainingReferences,
} from '../../support/dbtFileProjection/references';
import {
  adoptLiveDbtProjectFileAuthority,
  replaceLiveWorkspaceFile,
  seedLiveWorkspaceFiles,
} from '../../support/dbtProjectLive';
import { seedLiveSelectedClosureDraft } from '../../support/liveCanvasDraftAuthoring';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveWorkspaceFile,
} from '../../support/liveProtectedRuntime';
type DragPoint = Readonly<{ x: number; y: number }>;

function buildMouseEvent(
  point: DragPoint,
  buttons: number,
  view: Cypress.AUTWindow
): MouseEventInit {
  return {
    bubbles: true,
    button: 0,
    buttons,
    cancelable: true,
    clientX: point.x,
    clientY: point.y,
    screenX: point.x,
    screenY: point.y,
    view,
  };
}

function dispatchDragEvent(
  target: EventTarget,
  view: Cypress.AUTWindow,
  type: 'mousedown' | 'mousemove' | 'mouseup',
  point: DragPoint,
  buttons: number
): void {
  target.dispatchEvent(new view.MouseEvent(type, buildMouseEvent(point, buttons, view)));
}

function dragNode(nodeId: string): void {
  cy.get(`.react-flow__node[data-id="${nodeId}"]`).then(($node) => {
    const node = $node[0];
    if (node === undefined) throw new Error(`Expected the projected node ${nodeId}.`);
    const rect = node.getBoundingClientRect();
    const start = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const middle = { x: start.x + 30, y: start.y + 24 };
    const end = { x: start.x + 110, y: start.y + 78 };

    cy.window().then((window) => {
      dispatchDragEvent(node, window, 'mousedown', start, 1);
      dispatchDragEvent(window, window, 'mousemove', middle, 1);
      dispatchDragEvent(window, window, 'mousemove', end, 1);
      dispatchDragEvent(window, window, 'mouseup', end, 0);
    });
  });
}

function expectProjectedCardsNotToOverlap(): void {
  cy.get('.react-flow__node').then(($nodes) => {
    const cards = Array.from($nodes, (node) => ({
      id: node.getAttribute('data-id') ?? 'unknown',
      rect: node.getBoundingClientRect(),
    }));

    for (const [index, left] of cards.entries()) {
      for (const right of cards.slice(index + 1)) {
        const separated =
          left.rect.right <= right.rect.left ||
          right.rect.right <= left.rect.left ||
          left.rect.bottom <= right.rect.top ||
          right.rect.bottom <= left.rect.top;
        expect(separated, `${left.id} must not overlap ${right.id}`).to.equal(true);
      }
    }
  });
}

const modelSelector = '.react-flow__node[data-id="model.analytics.orders"]';

function savedModelPosition(window: Cypress.AUTWindow): DragPoint | undefined {
  const saved = JSON.parse(window.localStorage.getItem('dvt-web-canvas-interaction') ?? '{}') as {
    state?: { canvasLayouts?: Record<string, { nodePositions: Record<string, DragPoint> }> };
  };
  return Object.values(saved.state?.canvasLayouts ?? {})
    .map((layout) => layout.nodePositions['model.analytics.orders'])
    .find((position) => position !== undefined);
}

function assertCoordinates(actual: DragPoint, expected: DragPoint): void {
  expect(actual.x, 'Canvas x').to.be.closeTo(expected.x, 0.001);
  expect(actual.y, 'Canvas y').to.be.closeTo(expected.y, 0.001);
}

function modelPosition(node: HTMLElement): DragPoint {
  const matrix = new DOMMatrix(node.style.transform);
  return { x: matrix.m41, y: matrix.m42 };
}

function assertModelPositionSurvivesReload(): void {
  cy.get<HTMLElement>(modelSelector).then(($node) => {
    const original = $node[0]!.getBoundingClientRect();
    dragNode('model.analytics.orders');
    cy.get<HTMLElement>(modelSelector).should(($moved) => {
      const rect = $moved[0]!.getBoundingClientRect();
      expect(
        Math.abs(rect.left - original.left) + Math.abs(rect.top - original.top)
      ).to.be.greaterThan(20);
    });
  });
  cy.get<HTMLElement>(modelSelector).then(($node) => {
    const settled = modelPosition($node[0]!);
    cy.window().should((window) => {
      const saved = savedModelPosition(window);
      expect(saved, 'persisted drag-stop coordinates').not.to.be.undefined;
      assertCoordinates(saved!, settled);
    });
    cy.reload();
    cy.get<HTMLElement>(modelSelector, { timeout: 60_000 }).should(($restored) => {
      assertCoordinates(modelPosition($restored[0]!), settled);
    });
  });
}

describe('dbt project file projection live vertical', () => {
  before(() => {
    if (!hasLiveProtectedRuntimeEnv()) {
      throw new Error('The file-project proof requires its real protected runtime.');
    }
    const environmentId = Cypress.env('projectFilesEnvironmentId');
    if (typeof environmentId !== 'string' || environmentId.trim().length === 0) {
      throw new Error('The file-project proof requires its dedicated fixture environment.');
    }
    Cypress.env('workspaceEnvironmentId', environmentId);

    return seedLiveSelectedClosureDraft()
      .then(() => seedLiveWorkspaceFiles(PROJECT_FILES))
      .then(() => adoptLiveDbtProjectFileAuthority(PROJECT_ROOT, CANVAS_ID));
  });

  it('projects real dbt files without draft semantics and remains inspectable', () => {
    const observedRequests: string[] = [];
    const observedFileWrites: string[] = [];
    cy.intercept('GET', '**/workspace/dbt/graph?*', (request) => {
      observedRequests.push(request.url);
    });
    cy.intercept('POST', '**/workspace/files/**', (request) => {
      observedFileWrites.push(request.url);
    });
    readInitialProjectRevision();
    visitProjectCanvas();
    assertProjectedResourceCards();
    expectProjectedCardsNotToOverlap();
    assertFileAuthority(observedRequests);
    cy.get('[data-slot="dbt-project-file-projection-notice"]')
      .should('be.visible')
      .and('contain.text', 'require code');
    cy.get('[data-slot="bottom-operational-drawer-tab"]').should('not.exist');
    inspectSourceColumns();
    cy.then(() => expect(observedFileWrites).to.deep.equal([]));
    assertModelPositionSurvivesReload();
    inspectReadOnlyModelCode(observedFileWrites);
    inspectModelProperties();
  });
  it('creates, restores, inspects and removes independent source and model references without SQL writes', () => {
    const writes: string[] = [];
    cy.intercept({ method: '+(POST|PUT|DELETE)', url: '**/workspace/**' }, (request) => {
      writes.push(request.url);
    });
    visitProjectCanvas();
    placeProjectReferences();
    assertIndependentMetrics();
    cy.reload();
    inspectAndRemoveRestoredReference();
    cy.reload();
    assertRemainingReferences();
    for (const [path, content] of Object.entries(PROJECT_FILES)) {
      readLiveWorkspaceFile(path).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('content', content);
      });
    }
    cy.then(() => {
      expect(writes, 'placement only persists local references').to.deep.equal([]);
    });
  });

  it('opens an imported model in Code while retaining the native Canvas without copying it', () => {
    const writes: string[] = [];
    cy.intercept({ method: '+(POST|PUT|DELETE)', url: '**/workspace/**' }, (request) => {
      writes.push(request.url);
    });
    visitProjectCanvas('/canvas');
    cy.get('a[data-slot="left-navigation-link"][href="/canvas"]').should(
      'have.attr',
      'aria-expanded',
      'true'
    );
    cy.get('[data-slot="shell-project-code-command"]').click();
    cy.get(
      `[data-slot="canvas-code-workspace-surface"] [data-workspace-path="${PROJECT_ROOT}/models/orders.sql"]`
    )
      .should('be.visible')
      .and('have.length', 1)
      .click();
    cy.location('search').should('eq', '');
    cy.get('[data-slot="canvas-code-main-tab"]').should('have.attr', 'aria-selected', 'true');
    cy.get(
      '[data-slot="canvas-code-workspace-surface"] [data-slot="workspace-file-code-editor"]'
    ).should('have.attr', 'data-file-path', `${PROJECT_ROOT}/models/orders.sql`);
    cy.get('[data-slot="canvas-workspace-tab"]').click();
    cy.get('a[data-slot="left-navigation-link"][href="/canvas"]').should(
      'have.attr',
      'aria-expanded',
      'true'
    );
    cy.get('.react-flow__node[data-id="model.analytics.orders"]').should('not.exist');
    cy.then(() => {
      expect(writes, 'navigation does not persist copied semantics').to.deep.equal([]);
    });
  });

  it('shows authorized SQL for a native JOIN of a real file model and physical source without executing rows', () => {
    seedMixedModel().then(inspectMixedModel);
  });
  it('keeps invalid projects file-authoritative and reports the analyzer diagnostic', () => {
    seedLiveWorkspaceFiles({
      [`${INVALID_PROJECT_ROOT}/dbt_project.yml`]: INVALID_PROJECT_CONFIG.replace(
        "model-paths: ['../outside-project']",
        "model-paths: ['models']"
      ),
    })
      .then(() => adoptLiveDbtProjectFileAuthority(INVALID_PROJECT_ROOT, INVALID_CANVAS_ID))
      .then(() =>
        replaceLiveWorkspaceFile(`${INVALID_PROJECT_ROOT}/dbt_project.yml`, INVALID_PROJECT_CONFIG)
      );
    const observedRequests: string[] = [];
    cy.intercept('GET', '**/workspace/dbt/graph?*', (request) => {
      observedRequests.push(request.url);
    });
    visitProjectCanvas(
      `/canvas?authority=dbt-project-files&canvasId=${INVALID_CANVAS_ID}&projectRoot=${INVALID_PROJECT_ROOT}`
    );
    cy.get('[data-slot="dbt-project-file-projection-notice"]', { timeout: 60_000 })
      .should('be.visible')
      .and('contain.text', 'dbt project analysis is unavailable')
      .and('contain.text', 'dbt_project_invalid');
    cy.get('.react-flow__node').should('not.exist');
    cy.location('search').should('contain', 'authority=dbt-project-files');
    assertFileAuthority(observedRequests);
  });
});

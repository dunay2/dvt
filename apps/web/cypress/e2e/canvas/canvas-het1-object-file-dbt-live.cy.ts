/**
 * Owned concern: prove public OBJECT-FILE -> PostgreSQL -> DBT_RUN -> DBT_TEST
 * authoring and execution without draft seeding or graph endpoint interception.
 */
import {
  clickCanvasAddCatalogAction,
  clickCanvasContextMenuAction,
  clickPreviewExecutionPlanFromOperationalDrawer,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import { skipWhenFirstAuthoringLiveEnvIsMissing } from '../../support/canvasFirstAuthoring';
import { connectCanvasNodes, openNodeWorkbenchSection } from '../../support/canvasGraphAuthoring';
import {
  assertObjectLoadEvidence,
  assertRunEvidenceDoesNotLeak,
  assertStepEventSet,
  readHet1RunEvents,
} from '../../support/het1PublicRunProof';
import {
  applyNodeWorkbench,
  assertLiveDraftScopeIsClean,
  closeNodeWorkbench,
  configureObjectFileLoad,
  confirmCanvasDependency,
  type Het1ObjectFileManifest,
  openNodeWorkbench,
  readDraftEdges,
  readDraftNodes,
  waitForPersistedDraft,
  waitForRunStatus,
} from '../../support/het1PublicVertical';
import {
  readLiveWorkspaceFile,
  resolveLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';
import { seedE2eWorkspaceSession } from '../../support/workspaceSession';

const OBJECT_NODE_ID = 'dvt.object-file-postgres-object-file-load-1';
const OBJECT_NODE_CARD_TITLE = 'Object File Load 1';
const MODEL_NODE_ID = 'dbt-model-1';
const MODEL_NODE_NAME = 'Model 1';
const TEST_NODE_ID = 'dbt-test-1';
const TEST_NODE_NAME = 'Test 1';
const TARGET_RELATION = 'het1_orders_stage';

function visitCleanDbtCanvas(): void {
  const session = resolveLiveWorkspaceSession();
  cy.visit('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.clear();
      seedE2eWorkspaceSession(window, session);
    },
  });
}

function addCatalogNode(x: number, y: number, kind: string): void {
  openCanvasContextMenuAt(x, y);
  clickCanvasContextMenuAction('open-add-node-catalog');
  clickCanvasAddCatalogAction('create-node', kind);
}

describe('HET1 public object-file DBT vertical', () => {
  beforeEach(function () {
    if (skipWhenFirstAuthoringLiveEnvIsMissing(this)) return;
  });

  it('authors, previews, and executes the content-addressed load, model, and test', () => {
    const session = resolveLiveWorkspaceSession();

    cy.fixture<Het1ObjectFileManifest>('het1-object-file-orders.manifest.json').then((manifest) => {
      assertLiveDraftScopeIsClean(session);
      cy.viewport(1500, 900);
      visitCleanDbtCanvas();

      cy.get('[data-slot="canvas-playground-empty-state"]', { timeout: 20_000 }).within(() => {
        cy.contains('button', 'dbt').should('be.enabled').click();
      });
      cy.contains('Start dbt canvas', { timeout: 20_000 }).should('be.visible');

      addCatalogNode(300, 260, 'dvt:object_file_load');
      cy.contains('.react-flow__node', OBJECT_NODE_CARD_TITLE, { timeout: 20_000 }).should(
        'be.visible'
      );
      openNodeWorkbench(OBJECT_NODE_CARD_TITLE);
      configureObjectFileLoad({
        nodeId: OBJECT_NODE_ID,
        manifest,
        targetRelation: TARGET_RELATION,
      });
      closeNodeWorkbench();

      addCatalogNode(650, 260, 'dbt:model');
      cy.contains('.react-flow__node', MODEL_NODE_NAME, { timeout: 20_000 }).should('be.visible');
      connectCanvasNodes(OBJECT_NODE_CARD_TITLE, MODEL_NODE_NAME);
      confirmCanvasDependency();

      openNodeWorkbench(MODEL_NODE_NAME);
      cy.get('select[name="dbt-materialized"]').should('be.enabled').select('table');
      cy.get('select[name="dbt-origin"]').should('be.enabled').select(OBJECT_NODE_ID);
      applyNodeWorkbench();
      openNodeWorkbenchSection('code');
      cy.get('textarea[name="dbt-model-sql"]')
        .should('be.visible')
        .and('contain.value', `{{ source('staging', '${TARGET_RELATION}') }}`);
      closeNodeWorkbench();

      addCatalogNode(980, 260, 'dbt:test');
      cy.contains('.react-flow__node', TEST_NODE_NAME, { timeout: 20_000 }).should('be.visible');
      connectCanvasNodes(MODEL_NODE_NAME, TEST_NODE_NAME);
      confirmCanvasDependency();

      openNodeWorkbench(TEST_NODE_NAME);
      cy.get('select[name="dbt-test-type"]').select('not_null');
      cy.get('select[name="dbt-test-target"]').select(MODEL_NODE_ID);
      cy.get('input[name="dbt-test-column"]').clear().type('order_id');
      cy.get('select[name="dbt-test-severity"]').select('error');
      applyNodeWorkbench();
      closeNodeWorkbench();

      waitForPersistedDraft({
        session,
        description: 'three configured nodes and their two dependencies',
        predicate: (body) => {
          const nodes = readDraftNodes(body);
          const edges = readDraftEdges(body);
          const objectMetadata = nodes.find((node) => node.id === OBJECT_NODE_ID)?.metadata;
          const modelMetadata = nodes.find((node) => node.id === MODEL_NODE_ID)?.metadata;
          const testMetadata = nodes.find((node) => node.id === TEST_NODE_ID)?.metadata;
          const objectSource = objectMetadata?.objectFilePostgres as
            { source?: { sha256?: unknown } } | undefined;
          const dbtModel = modelMetadata?.dbt as { selectedSourceId?: unknown } | undefined;
          const dbtTest = testMetadata?.dbtTest as { targetColumn?: unknown } | undefined;
          return (
            [OBJECT_NODE_ID, MODEL_NODE_ID, TEST_NODE_ID].every((nodeId) =>
              nodes.some((node) => node.id === nodeId)
            ) &&
            edges.some(
              (edge) => edge.sourceId === OBJECT_NODE_ID && edge.targetId === MODEL_NODE_ID
            ) &&
            edges.some(
              (edge) => edge.sourceId === MODEL_NODE_ID && edge.targetId === TEST_NODE_ID
            ) &&
            objectSource?.source?.sha256 === manifest.sha256 &&
            dbtModel?.selectedSourceId === OBJECT_NODE_ID &&
            dbtTest?.targetColumn === 'order_id'
          );
        },
      }).then((body) => {
        const nodes = readDraftNodes(body);
        const objectMetadata = nodes.find((node) => node.id === OBJECT_NODE_ID)?.metadata;
        expect(objectMetadata).to.have.nested.property(
          'objectFilePostgres.source.storageUri',
          manifest.storageUri
        );
        expect(objectMetadata).to.have.nested.property(
          'objectFilePostgres.source.sha256',
          manifest.sha256
        );
        expect(objectMetadata).to.have.nested.property(
          'objectFilePostgres.source.sizeBytes',
          manifest.sizeBytes
        );
        expect(objectMetadata).to.have.nested.property(
          'objectFilePostgres.source.maxBytes',
          manifest.sizeBytes
        );
        expect(objectMetadata).to.have.nested.property(
          'objectFilePostgres.source.credentialRef',
          manifest.sourceCredentialRef
        );
        expect(objectMetadata).to.have.nested.property(
          'objectFilePostgres.target.relation',
          TARGET_RELATION
        );
        expect(objectMetadata).to.have.nested.property(
          'objectFilePostgres.target.credentialRef',
          manifest.targetCredentialRef
        );
        expect(objectMetadata)
          .to.have.nested.property('objectFilePostgres.columns')
          .that.deep.equals([
            {
              sourceField: 'order_id',
              targetColumn: 'order_id',
              dataType: 'bigint',
              nullable: false,
            },
            {
              sourceField: 'amount',
              targetColumn: 'amount',
              dataType: 'numeric',
              nullable: true,
            },
          ]);
        expect(nodes.find((node) => node.id === MODEL_NODE_ID)?.metadata).to.have.nested.property(
          'dbt.selectedSourceId',
          OBJECT_NODE_ID
        );
        expect(nodes.find((node) => node.id === TEST_NODE_ID)?.metadata).to.have.nested.property(
          'dbtTest.targetColumn',
          'order_id'
        );
      });

      clickPreviewExecutionPlanFromOperationalDrawer();
      cy.get('[data-testid="plan-preview-modal"]', { timeout: 30_000 })
        .should('be.visible')
        .and('contain.text', 'Execution Preview identity')
        .and('contain.text', 'Persistence evidence')
        .and('contain.text', OBJECT_NODE_ID)
        .and('contain.text', MODEL_NODE_ID)
        .and('contain.text', TEST_NODE_ID)
        .and('contain.text', 'LOAD_OBJECT_FILE_TO_POSTGRES')
        .and('contain.text', 'DBT_MODEL')
        .and('contain.text', 'DBT_TEST');

      readLiveWorkspaceFile('models/model_1.sql', session).then((response) => {
        expect(response.status).to.equal(200);
        expect(String((response.body as { content?: unknown }).content ?? ''))
          .to.contain("{{ config(materialized='table') }}")
          .and.to.contain(`{{ source('staging', '${TARGET_RELATION}') }}`);
      });
      readLiveWorkspaceFile('models/schema.yml', session).then((response) => {
        expect(response.status).to.equal(200);
        const content = String((response.body as { content?: unknown }).content ?? '');
        expect(content).to.contain('name: dbt_test_1');
        expect(content).to.contain('severity: error');
        expect(content).to.contain('name: order_id');
      });

      cy.get('[data-testid="plan-preview-modal"]').within(() => {
        cy.contains('button', 'Close').click();
      });
      cy.get('[data-slot="shell-run-command"]')
        .should('be.enabled')
        .then(($button) => ($button.get(0) as HTMLButtonElement).click());

      cy.location('pathname', { timeout: 30_000 }).should('match', /^\/runs\/[^/]+$/u);
      cy.location('pathname').then((pathname) => {
        const runId = pathname.split('/').pop();
        expect(runId).to.be.a('string').and.not.equal('');

        waitForRunStatus(runId!, 'completed').then((snapshot) => {
          expect(String(snapshot.status).toLowerCase()).to.equal('completed');
        });
        readHet1RunEvents(runId!).then((events) => {
          assertStepEventSet(events, 'StepCompleted', [
            OBJECT_NODE_ID,
            MODEL_NODE_ID,
            TEST_NODE_ID,
          ]);
          assertObjectLoadEvidence({
            events,
            stepId: OBJECT_NODE_ID,
            expectedRows: 2,
            expectedSha256: manifest.sha256,
            expectedSizeBytes: manifest.sizeBytes,
            expectedPublicationOutcome: 'created',
          });
          expect(events.map((event) => event.eventType)).to.include('RunCompleted');
          assertRunEvidenceDoesNotLeak(events, [
            'minioadmin',
            'order_id,amount',
            '1,10.25',
            '2,20.50',
          ]);
        });
      });

      cy.contains(/^Run /u, { timeout: 30_000 }).should('exist');
      cy.get('[data-slot="run-event-timeline-table"]', { timeout: 30_000 })
        .scrollIntoView()
        .should('be.visible')
        .and('contain.text', 'StepCompleted')
        .and('contain.text', 'RunCompleted');
    });
  });
});

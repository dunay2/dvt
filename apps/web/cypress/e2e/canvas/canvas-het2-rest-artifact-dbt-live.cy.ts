/**
 * Owned concern: prove the public HET2 HTTPS JSON -> artifact -> PostgreSQL -> DBT route.
 */
import {
  clickCanvasAddCatalogAction,
  clickCanvasContextMenuAction,
  clickPreviewExecutionPlanFromOperationalDrawer,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import { skipWhenFirstAuthoringLiveEnvIsMissing } from '../../support/canvasFirstAuthoring';
import {
  connectCanvasNodes,
  dragCanvasNodeByViewportDelta,
  openNodeWorkbenchSection,
} from '../../support/canvasGraphAuthoring';
import {
  assertStepEventAbsent,
  type Het1PublicGraphIdentity,
  proveControlledHet1DbtTestFailure,
} from '../../support/het1PublicFailureRecoveryProof';
import {
  assertHet1RunUsesPlan,
  assertObjectLoadEvidence,
  assertRunEvidenceDoesNotLeak,
  assertStepEventSet,
  cancelHet1Run,
  findRequiredStepEvent,
  readHet1RunEvents,
  recoverHet1Run,
  startPreviewedHet1Run,
  waitForHet1RunEvent,
  waitForHet1RunStatus,
} from '../../support/het1PublicRunProof';
import {
  applyNodeWorkbench,
  assertLiveDraftScopeIsClean,
  closeNodeWorkbench,
  confirmCanvasDependency,
  openNodeWorkbench,
  readDraftEdges,
  readDraftNodes,
  visitHet1DbtCanvas,
  waitForPersistedDraft,
} from '../../support/het1PublicVertical';
import {
  asHet1CompatibleManifest,
  configureHttpJsonAcquisition,
  configureJsonlObjectFileLoad,
  type Het2HttpJsonManifest,
  updateHttpJsonEndpointRef,
} from '../../support/het2PublicVertical';
import { resolveLiveWorkspaceSession } from '../../support/liveProtectedRuntime';

const ACQUISITION_NODE_ID = 'dvt.http-json-http-json-acquisition-1';
const ACQUISITION_NODE_NAME = 'Http Json Acquisition 1';
const OBJECT_NODE_ID = 'dvt.object-file-postgres-object-file-load-1';
const OBJECT_NODE_NAME = 'Object File Load 1';
const MODEL_NODE_ID = 'dbt-model-1';
const MODEL_NODE_NAME = 'Model 1';
const TEST_NODE_ID = 'dbt-test-1';
const TEST_NODE_NAME = 'Test 1';
const TARGET_RELATION = 'het2_orders_stage';
const DENIED_ENDPOINT_REF = 'http-endpoint:het2-denied';
const STATUS_FAILURE_ENDPOINT_REF = 'http-endpoint:het2-status-failure';
const INTEGRITY_MISMATCH_ENDPOINT_REF = 'http-endpoint:het2-integrity-mismatch';
const TIMEOUT_ENDPOINT_REF = 'http-endpoint:het2-timeout';
const SLOW_ONCE_ENDPOINT_REF = 'http-endpoint:het2-slow-once';
const HET2_FORBIDDEN_EVIDENCE = [
  'het2-fixture-bearer-token',
  'https://127.0.0.1',
  '{"order_id":1,"amount":10.25}',
  '{"order_id":2,"amount":20.50}',
] as const;
const DBT_GRAPH_IDENTITY: Het1PublicGraphIdentity = {
  objectNodeId: OBJECT_NODE_ID,
  objectNodeName: OBJECT_NODE_NAME,
  modelNodeId: MODEL_NODE_ID,
  modelNodeName: MODEL_NODE_NAME,
  testNodeId: TEST_NODE_ID,
  testNodeName: TEST_NODE_NAME,
  targetRelation: TARGET_RELATION,
};

function addCatalogNode(x: number, y: number, kind: string): void {
  openCanvasContextMenuAt(x, y);
  clickCanvasContextMenuAction('open-add-node-catalog');
  clickCanvasAddCatalogAction('create-node', kind);
}

function openHet2PlanPreview(): void {
  clickPreviewExecutionPlanFromOperationalDrawer();
  cy.get('[data-testid="plan-preview-modal"]', { timeout: 30_000 })
    .should('be.visible')
    .and('contain.text', ACQUISITION_NODE_ID)
    .and('contain.text', OBJECT_NODE_ID)
    .and('contain.text', MODEL_NODE_ID)
    .and('contain.text', TEST_NODE_ID)
    .and('contain.text', 'ACQUIRE_HTTP_JSON_ARTIFACT')
    .and('contain.text', 'LOAD_OBJECT_FILE_TO_POSTGRES')
    .and('contain.text', 'DBT_MODEL')
    .and('contain.text', 'DBT_TEST');
}

function assertAcquisitionEvidence(args: {
  events: Parameters<typeof assertRunEvidenceDoesNotLeak>[0];
  manifest: Het2HttpJsonManifest;
  publicationOutcome: 'created' | 'verified-existing';
  endpointRef?: string;
}): void {
  const event = findRequiredStepEvent(args.events, 'StepCompleted', ACQUISITION_NODE_ID);
  expect(event).to.have.nested.property(
    'payload.resultEvidence.evidenceType',
    'artifact-acquisition'
  );
  expect(event).to.have.nested.property(
    'payload.resultEvidence.endpointRef',
    args.endpointRef ?? args.manifest.endpointRef
  );
  expect(event).to.have.nested.property(
    'payload.resultEvidence.artifact.storageUri',
    args.manifest.storageUri
  );
  expect(event).to.have.nested.property(
    'payload.resultEvidence.artifact.sha256',
    args.manifest.sha256
  );
  expect(event).to.have.nested.property(
    'payload.resultEvidence.publicationOutcome',
    args.publicationOutcome
  );
  expect(event).to.have.nested.property('payload.resultEvidence.statusCode', 200);
}

function assertStepStartedAbsent(
  events: readonly Readonly<{ eventType?: string; stepId?: string }>[],
  stepIds: readonly string[]
): void {
  for (const stepId of stepIds) {
    expect(
      events.some((event) => event.eventType === 'StepStarted' && event.stepId === stepId),
      `StepStarted must be absent for ${stepId}`
    ).to.equal(false);
  }
}

function runSuccessfulRoute(
  manifest: Het2HttpJsonManifest,
  publicationOutcome: 'created' | 'verified-existing',
  objectPublicationOutcomes: readonly ('created' | 'replaced')[]
): void {
  openHet2PlanPreview();
  startPreviewedHet1Run().then(({ runId, planId }) => {
    assertHet1RunUsesPlan(runId, planId);
    waitForHet1RunStatus(runId, 'completed');
    readHet1RunEvents(runId).then((events) => {
      assertStepEventSet(events, 'StepCompleted', [
        ACQUISITION_NODE_ID,
        OBJECT_NODE_ID,
        MODEL_NODE_ID,
        TEST_NODE_ID,
      ]);
      assertAcquisitionEvidence({ events, manifest, publicationOutcome });
      assertObjectLoadEvidence({
        events,
        stepId: OBJECT_NODE_ID,
        expectedRows: 2,
        expectedSha256: manifest.sha256,
        expectedSizeBytes: manifest.sizeBytes,
        expectedPublicationOutcomes: objectPublicationOutcomes,
      });
      expect(events.map((event) => event.eventType)).to.include('RunCompleted');
      assertRunEvidenceDoesNotLeak(events, HET2_FORBIDDEN_EVIDENCE);
    });
  });
}

describe('HET2 public REST artifact DBT vertical', () => {
  beforeEach(function () {
    if (skipWhenFirstAuthoringLiveEnvIsMissing(this)) return;
  });

  it('proves acquisition, idempotency, HTTP refusal, integrity, cancellation, and recovery', () => {
    const session = resolveLiveWorkspaceSession();

    cy.fixture<Het2HttpJsonManifest>('het2-http-json-orders.manifest.json').then((manifest) => {
      assertLiveDraftScopeIsClean(session);
      cy.viewport(1500, 900);
      visitHet1DbtCanvas({ resetBrowserState: true });

      cy.get('[data-slot="canvas-playground-empty-state"]', { timeout: 20_000 }).within(() => {
        cy.contains('button', 'dbt').should('be.enabled').click();
      });
      cy.contains('Start dbt canvas', { timeout: 20_000 }).should('be.visible');

      addCatalogNode(180, 240, 'dvt:http_json_acquisition');
      cy.contains('.react-flow__node', ACQUISITION_NODE_NAME, { timeout: 20_000 }).should(
        'be.visible'
      );
      dragCanvasNodeByViewportDelta(ACQUISITION_NODE_NAME, { x: -380, y: 180 });
      openNodeWorkbench(ACQUISITION_NODE_NAME);
      configureHttpJsonAcquisition({ nodeId: ACQUISITION_NODE_ID, manifest });
      closeNodeWorkbench();

      addCatalogNode(470, 240, 'dvt:object_file_load');
      cy.contains('.react-flow__node', OBJECT_NODE_NAME, { timeout: 20_000 }).should('be.visible');
      dragCanvasNodeByViewportDelta(OBJECT_NODE_NAME, { x: -130, y: 100 });
      openNodeWorkbench(OBJECT_NODE_NAME);
      configureJsonlObjectFileLoad({
        nodeId: OBJECT_NODE_ID,
        manifest,
        targetRelation: TARGET_RELATION,
      });
      closeNodeWorkbench();
      connectCanvasNodes(ACQUISITION_NODE_NAME, OBJECT_NODE_NAME);
      confirmCanvasDependency();

      addCatalogNode(760, 240, 'dbt:model');
      cy.contains('.react-flow__node', MODEL_NODE_NAME, { timeout: 20_000 }).should('be.visible');
      dragCanvasNodeByViewportDelta(MODEL_NODE_NAME, { x: 120, y: -120 });
      connectCanvasNodes(OBJECT_NODE_NAME, MODEL_NODE_NAME);
      confirmCanvasDependency();
      openNodeWorkbench(MODEL_NODE_NAME);
      openNodeWorkbenchSection('general');
      cy.get('select[name="dbt-materialized"]').select('table');
      cy.get('select[name="dbt-origin"]').select(OBJECT_NODE_ID);
      applyNodeWorkbench();
      openNodeWorkbenchSection('code');
      cy.get('[data-testid="monaco-code-editor"]', { timeout: 20_000 })
        .find('.view-lines')
        .invoke('text')
        .should((renderedCode) => {
          expect(renderedCode.replaceAll('\u00a0', ' ')).to.contain(
            `{{ source('staging', '${TARGET_RELATION}') }}`
          );
        });
      closeNodeWorkbench();

      addCatalogNode(1060, 240, 'dbt:test');
      cy.contains('.react-flow__node', TEST_NODE_NAME, { timeout: 20_000 }).should('be.visible');
      dragCanvasNodeByViewportDelta(TEST_NODE_NAME, { x: 360, y: 0 });
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
        description: 'four configured HET2 nodes and three dependencies',
        predicate: (body) => {
          const nodes = readDraftNodes(body);
          const edges = readDraftEdges(body);
          const acquisition = nodes.find((node) => node.id === ACQUISITION_NODE_ID)?.metadata
            ?.httpJsonArtifact as
            | {
                request?: { endpointRef?: unknown; authCredentialRef?: unknown };
                response?: {
                  format?: unknown;
                  expectedSha256?: unknown;
                  expectedSizeBytes?: unknown;
                  maxBytes?: unknown;
                };
                artifact?: { storageUri?: unknown; credentialRef?: unknown };
                limits?: {
                  connectTimeoutMs?: unknown;
                  requestTimeoutMs?: unknown;
                  maxRedirects?: unknown;
                };
              }
            | undefined;
          const objectLoad = nodes.find((node) => node.id === OBJECT_NODE_ID)?.metadata
            ?.objectFilePostgres as { source?: { format?: unknown } } | undefined;
          const model = nodes.find((node) => node.id === MODEL_NODE_ID)?.metadata?.dbt as
            { materialized?: unknown; selectedSourceId?: unknown } | undefined;
          const test = nodes.find((node) => node.id === TEST_NODE_ID)?.metadata?.dbtTest as
            | {
                testType?: unknown;
                targetModelId?: unknown;
                targetColumn?: unknown;
                severity?: unknown;
              }
            | undefined;
          return (
            [ACQUISITION_NODE_ID, OBJECT_NODE_ID, MODEL_NODE_ID, TEST_NODE_ID].every((nodeId) =>
              nodes.some((node) => node.id === nodeId)
            ) &&
            edges.some(
              (edge) => edge.sourceId === ACQUISITION_NODE_ID && edge.targetId === OBJECT_NODE_ID
            ) &&
            edges.some(
              (edge) => edge.sourceId === OBJECT_NODE_ID && edge.targetId === MODEL_NODE_ID
            ) &&
            edges.some(
              (edge) => edge.sourceId === MODEL_NODE_ID && edge.targetId === TEST_NODE_ID
            ) &&
            acquisition?.request?.endpointRef === manifest.endpointRef &&
            acquisition.request.authCredentialRef === manifest.authCredentialRef &&
            acquisition.response?.format === 'jsonl' &&
            acquisition?.response?.expectedSha256 === manifest.sha256 &&
            acquisition.response.expectedSizeBytes === manifest.sizeBytes &&
            acquisition.response.maxBytes === manifest.sizeBytes &&
            acquisition.artifact?.storageUri === manifest.storageUri &&
            acquisition.artifact.credentialRef === manifest.artifactCredentialRef &&
            acquisition.limits?.connectTimeoutMs === 2_000 &&
            acquisition.limits.requestTimeoutMs === 20_000 &&
            acquisition.limits.maxRedirects === 0 &&
            objectLoad?.source?.format === 'jsonl' &&
            model?.materialized === 'table' &&
            model.selectedSourceId === OBJECT_NODE_ID &&
            test?.testType === 'not_null' &&
            test.targetModelId === MODEL_NODE_ID &&
            test.targetColumn === 'order_id' &&
            test.severity === 'error'
          );
        },
      });

      visitHet1DbtCanvas();
      runSuccessfulRoute(manifest, 'created', ['created', 'replaced']);

      visitHet1DbtCanvas();
      runSuccessfulRoute(manifest, 'verified-existing', ['replaced']);

      const persistEndpoint = (endpointRef: string, description: string): void => {
        visitHet1DbtCanvas();
        updateHttpJsonEndpointRef({
          nodeId: ACQUISITION_NODE_ID,
          nodeName: ACQUISITION_NODE_NAME,
          endpointRef,
        });
        waitForPersistedDraft({
          session,
          description,
          predicate: (body) => {
            const acquisition = readDraftNodes(body).find((node) => node.id === ACQUISITION_NODE_ID)
              ?.metadata?.httpJsonArtifact as { request?: { endpointRef?: unknown } } | undefined;
            return acquisition?.request?.endpointRef === endpointRef;
          },
        });
      };
      const proveAcquisitionFailure = (
        endpointRef: string,
        description: string,
        expectedCode: string
      ): void => {
        persistEndpoint(endpointRef, description);
        openHet2PlanPreview();
        startPreviewedHet1Run().then(({ runId, planId }) => {
          assertHet1RunUsesPlan(runId, planId);
          return waitForHet1RunStatus(runId, 'failed')
            .then(() => readHet1RunEvents(runId))
            .then((events) => {
              assertStepEventSet(events, 'StepFailed', [ACQUISITION_NODE_ID]);
              assertStepStartedAbsent(events, [OBJECT_NODE_ID, MODEL_NODE_ID, TEST_NODE_ID]);
              expect(JSON.stringify(events)).to.contain(expectedCode);
              assertRunEvidenceDoesNotLeak(events, HET2_FORBIDDEN_EVIDENCE);
            });
        });
      };

      proveAcquisitionFailure(
        DENIED_ENDPOINT_REF,
        'denied HET2 endpoint reference',
        'HTTP_JSON_ENDPOINT_REF_DENIED'
      );
      proveAcquisitionFailure(
        STATUS_FAILURE_ENDPOINT_REF,
        'controlled HET2 HTTP status failure',
        'HTTP_JSON_STATUS_MISMATCH'
      );
      proveAcquisitionFailure(
        INTEGRITY_MISMATCH_ENDPOINT_REF,
        'controlled HET2 response integrity mismatch',
        'HTTP_JSON_INTEGRITY_MISMATCH'
      );
      proveAcquisitionFailure(
        TIMEOUT_ENDPOINT_REF,
        'controlled HET2 request timeout',
        'HTTP_JSON_ACQUISITION_FAILED'
      );

      persistEndpoint(SLOW_ONCE_ENDPOINT_REF, 'slow first acquisition for cancellation proof');
      openHet2PlanPreview();
      startPreviewedHet1Run().then(({ runId: sourceRunId, planId }) => {
        assertHet1RunUsesPlan(sourceRunId, planId);
        return waitForHet1RunEvent({
          runId: sourceRunId,
          eventType: 'StepStarted',
          stepId: ACQUISITION_NODE_ID,
        })
          .then(() => cancelHet1Run(sourceRunId))
          .then(() => readHet1RunEvents(sourceRunId))
          .then((events) => {
            assertStepEventAbsent(events, 'StepCompleted', [ACQUISITION_NODE_ID]);
            assertStepStartedAbsent(events, [OBJECT_NODE_ID, MODEL_NODE_ID, TEST_NODE_ID]);
            expect(events.map((event) => event.eventType)).to.include.members([
              'RunCancelRequested',
              'RunCancelled',
            ]);
            assertRunEvidenceDoesNotLeak(events, HET2_FORBIDDEN_EVIDENCE);
          })
          .then(() => recoverHet1Run(sourceRunId))
          .then((recoveryRunId) => {
            assertHet1RunUsesPlan(recoveryRunId, planId);
            return waitForHet1RunStatus(recoveryRunId, 'completed')
              .then(() => readHet1RunEvents(recoveryRunId))
              .then((events) => {
                assertStepEventSet(events, 'StepCompleted', [
                  ACQUISITION_NODE_ID,
                  OBJECT_NODE_ID,
                  MODEL_NODE_ID,
                  TEST_NODE_ID,
                ]);
                assertAcquisitionEvidence({
                  events,
                  manifest,
                  endpointRef: SLOW_ONCE_ENDPOINT_REF,
                  publicationOutcome: 'verified-existing',
                });
                assertObjectLoadEvidence({
                  events,
                  stepId: OBJECT_NODE_ID,
                  expectedRows: 2,
                  expectedSha256: manifest.sha256,
                  expectedSizeBytes: manifest.sizeBytes,
                  expectedPublicationOutcomes: ['replaced'],
                });
                expect(events.map((event) => event.eventType)).to.include('RunCompleted');
                assertRunEvidenceDoesNotLeak(events, HET2_FORBIDDEN_EVIDENCE);
              });
          });
      });

      persistEndpoint(manifest.endpointRef, 'restored approved HET2 endpoint reference');
      const compatibleManifest = asHet1CompatibleManifest(manifest);
      proveControlledHet1DbtTestFailure({
        identity: DBT_GRAPH_IDENTITY,
        manifest: compatibleManifest,
        objectSourceIdentityIsCurrent: true,
        upstreamCompletedStepIds: [ACQUISITION_NODE_ID],
        additionalForbiddenValues: HET2_FORBIDDEN_EVIDENCE,
      });
    });
  });
});

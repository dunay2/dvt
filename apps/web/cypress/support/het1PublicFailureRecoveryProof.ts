/** Owned concern: prove HET1 failure, cancellation, and recovery through public product rails. */
import { clickPreviewExecutionPlanFromOperationalDrawer } from './canvasExecutionSelection';
import {
  assertObjectLoadEvidence,
  assertRunEvidenceDoesNotLeak,
  assertStepEventSet,
  assertHet1RunUsesPlan,
  cancelHet1Run,
  recoverHet1Run,
  readHet1RunEvents,
  startPreviewedHet1Run,
  waitForHet1RunEvent,
  waitForHet1RunStatus,
} from './het1PublicRunProof';
import {
  type Het1ObjectFileManifest,
  readDraftNodes,
  updateDbtModelSql,
  updateDbtTestColumn,
  updateObjectFileSourceIdentity,
  visitHet1DbtCanvas,
  waitForPersistedDraft,
} from './het1PublicVertical';
import { readLiveRunSnapshot, resolveLiveWorkspaceSession } from './liveProtectedRuntime';

export type Het1PublicGraphIdentity = Readonly<{
  objectNodeId: string;
  objectNodeName: string;
  modelNodeId: string;
  modelNodeName: string;
  testNodeId: string;
  testNodeName: string;
  targetRelation: string;
}>;

const FAILING_DBT_TEST_COLUMN = 'missing_order_id';

function waitForDraftMetadata(
  description: string,
  predicate: (metadataByNodeId: ReadonlyMap<string, Record<string, unknown>>) => boolean
): void {
  waitForPersistedDraft({
    session: resolveLiveWorkspaceSession(),
    description,
    predicate: (body) =>
      predicate(
        new Map(readDraftNodes(body).map((node) => [node.id, node.metadata ?? {}] as const))
      ),
  });
}

function openHet1PlanPreview(identity: Het1PublicGraphIdentity): void {
  clickPreviewExecutionPlanFromOperationalDrawer();
  cy.get('[data-testid="plan-preview-modal"]', { timeout: 30_000 })
    .should('be.visible')
    .and('contain.text', identity.objectNodeId)
    .and('contain.text', identity.modelNodeId)
    .and('contain.text', identity.testNodeId);
}

function assertRunTimeline(eventType: string): void {
  cy.get('[data-slot="run-detail-diagnostics-tab"]', { timeout: 30_000 }).click();
  cy.get('[data-slot="run-event-timeline-table"]', { timeout: 30_000 })
    .scrollIntoView()
    .should('be.visible')
    .and('contain.text', eventType);
}

function assertStepEventAbsent(
  events: readonly Readonly<{ eventType?: string; stepId?: string }>[],
  eventType: string,
  stepIds: readonly string[]
): void {
  for (const stepId of stepIds) {
    expect(
      events.some((event) => event.eventType === eventType && event.stepId === stepId),
      `${eventType} must be absent for ${stepId}`
    ).to.equal(false);
  }
}

function assertNoSensitiveEvidence(
  events: Parameters<typeof assertRunEvidenceDoesNotLeak>[0],
  additionalForbiddenValues: readonly string[] = []
): void {
  assertRunEvidenceDoesNotLeak(events, [
    'minioadmin',
    'order_id,amount',
    '1,10.25',
    '2,20.50',
    ...additionalForbiddenValues,
  ]);
}

export function proveControlledHet1IngestionFailure(args: {
  identity: Het1PublicGraphIdentity;
  manifest: Het1ObjectFileManifest;
}): void {
  const { identity, manifest } = args;
  const mismatchObject = manifest.integrityMismatchObject;
  visitHet1DbtCanvas();
  updateObjectFileSourceIdentity({
    nodeId: identity.objectNodeId,
    nodeName: identity.objectNodeName,
    storageUri: mismatchObject.storageUri,
    sha256: mismatchObject.sha256,
  });
  waitForDraftMetadata('content-addressed integrity-mismatch object', (metadataByNodeId) => {
    const source = (
      metadataByNodeId.get(identity.objectNodeId)?.objectFilePostgres as
        { source?: { sha256?: unknown } } | undefined
    )?.source;
    return (
      source?.sha256 === mismatchObject.sha256 &&
      (source as { storageUri?: unknown } | undefined)?.storageUri === mismatchObject.storageUri
    );
  });
  openHet1PlanPreview(identity);
  startPreviewedHet1Run().then(({ runId, planId }) => {
    assertHet1RunUsesPlan(runId, planId);
    waitForHet1RunStatus(runId, 'failed');
    readHet1RunEvents(runId).then((events) => {
      assertStepEventSet(events, 'StepFailed', [identity.objectNodeId]);
      assertStepEventAbsent(events, 'StepStarted', [identity.modelNodeId, identity.testNodeId]);
      expect(JSON.stringify(events)).to.contain('OBJECT_SOURCE_INTEGRITY_MISMATCH');
      expect(events.map((event) => event.eventType)).to.include('RunFailed');
      assertNoSensitiveEvidence(events);
    });
  });
  assertRunTimeline('RunFailed');
}

export function proveControlledHet1DbtTestFailure(args: {
  identity: Het1PublicGraphIdentity;
  manifest: Het1ObjectFileManifest;
  objectSourceIdentityIsCurrent?: boolean;
  upstreamCompletedStepIds?: readonly string[];
  additionalForbiddenValues?: readonly string[];
}): void {
  const { identity, manifest } = args;
  visitHet1DbtCanvas();
  if (args.objectSourceIdentityIsCurrent !== true) {
    updateObjectFileSourceIdentity({
      nodeId: identity.objectNodeId,
      nodeName: identity.objectNodeName,
      storageUri: manifest.storageUri,
      sha256: manifest.sha256,
    });
  }
  updateDbtTestColumn({
    nodeName: identity.testNodeName,
    targetColumn: FAILING_DBT_TEST_COLUMN,
  });
  waitForDraftMetadata(
    'restored object digest and failing DBT test target column',
    (metadataByNodeId) =>
      (
        metadataByNodeId.get(identity.objectNodeId)?.objectFilePostgres as
          { source?: { sha256?: unknown } } | undefined
      )?.source?.sha256 === manifest.sha256 &&
      (metadataByNodeId.get(identity.testNodeId)?.dbtTest as { targetColumn?: unknown } | undefined)
        ?.targetColumn === FAILING_DBT_TEST_COLUMN
  );
  openHet1PlanPreview(identity);
  startPreviewedHet1Run().then(({ runId, planId }) => {
    assertHet1RunUsesPlan(runId, planId);
    waitForHet1RunStatus(runId, 'failed');
    readHet1RunEvents(runId).then((events) => {
      assertStepEventSet(events, 'StepCompleted', [
        ...(args.upstreamCompletedStepIds ?? []),
        identity.objectNodeId,
        identity.modelNodeId,
      ]);
      assertStepEventSet(events, 'StepFailed', [identity.testNodeId]);
      assertObjectLoadEvidence({
        events,
        stepId: identity.objectNodeId,
        expectedRows: 2,
        expectedSha256: manifest.sha256,
        expectedSizeBytes: manifest.sizeBytes,
        expectedPublicationOutcomes: ['replaced'],
      });
      expect(events.map((event) => event.eventType)).to.include('RunFailed');
      assertNoSensitiveEvidence(events, args.additionalForbiddenValues);
    });
  });
  assertRunTimeline('RunFailed');
}

export function proveHet1CancellationAndRecovery(args: {
  identity: Het1PublicGraphIdentity;
  manifest: Het1ObjectFileManifest;
  upstreamCompletedStepIds?: readonly string[];
  additionalForbiddenValues?: readonly string[];
}): void {
  const { identity, manifest } = args;
  const longRunningModelSql = `with delayed as (
  select pg_sleep(20)
)
select source.*
from {{ source('staging', '${identity.targetRelation}') }} as source
cross join delayed`;

  visitHet1DbtCanvas();
  updateDbtTestColumn({ nodeName: identity.testNodeName, targetColumn: 'order_id' });
  updateDbtModelSql({ nodeName: identity.modelNodeName, sql: longRunningModelSql });
  waitForDraftMetadata(
    'long-running DBT model and restored passing test',
    (metadataByNodeId) =>
      (metadataByNodeId.get(identity.modelNodeId)?.config as { sql?: unknown } | undefined)?.sql ===
        longRunningModelSql &&
      (metadataByNodeId.get(identity.testNodeId)?.dbtTest as { targetColumn?: unknown } | undefined)
        ?.targetColumn === 'order_id'
  );
  openHet1PlanPreview(identity);
  startPreviewedHet1Run().then(({ runId: sourceRunId, planId }) => {
    assertHet1RunUsesPlan(sourceRunId, planId);
    waitForHet1RunEvent({
      runId: sourceRunId,
      eventType: 'StepStarted',
      stepId: identity.modelNodeId,
    });
    cancelHet1Run(sourceRunId).then((cancelledSnapshot) => {
      expect(cancelledSnapshot).to.have.property('planId', planId);
    });
    readHet1RunEvents(sourceRunId).then((events) => {
      assertStepEventSet(events, 'StepCompleted', [
        ...(args.upstreamCompletedStepIds ?? []),
        identity.objectNodeId,
        identity.modelNodeId,
      ]);
      assertStepEventSet(events, 'StepStarted', [identity.modelNodeId]);
      assertStepEventAbsent(events, 'StepCompleted', [identity.testNodeId]);
      assertStepEventAbsent(events, 'StepStarted', [identity.testNodeId]);
      assertObjectLoadEvidence({
        events,
        stepId: identity.objectNodeId,
        expectedRows: 2,
        expectedSha256: manifest.sha256,
        expectedSizeBytes: manifest.sizeBytes,
        expectedPublicationOutcomes: ['replaced'],
      });
      expect(events.map((event) => event.eventType)).to.include.members([
        'RunCancelRequested',
        'RunCancelled',
      ]);
      const modelCompletedIndex = events.findIndex(
        (event) => event.eventType === 'StepCompleted' && event.stepId === identity.modelNodeId
      );
      const cancelRequestedIndex = events.findIndex(
        (event) => event.eventType === 'RunCancelRequested'
      );
      const cancelledIndex = events.findIndex((event) => event.eventType === 'RunCancelled');
      expect(
        cancelRequestedIndex,
        'runtime cancellation begins after the active layer settles'
      ).to.be.greaterThan(modelCompletedIndex);
      expect(cancelledIndex, 'runtime cancellation reaches its terminal fact').to.be.greaterThan(
        cancelRequestedIndex
      );
      assertNoSensitiveEvidence(events, args.additionalForbiddenValues);
    });

    recoverHet1Run(sourceRunId).then((recoveryRunId) => {
      assertHet1RunUsesPlan(recoveryRunId, planId);
      readLiveRunSnapshot(sourceRunId).then((response) => {
        expect(response.status).to.equal(200);
        expect(String((response.body as { status?: unknown }).status).toLowerCase()).to.equal(
          'cancelled'
        );
      });
      waitForHet1RunStatus(recoveryRunId, 'completed');
      readHet1RunEvents(recoveryRunId).then((events) => {
        assertStepEventSet(events, 'StepCompleted', [
          ...(args.upstreamCompletedStepIds ?? []),
          identity.objectNodeId,
          identity.modelNodeId,
          identity.testNodeId,
        ]);
        assertObjectLoadEvidence({
          events,
          stepId: identity.objectNodeId,
          expectedRows: 2,
          expectedSha256: manifest.sha256,
          expectedSizeBytes: manifest.sizeBytes,
          expectedPublicationOutcomes: ['replaced'],
        });
        expect(events.map((event) => event.eventType)).to.include('RunCompleted');
        assertNoSensitiveEvidence(events, args.additionalForbiddenValues);
      });
    });
  });
  assertRunTimeline('RunCompleted');
}

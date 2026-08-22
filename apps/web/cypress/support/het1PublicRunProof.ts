/** Owned concern: observe HET1 run control and event evidence through public protected rails. */
import { readLiveRunEvents, readLiveRunSnapshot } from './liveProtectedRuntime';

export type Het1RunStatus = 'completed' | 'failed' | 'cancelled';

export type PreviewedHet1Run = Readonly<{
  runId: string;
  planId: string;
}>;

export type Het1RunEvent = Readonly<{
  eventType?: string;
  stepId?: string;
  payload?: Record<string, unknown>;
}>;

type Het1RunEventResponse = Readonly<{
  items?: readonly Het1RunEvent[];
}>;

export function readHet1RunEvents(runId: string): Cypress.Chainable<readonly Het1RunEvent[]> {
  return readLiveRunEvents(runId).then((response) => {
    expect(response.status).to.equal(200);
    return (response.body as Het1RunEventResponse).items ?? [];
  });
}

export function assertHet1RunUsesPlan(runId: string, expectedPlanId: string): void {
  readLiveRunSnapshot(runId).then((response) => {
    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('planId', expectedPlanId);
  });
}

export function waitForHet1RunStatus(
  runId: string,
  expectedStatus: Het1RunStatus,
  attempt = 0
): Cypress.Chainable<Record<string, unknown>> {
  return readLiveRunSnapshot(runId).then((response) => {
    expect(response.status).to.equal(200);
    const snapshot = response.body as Record<string, unknown>;
    const status = String(snapshot.status ?? '').toLowerCase();

    if (status === expectedStatus) return snapshot;
    if (['completed', 'failed', 'cancelled'].includes(status)) {
      return readHet1RunEvents(runId).then((events) => {
        throw new Error(
          `HET1 live run ${runId} reached ${status} while waiting for ${expectedStatus}: ` +
            JSON.stringify(events)
        );
      });
    }
    if (attempt >= 120) {
      throw new Error(`Timed out waiting for HET1 live run ${runId} to become ${expectedStatus}.`);
    }

    return cy.wait(500).then(() => waitForHet1RunStatus(runId, expectedStatus, attempt + 1));
  });
}

export function startPreviewedHet1Run(): Cypress.Chainable<PreviewedHet1Run> {
  return cy
    .get('[data-testid="plan-preview-modal"]', { timeout: 30_000 })
    .should('be.visible')
    .find('[data-slot="plan-preview-id"]')
    .invoke('text')
    .then((previewId) => {
      const planId = previewId.trim();
      expect(planId).to.match(/^[a-f0-9]{64}$/u);

      cy.get('[data-testid="plan-preview-modal"]').within(() => {
        cy.get('[data-slot="plan-preview-start-run"]').should('be.enabled').click();
      });

      return cy
        .location('pathname', { timeout: 30_000 })
        .should('match', /^\/runs\/[^/]+$/u)
        .then((pathname) => {
          const runId = pathname.split('/').pop();
          expect(runId).to.be.a('string').and.not.equal('');
          return { runId: runId!, planId };
        });
    });
}

export function cancelHet1Run(runId: string): Cypress.Chainable<Record<string, unknown>> {
  cy.get('[data-slot="run-cancel-action"]', { timeout: 20_000 }).should('be.enabled').click();
  return waitForHet1RunStatus(runId, 'cancelled');
}

export function recoverHet1Run(sourceRunId: string): Cypress.Chainable<string> {
  const sourcePath = `/runs/${sourceRunId}`;
  cy.get('[data-slot="run-recover-action"]', { timeout: 20_000 }).should('be.enabled').click();

  return cy
    .location('pathname', { timeout: 30_000 })
    .should('match', /^\/runs\/[^/]+$/u)
    .and('not.equal', sourcePath)
    .then((pathname) => {
      const runId = pathname.split('/').pop();
      expect(runId).to.be.a('string').and.not.equal('').and.not.equal(sourceRunId);
      return runId!;
    });
}

export function waitForHet1RunEvent(args: {
  runId: string;
  eventType: string;
  stepId?: string;
  attempt?: number;
}): Cypress.Chainable<Het1RunEvent> {
  return readHet1RunEvents(args.runId).then((events) => {
    const event = events.find(
      (candidate) =>
        candidate.eventType === args.eventType &&
        (args.stepId === undefined || candidate.stepId === args.stepId)
    );
    if (event !== undefined) return event;
    if ((args.attempt ?? 0) >= 120) {
      throw new Error(
        `Timed out waiting for ${args.eventType}` +
          (args.stepId === undefined ? '' : ` on ${args.stepId}`) +
          ` in HET1 run ${args.runId}.`
      );
    }

    return cy.wait(500).then(() =>
      waitForHet1RunEvent({
        ...args,
        attempt: (args.attempt ?? 0) + 1,
      })
    );
  });
}

export function assertStepEventSet(
  events: readonly Het1RunEvent[],
  eventType: string,
  expectedStepIds: readonly string[]
): void {
  const actualStepIds = events
    .filter((event) => event.eventType === eventType)
    .map((event) => event.stepId)
    .filter((stepId): stepId is string => typeof stepId === 'string');

  expect(actualStepIds).to.include.members(expectedStepIds);
}

export function findRequiredStepEvent(
  events: readonly Het1RunEvent[],
  eventType: string,
  stepId: string
): Het1RunEvent {
  const event = events.find(
    (candidate) => candidate.eventType === eventType && candidate.stepId === stepId
  );
  expect(event, `${eventType} event for ${stepId}`).to.exist;
  return event!;
}

export function assertObjectLoadEvidence(args: {
  events: readonly Het1RunEvent[];
  stepId: string;
  expectedRows: number;
  expectedSha256: string;
  expectedSizeBytes: number;
  expectedPublicationOutcomes: readonly ('created' | 'replaced')[];
}): void {
  const event = findRequiredStepEvent(args.events, 'StepCompleted', args.stepId);

  expect(event).to.have.nested.property('payload.resultEvidence.rowsWritten', args.expectedRows);
  expect(event).to.have.nested.property(
    'payload.resultEvidence.sourceArtifact.sha256',
    args.expectedSha256
  );
  expect(event).to.have.nested.property(
    'payload.resultEvidence.sourceArtifact.sizeBytes',
    args.expectedSizeBytes
  );
  expect(event).to.have.nested.property('payload.resultEvidence.publicationOutcome');
  expect(event.payload?.resultEvidence).to.be.an('object');
  expect(
    (event.payload?.resultEvidence as { publicationOutcome?: unknown }).publicationOutcome
  ).to.be.oneOf(args.expectedPublicationOutcomes);
}

export function assertRunEvidenceDoesNotLeak(
  events: readonly Het1RunEvent[],
  forbiddenValues: readonly string[]
): void {
  const serialized = JSON.stringify(events);
  for (const forbiddenValue of forbiddenValues) {
    expect(serialized).not.to.contain(forbiddenValue);
  }
}

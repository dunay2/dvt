/** Owned concern: observe HET1 run control and event evidence through public protected rails. */
import { readLiveRunEvents } from './liveProtectedRuntime';

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
  expectedPublicationOutcome: 'created' | 'replaced';
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
  expect(event).to.have.nested.property(
    'payload.resultEvidence.publicationOutcome',
    args.expectedPublicationOutcome
  );
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

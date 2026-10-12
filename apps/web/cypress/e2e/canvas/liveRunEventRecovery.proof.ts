/** Owned concern: prove live run-event recovery and authoritative timeline parity. */
export type LiveRunEventIdentity = Readonly<{
  eventId?: string;
  eventType?: string;
  runSeq?: number;
}>;

/** Interrupt one real request only after the browser has accepted a nonempty page. */
export function interruptLiveRunEventFeed(): () => void {
  let acceptedCursor: number | undefined;
  let interruptedCursor: number | undefined;
  let recoveredCursor: number | undefined;
  let initialRequestStarted = false;
  let interrupted = false;
  let recoveryRequested = false;

  cy.intercept('GET', '**/runs/*/events*', (request) => {
    const requestUrl = new URL(request.url);
    const afterSeq = requestUrl.searchParams.get('afterSeq');
    const requestedCursor = afterSeq === null ? undefined : Number(afterSeq);

    if (!initialRequestStarted) {
      initialRequestStarted = true;
      requestUrl.searchParams.set('limit', '1');
      request.url = requestUrl.toString();
      request.alias = 'liveRunEventsInitial';
      request.continue((response) => {
        expect(response.statusCode).to.equal(200);
        const nextCursor = (response.body as { nextCursor?: number }).nextCursor;
        expect(nextCursor, 'accepted first-page cursor').to.be.a('number').and.greaterThan(0);
        acceptedCursor = nextCursor;
      });
      return;
    }

    if (acceptedCursor !== undefined && !interrupted) {
      interrupted = true;
      interruptedCursor = requestedCursor;
      request.alias = 'liveRunEventsInterrupted';
      request.destroy();
      return;
    }

    if (interrupted && !recoveryRequested) {
      recoveryRequested = true;
      recoveredCursor = requestedCursor;
      request.alias = 'liveRunEventsRecovered';
    }
    request.continue();
  });

  return () => {
    cy.wait('@liveRunEventsInitial', { timeout: 20_000 })
      .its('response.statusCode')
      .should('equal', 200);
    cy.wait('@liveRunEventsInterrupted', { timeout: 20_000 }).should((interception) => {
      expect(interception.error).to.exist;
      expect(interruptedCursor, 'failed request retains accepted cursor').to.equal(acceptedCursor);
    });
    cy.wait('@liveRunEventsRecovered', { timeout: 20_000 }).should((interception) => {
      expect(interception.response?.statusCode).to.equal(200);
      expect(recoveredCursor, 'retry resumes from the accepted cursor').to.equal(acceptedCursor);
    });
  };
}

export function assertAuthoritativeLiveRunTimeline(events: readonly LiveRunEventIdentity[]): void {
  for (const event of events) {
    expect(event.eventId).to.be.a('string').and.not.equal('');
    expect(event.eventType).to.be.a('string').and.not.equal('');
    expect(event.runSeq).to.be.a('number').and.greaterThan(0);
  }
  expect(events.map(({ eventType }) => eventType)).to.include.members([
    'RunQueued',
    'RunStarted',
    'StepCompleted',
    'RunCompleted',
  ]);
  expect(new Set(events.map(({ eventId }) => eventId)).size, 'unique event IDs').to.equal(
    events.length
  );
  const sequences = events.map(({ runSeq }) => runSeq!);
  expect(new Set(sequences).size, 'unique run sequences').to.equal(events.length);
  expect(sequences, 'authoritative order').to.deep.equal(
    [...sequences].sort((left, right) => left - right)
  );

  cy.get('[data-slot="run-detail-diagnostics-tab"]').click();
  cy.get('[data-slot="run-event-feed-health"]', { timeout: 30_000 })
    .should('have.attr', 'data-state', 'complete')
    .and('have.attr', 'role', 'status');
  cy.get('[data-slot="run-event-timeline-table"] table', { timeout: 30_000 }).should(($table) => {
    const headers = [...$table[0]!.querySelectorAll('thead th')].map((cell) =>
      cell.textContent?.trim()
    );
    const sequenceColumn = headers.indexOf('#');
    const typeColumn = headers.findIndex((header) => /^(Type|Tipo)$/.test(header ?? ''));
    expect(sequenceColumn, 'sequence column').to.be.at.least(0);
    expect(typeColumn, 'event type column').to.be.at.least(0);
    const renderedEvents = [...$table[0]!.querySelectorAll('tbody tr')].map((row) => {
      const cells = row.querySelectorAll('td');
      return {
        runSeq: Number(cells.item(sequenceColumn).textContent),
        eventType: cells.item(typeColumn).textContent?.trim(),
      };
    });
    expect(renderedEvents, 'complete browser timeline after recovery').to.deep.equal(
      events.map(({ eventType, runSeq }) => ({ eventType, runSeq }))
    );
  });
}

describe('Runs runtime contract', () => {
  it('sends tenant scope in list, detail, and events requests', () => {
    cy.intercept('GET', '**/runs*', (req) => {
      const acceptHeader = req.headers.accept ?? '';
      if (acceptHeader.includes('text/html')) {
        return;
      }

      expect(req.url).to.include('tenantId=e2e-tenant');
      expect(req.url).to.include('projectId=e2e-project');
      expect(req.url).to.include('environmentId=e2e-env');

      req.reply({
        statusCode: 200,
        body: {
          items: [
            {
              runId: 'run_e2e_1',
              planId: 'plan_e2e_1',
              status: 'RUNNING',
              environmentId: 'e2e-env',
              startedAt: '2026-04-07T00:00:00.000Z',
            },
          ],
          nextCursor: null,
        },
      });
    }).as('listRuns');

    cy.intercept('GET', '**/runs/run_e2e_1*', (req) => {
      expect(req.url).to.include('tenantId=e2e-tenant');

      req.reply({
        statusCode: 200,
        body: {
          runId: 'run_e2e_1',
          planId: 'plan_e2e_1',
          status: 'RUNNING',
          environmentId: 'e2e-env',
          startedAt: '2026-04-07T00:00:00.000Z',
        },
      });
    }).as('getRun');

    cy.intercept('GET', '**/runs/run_e2e_1/events*', (req) => {
      expect(req.url).to.include('tenantId=e2e-tenant');

      req.reply({
        statusCode: 200,
        body: {
          items: [],
          nextCursor: null,
        },
      });
    }).as('getRunEvents');

    cy.visit('/runs');
    cy.wait('@listRuns');

    cy.contains('Run run_e2e_1').click();
    cy.wait('@getRun');
    cy.wait('@getRunEvents');
  });
});

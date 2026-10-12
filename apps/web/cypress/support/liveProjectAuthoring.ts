/**
 * Owned concern: create an authorized LIVE workspace through the existing project UI.
 * @baseline GH-3021 uses CreateProject, not invented scopes or seeded product records.
 * @decision Share the real creation gesture and return its acknowledged default scope.
 * @consequence First authoring and publication use independent, granted workspaces.
 * @version 1.0.0
 */
import { CreateProjectResponseSchema, type WorkspaceGraphDraftScope } from '@dvt/contracts';

export function createLiveProjectThroughUi(
  projectName: string
): Cypress.Chainable<WorkspaceGraphDraftScope> {
  cy.intercept('POST', '**/projects').as('createdLiveProject');
  cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
  cy.get('[data-slot="shell-new-project-command"]').click();
  cy.get('[data-slot="project-creation-dialog"]').within(() => {
    cy.get('input[name="projectName"]').type(projectName);
    cy.contains('button', 'Create project').click();
  });
  return cy.wait('@createdLiveProject', { timeout: 30_000 }).then(({ response }) => {
    expect(response?.statusCode).to.equal(201);
    const { defaultWorkspace } = CreateProjectResponseSchema.parse(response!.body);
    const scope = {
      tenantId: defaultWorkspace.tenantId,
      projectId: defaultWorkspace.projectId,
      environmentId: defaultWorkspace.environmentId,
    };
    cy.get('[data-slot="project-creation-dialog"]').should('not.exist');
    return cy
      .get('[data-slot="shell-workspace-menu-trigger"]')
      .should('contain.text', projectName)
      .then(() => scope);
  });
}

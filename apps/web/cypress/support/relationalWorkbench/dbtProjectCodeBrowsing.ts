/**
 * Owned concern: verify passive browsing of the exact adopted dbt file fixture.
 * @decision Preserve one sequential real-API journey with its hashes, camera and graph baseline.
 * @consequence Disclosure checks use retained DOM without changing authority, writes or registration.
 */
import { WorkspaceGraphDraftReadResponseSchema } from '@dvt/contracts';

import {
  readLiveGraphDraft,
  readLiveWorkspaceFile,
  visitWithLiveWorkspaceSession,
} from '../liveProtectedRuntime';

export function verifyRepeatedDbtProjectCodeBrowsing({
  projectRoot,
  canvasId,
  projectPath,
  firstPath,
  secondPath,
  outsidePath,
  files,
}: {
  readonly projectRoot: string;
  readonly canvasId: string;
  readonly projectPath: string;
  readonly firstPath: string;
  readonly secondPath: string;
  readonly outsidePath: string;
  readonly files: Readonly<Record<string, string>>;
}): void {
  // Real file and graph baselines distinguish clean browsing from accidental persistence.
  const hashes: Record<string, string> = {};
  const modified: Record<string, string> = {};
  let viewport: HTMLElement | undefined;
  let transform: string | null = null;
  let graphBefore:
    | {
        status: number;
        body: ReturnType<typeof WorkspaceGraphDraftReadResponseSchema.parse>;
      }
    | undefined;
  const main = '[data-slot="canvas-workspace-surface"]';
  const code = '[data-slot="canvas-code-workspace-surface"]';
  const git = `${code} [data-slot="route-workbench-left-panel"]`;
  const properties = `${code} [data-slot="route-workbench-right-panel"] [role="region"]`;
  for (const path of Object.keys(files)) {
    readLiveWorkspaceFile(path).then(({ status, body }) => {
      expect(status).to.equal(200);
      const file = body as { contentSha256: string; lastModified: string };
      expect(file.contentSha256).to.match(/^[a-f0-9]{64}$/);
      expect(file.lastModified).to.be.a('string');
      hashes[path] = file.contentSha256;
      modified[path] = file.lastModified;
    });
  }
  readLiveGraphDraft(undefined, { failOnStatusCode: false }).then(({ status, body }) => {
    expect(status).to.be.oneOf([200, 404]);
    const draft = WorkspaceGraphDraftReadResponseSchema.parse(body);
    expect(draft.kind).to.equal(status === 200 ? 'ok' : 'not_found');
    graphBefore = { status, body: draft };
  });
  cy.intercept({ method: 'GET', pathname: '/workspace/files' }).as('actualFileTree');
  cy.intercept({ method: 'POST', pathname: '/workspace/files/**' }).as('fileWrites');
  cy.viewport(1500, 900);
  visitWithLiveWorkspaceSession(
    `/canvas?authority=dbt-project-files&canvasId=${canvasId}&projectRoot=${projectRoot}`
  );
  cy.get(`[data-slot="shell-project-code-command"]`, {
    timeout: 60_000,
  }).should('be.visible');
  cy.get(`${main} .react-flow__node`).its('length').should('be.at.least', 2);
  cy.get(`${main} .react-flow__controls-fitview`).click();
  cy.get(`${main} .react-flow__viewport`)
    .should('be.visible')
    .should(($viewport) => {
      const current = $viewport[0]!;
      expect(
        new DOMMatrix(current.style.transform).a,
        'public Fit has applied its zoom'
      ).to.be.lessThan(1);
      const frame = current.closest('.react-flow')!.getBoundingClientRect();
      const cards = current.querySelectorAll('.react-flow__node');
      expect(cards.length).to.be.at.least(2);
      cards.forEach((card) => {
        const bounds = card.getBoundingClientRect();
        expect(bounds.width).to.be.greaterThan(0);
        expect(bounds.height).to.be.greaterThan(0);
        expect(bounds.left).to.be.at.least(frame.left);
        expect(bounds.right).to.be.at.most(frame.right);
        expect(bounds.top).to.be.at.least(frame.top);
        expect(bounds.bottom).to.be.at.most(frame.bottom);
      });
    })
    .then(($viewport) => {
      viewport = $viewport[0]!;
      transform = viewport.getAttribute('style');
    });
  cy.get(`[data-slot="shell-project-code-command"]`).click();
  cy.wait('@actualFileTree')
    .its('response')
    .should((response) => {
      expect(response?.statusCode).to.equal(200);
      expect(JSON.stringify(response?.body)).to.contain(outsidePath);
    });
  cy.get(`${git} [data-workspace-path]`).each(($entry) => {
    const path = $entry.attr('data-workspace-path')!;
    expect(path === projectRoot || path.startsWith(`${projectRoot}/`)).to.equal(true);
  });
  cy.get(`${git} [data-workspace-path="${outsidePath}"]`).should('not.exist');
  cy.get(`${git} [data-slot="code-workspace-file-entry"]:visible`)
    .its('length')
    .then((count) => {
      expect(count).to.be.greaterThan(0);
      cy.get(`${code} [data-slot="code-workspace-file-entry"]:visible`).should(
        'have.length',
        count
      );
    });
  cy.get(code).should('be.visible');
  cy.get(`${main} .react-flow__viewport`).should('not.be.visible');
  cy.get(main).should('have.attr', 'inert');
  cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(
    'have.attr',
    'data-file-path',
    projectPath
  );
  cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'git_browser_dbt');
  cy.get(properties).should('contain.text', projectPath);
  cy.get(`${git} [data-workspace-path="${firstPath}"]`).should('be.visible');
  cy.get(`${git} [data-workspace-path="${projectRoot}/models"]`).then(($directory) => {
    const directory = $directory[0]!;
    const childrenId = directory.getAttribute('aria-controls');
    expect(childrenId, 'the directory controls its retained children').to.be.a('string').and.not.be
      .empty;
    const children = `${git} [id="${childrenId}"]`;
    cy.then(() => {
      cy.get(`${git} [data-workspace-path="${projectRoot}/models"]`)
        .click()
        .should('have.attr', 'aria-expanded', 'false');
      cy.get(children).should('have.attr', 'hidden');
      cy.get(children).should('not.be.visible');
      cy.get(`${git} [data-workspace-path="${firstPath}"]`).should('not.be.visible');
      cy.get(`${git} [data-workspace-path="${secondPath}"]`).should('not.be.visible');
      cy.get('[data-slot="canvas-workspace-tab"]').click();
      cy.get(code).should('not.be.visible');
      cy.get(main).should('be.visible');
      cy.get('[data-slot="canvas-code-main-tab"]').click();
      cy.get(code).should('be.visible');
      cy.get(`${git} [data-workspace-path="${projectRoot}/models"]`).should(($current) => {
        expect($current[0], 'the real directory survives the workspace roundtrip').to.equal(
          directory
        );
      });
      cy.get(`${git} [data-workspace-path="${projectRoot}/models"]`).should(
        'have.attr',
        'aria-expanded',
        'false'
      );
      cy.get(children).should('have.attr', 'hidden');
      cy.get(children).should('not.be.visible');
      cy.get(`${git} [data-workspace-path="${firstPath}"]`).should('not.be.visible');
      cy.get(`${git} [data-workspace-path="${secondPath}"]`).should('not.be.visible');
      // Elements may refresh the scoped catalogue; disclosure itself retains
      // the existing Code tree and performs no file or semantic writes.
      cy.get(`${git} [data-workspace-path="${projectRoot}/models"]`)
        .click()
        .should('have.attr', 'aria-expanded', 'true');
      cy.get(children).should('not.have.attr', 'hidden');
      cy.get(children).should('be.visible');
      cy.get(`${git} [data-workspace-path="${firstPath}"]`).should('be.visible');
      cy.get(`${git} [data-workspace-path="${secondPath}"]`).should('be.visible');
    });
  });
  cy.get(`${git} [data-workspace-path="${secondPath}"]`).click();
  cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(
    'have.attr',
    'data-file-path',
    secondPath
  );
  cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'git_b');
  cy.get(properties).should('contain.text', secondPath).and('not.contain.text', outsidePath);
  cy.then(() => {
    cy.get(`${properties} time`).should('have.attr', 'datetime', modified[secondPath]);
    cy.get(properties).should('not.contain.text', hashes[secondPath]);
  });
  cy.get(`${git} [data-workspace-path="${firstPath}"]`).click();
  cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(
    'have.attr',
    'data-file-path',
    firstPath
  );
  cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'git_a');
  cy.get(`${git} [data-workspace-path="${secondPath}"]`).click();
  cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(
    'have.attr',
    'data-file-path',
    secondPath
  );
  cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'git_b');
  cy.get('[data-slot="shell-project-code-command"]').click();
  cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(
    'have.attr',
    'data-file-path',
    secondPath
  );
  cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'git_b');
  cy.get('[data-slot="canvas-workspace-tab"]').click();
  cy.get(code).should('not.be.visible');
  cy.get(`${main} .react-flow__viewport`)
    .should('be.visible')
    .should(($viewport) => {
      expect($viewport[0]).to.equal(viewport);
      expect($viewport.attr('style')).to.equal(transform);
    });
  cy.get(`[data-slot="shell-project-code-command"]`).click();
  cy.get(code).should('be.visible');
  cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(
    'have.attr',
    'data-file-path',
    secondPath
  );
  cy.get(properties).should('contain.text', secondPath);
  cy.get('[data-slot="canvas-workspace-tab"]').click();
  cy.get('a[data-slot="left-navigation-link"][href="/canvas"]').click();
  cy.get(code).should('not.be.visible');
  cy.get('[data-slot="shell-project-code-command"]').click();
  cy.get(code).should('be.visible');
  cy.get(`${code} [data-slot="workspace-file-code-editor"]`).should(
    'have.attr',
    'data-file-path',
    secondPath
  );
  cy.get(`${code} .monaco-editor .view-lines`).should('contain.text', 'git_b');
  cy.get('[data-slot="canvas-workspace-tab"]').click();
  cy.get(`${main} .react-flow__viewport`)
    .should('be.visible')
    .should(($viewport) => {
      expect($viewport[0]).to.equal(viewport);
      expect($viewport.attr('style')).to.equal(transform);
    });
  cy.get('@fileWrites.all').should('have.length', 0);
  readLiveGraphDraft(undefined, { failOnStatusCode: false }).then(({ status, body }) => {
    if (graphBefore === undefined) throw new Error('Persisted graph baseline was not captured.');
    const draft = WorkspaceGraphDraftReadResponseSchema.parse(body);
    expect(status, 'persisted graph presence is unchanged').to.equal(graphBefore.status);
    expect(draft.kind).to.equal(graphBefore.body.kind);
    if (draft.kind === 'ok' && graphBefore.body.kind === 'ok') {
      expect(draft.record, 'persisted graph record is unchanged').to.deep.equal(
        graphBefore.body.record
      );
    }
  });
  for (const path of Object.keys(files)) {
    readLiveWorkspaceFile(path).then(({ status, body }) => {
      expect(status).to.equal(200);
      expect((body as { contentSha256: string }).contentSha256).to.equal(hashes[path]);
    });
  }
}

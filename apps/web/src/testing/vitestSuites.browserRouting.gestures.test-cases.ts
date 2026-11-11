// @vitest-environment node
/**
 * Owned concern: public Canvas gesture preconditions.
 * @reason GH-3765 separates proof contracts without weakening their existing assertions.
 * @consequence The existing architecture entry registers every family in one isolated runtime.
 */
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { browserModules } from './vitestSuites.browserRouting.moduleGraph';

export function registerBrowserRoutingGestures(): void {
  describe('public Canvas gesture and notification preconditions', () => {
    it('requeries direction cues until all original marker and edge invariants hold', () => {
      const body = browserModules
        .get(resolve('cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts'))!
        .statements.find(
          (statement) =>
            ts.isFunctionDeclaration(statement) &&
            statement.name?.text === 'assertDependencyDirectionCues'
        )!
        .getText()
        .replace(/\s+/gu, ' ');
      expect(body).toContain('.should(($cues) => {');
      expect(body).toContain('for (const cue of $cues.toArray()) {');
      expect(body).toContain(
        'expect(getComputedStyle(glyph).fill).to.equal(getComputedStyle(edgePath!).stroke)'
      );
      expect(body).not.toMatch(/\.each\(|cy\.wait\(|timeout:/u);
    });

    it.each(['canvas-graph-search-filter-live', 'canvas-minimap-focus-live'])(
      'owns an acknowledged independent project for read-only evidence in %s',
      (name) => {
        const ast = browserModules.get(resolve(`cypress/e2e/canvas/${name}.cy.ts`))!;
        expect(ast.getText()).toContain('createLiveProjectThroughUi');
        expect(ast.getText()).toContain('WorkspaceGraphDraftScope');
        expect(ast.getText()).not.toContain('readLiveGraphDraft(resolveLiveWorkspaceSession()');
      }
    );

    it('uses the single current template and an owned language for graph-search evidence', () => {
      const ast = browserModules.get(
        resolve('cypress/e2e/canvas/canvas-graph-search-filter-live.cy.ts')
      )!;
      const body = ast.getText();
      expect(body).toContain('APPLICATION_LANGUAGE_STORAGE_KEY');
      expect(body).toContain('canvas-playground-template-choice');
      expect(body).toContain('[data-testid="canvas-viewport"]');
      expect(body).not.toContain('[data-slot="canvas-viewport"]');
      expect(body).toContain("addCanvasNode('dvt:sink'");
      expect(body).not.toContain('dbt:seed');
      expect(body).not.toContain("cy.contains('Create canvas'");
      expect(body).not.toContain(".contains('button', 'dbt canvas')");
    });

    it.each([
      ['dbt-project-preview-run-live', 'visitProjectWithRequestObservations'],
      ['dbt-project-yaml-description-edit-live', 'openModelWorkbench'],
    ])('targets the real title for dbt inspection in %s', (name, symbol) => {
      const ast = browserModules.get(resolve(`cypress/e2e/dbt/${name}.cy.ts`))!;
      expect(ast.getText()).toContain('graph-node-card-title');
      const declaration = ast.statements.find(
        (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === symbol
      );
      expect(declaration).toBeDefined();
      expect(ast.getText()).not.toMatch(/canvas-node-shell[^;]*\.dblclick\(\)/u);
      if (name === 'dbt-project-preview-run-live') {
        expect(ast.getText()).not.toContain('Order Summary Model');
      } else {
        expect(ast.getText()).toContain('selectCanvasClosure([MODEL_UNIQUE_ID])');
        expect(ast.getText()).toContain('openCanvasNodeOperations(MODEL_UNIQUE_ID)');
        expect(ast.getText()).not.toContain('button[aria-label="Select for execution"]');
        for (const label of ['Canvas', 'Requested resources', 'Project root']) {
          expect(ast.getText()).toContain(`[aria-label="${label}"]`);
          expect(ast.getText()).not.toContain(`[aria-label="${label} value"]`);
        }
      }
    });

    it('opens Connections after creation before checking the selected connection option', () => {
      const ast = browserModules.get(resolve('cypress/support/liveWarehouseSourceImport.ts'))!;
      const declaration = ast.statements.find(
        (statement) =>
          ts.isFunctionDeclaration(statement) &&
          statement.name?.text === 'createLivePostgresConnection'
      );
      expect(declaration).toBeDefined();
      const body = declaration!.getText(ast).replace(/\s+/gu, ' ');
      expect(body).toContain(
        "cy.get('[data-slot=\"source-import-create-connection-name\"]').should('not.exist')"
      );
      expect(body.indexOf("'not.exist'")).toBeLessThan(body.indexOf("'Connections'"));
      expect(body).toContain("cy.contains('[role=\"tab\"]', 'Connections').click()");
      expect(body.indexOf("'Connections'")).toBeLessThan(
        body.indexOf('source-import-connection-option')
      );
      expect(body).toContain("'aria-pressed', 'true'");
      expect(body).not.toContain('force: true');
    });

    it('fits and focuses a visible node before an unforced context selection gesture', () => {
      const ast = browserModules.get(resolve('cypress/support/canvasExecutionSelection.ts'))!;
      const declaration = ast.statements.find(
        (statement) =>
          ts.isFunctionDeclaration(statement) && statement.name?.text === 'openCanvasNodeOperations'
      );
      expect(declaration).toBeDefined();
      const body = declaration!.getText(ast).replace(/\s+/gu, ' ');
      expect(body).toContain("cy.get('.react-flow__controls-fitview').click()");
      expect(body.indexOf('controls-fitview')).toBeLessThan(body.indexOf('getVisibleCanvasNode'));
      expect(body).toContain(".should('be.visible')");
      expect(body).toContain(".should('be.focused')");
      expect(body).toContain(".rightclick('center')");
      expect(body).not.toContain('force: true');
    });

    it('fits the outer Canvas before hovering and requesting a Model Preview', () => {
      const ast = browserModules.get(resolve('cypress/support/relationalWorkbench/navigation.ts'))!;
      const declaration = ast.statements.find(
        (statement) =>
          ts.isFunctionDeclaration(statement) && statement.name?.text === 'previewWorkbenchModel'
      );
      expect(declaration).toBeDefined();
      const body = declaration!.getText(ast).replace(/\s+/gu, ' ');
      expect(body).toContain("cy.get('.react-flow__controls-fitview').click()");
      expect(body.indexOf('controls-fitview')).toBeLessThan(body.indexOf('hoverWorkbenchCard'));
      expect(body).not.toContain('force: true');
    });
    it('proves active and withdrawn toast hit-testing before normal receipt close', () => {
      const ast = browserModules.get(
        resolve('cypress/e2e/canvas/canvas-dbt-source-connection-binding.cy.ts')
      )!;
      const calls: ts.CallExpression[] = [];
      const visit = (node: ts.Node): void => {
        if (ts.isCallExpression(node)) calls.push(node);
        ts.forEachChild(node, visit);
      };
      visit(ast);
      const namedCalls = (name: string): ts.CallExpression[] =>
        calls.filter(
          (call) =>
            ts.isPropertyAccessExpression(call.expression) && call.expression.name.text === name
        );
      const literalArgs = (call: ts.CallExpression): Array<string | null> =>
        call.arguments.map((argument) => (ts.isStringLiteral(argument) ? argument.text : null));
      const clocks = namedCalls('clock');
      expect(clocks).toHaveLength(1);
      const clock = clocks[0]!;
      const timers = clock.arguments[1];
      expect(timers && ts.isArrayLiteralExpression(timers)).toBe(true);
      if (timers && ts.isArrayLiteralExpression(timers)) {
        expect(
          timers.elements.map((timer) => (ts.isStringLiteral(timer) ? timer.text : null))
        ).toEqual(['setTimeout', 'clearTimeout']);
      }
      const ticks = namedCalls('tick');
      expect(ticks.map((tick) => Number(tick.arguments[0]?.getText(ast)))).toEqual([0, 4000, 200]);
      const expiry = ticks[1]!;
      const unmount = ticks[2]!;
      const assertions = [...namedCalls('should'), ...namedCalls('and')].map(literalArgs);
      for (const state of [
        ['data-mounted', 'true'],
        ['data-visible', 'true'],
        ['data-removed', 'false'],
        ['data-removed', 'true'],
      ]) {
        expect(assertions).toContainEqual(['have.attr', ...state]);
      }
      const done = namedCalls('contains').find((call) => literalArgs(call)[1] === 'Done')!;
      expect(done.getStart(ast)).toBeGreaterThan(expiry.getStart(ast));
      expect(done.getEnd()).toBeLessThan(unmount.getStart(ast));
      expect(
        namedCalls('click').some(
          (click) =>
            click.getStart(ast) === done.getStart(ast) &&
            click.getEnd() > done.getEnd() &&
            click.arguments.length === 0
        )
      ).toBe(true);
      expect(
        namedCalls('should').some(
          (call) =>
            literalArgs(call)[0] === 'exist' &&
            call.getStart(ast) > done.getEnd() &&
            call.getEnd() < unmount.getStart(ast)
        )
      ).toBe(true);
      expect(namedCalls('restore')).toHaveLength(1);
      expect(namedCalls('restore')[0]!.getStart(ast)).toBeGreaterThan(unmount.getStart(ast));
      expect(namedCalls('elementFromPoint')).toHaveLength(1);
      expect(namedCalls('getComputedStyle')).toHaveLength(1);
      const body = ast.getText().replace(/\s+/gu, ' ');
      expect(body).not.toContain('toast.dismiss');
      expect(body).not.toContain('.remove()');
      expect(body).not.toContain('cy.wait(');
      expect(body).not.toContain('force: true');
    });
  });
}

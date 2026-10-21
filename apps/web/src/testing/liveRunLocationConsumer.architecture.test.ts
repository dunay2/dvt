/** Owns regression evidence that LIVE consumers use the pathname they validated. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const consumers = [
  {
    file: 'cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
    expectedKinds: ['snapshot', 'events'],
    expectedUiChecks: [],
  },
  {
    file: 'cypress/support/semanticLive/execution.ts',
    expectedKinds: ['completion', 'events'],
    expectedUiChecks: [],
  },
  {
    file: 'cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
    expectedKinds: ['completion'],
    expectedUiChecks: [],
  },
  {
    file: 'cypress/support/postgresPublicationFlow.ts',
    expectedKinds: ['publication'],
    expectedUiChecks: [
      {
        selector: '[data-slot="run-itinerary-card"]',
        chainer: 'contain.text',
        expected: 'completed',
      },
    ],
  },
] as const;

function readLocationConsumer(file: string): string {
  const source = ts.createSourceFile(
    file,
    readFileSync(resolve(process.cwd(), file), 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  const matches: string[] = [];
  function visit(node: ts.Node): void {
    if (ts.isBlock(node)) {
      const isLocation = (statement: ts.Statement): boolean => {
        const expression =
          ts.isExpressionStatement(statement) || ts.isReturnStatement(statement)
            ? statement.expression
            : undefined;
        return expression?.getText(source).startsWith("cy.location('pathname'") ?? false;
      };
      const index = node.statements.findIndex(
        (statement) => isLocation(statement) && statement.getText(source).includes('.should(')
      );
      if (index !== -1) {
        let end = index;
        if (!node.statements[index]!.getText(source).includes('.then(')) {
          const next = node.statements
            .slice(index + 1)
            .findIndex((statement) => isLocation(statement));
          if (next !== -1) end = index + 1 + next;
        }
        matches.push(
          node.statements
            .slice(index, end + 1)
            .map((statement) =>
              ts.isReturnStatement(statement)
                ? `${statement.expression!.getText(source)};`
                : statement.getText(source)
            )
            .join('\n')
        );
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  expect(matches).toHaveLength(1);
  return ts.transpileModule(matches[0]!, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

function exerciseConsumer(
  file: string,
  initialPathname: string,
  nextPathname?: string
): Readonly<{
  requests: Array<{ kind: string; runId: string }>;
  uiChecks: Array<{ selector: string; chainer: string; expected: unknown }>;
  run: () => void;
}> {
  let pathname = initialPathname;
  const queue: Array<() => void> = [];
  const requests: Array<{ kind: string; runId: string }> = [];
  const uiChecks: Array<{ selector: string; chainer: string; expected: unknown }> = [];
  const observeRequest = (kind: string) => (runId: string) => {
    requests.push({ kind, runId });
    // Observe call arguments only: no synthetic HTTP response or successful run.
    return { then: () => undefined };
  };
  runInNewContext(readLocationConsumer(file), {
    expect,
    readLiveRunSnapshot: observeRequest('snapshot'),
    readLiveRunEvents: observeRequest('events'),
    waitForCompletedRun: observeRequest('completion'),
    waitForCompletedDbtRun: observeRequest('completion'),
    URLSearchParams,
    scope: { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' },
    Cypress: {
      env: (key: string) =>
        key === 'apiBaseUrl' ? 'https://run-identity.invalid' : 'request-observer-only',
    },
    cy: {
      get(selector: string) {
        return {
          should(chainer: string, expected: unknown) {
            // Record the assertion command; do not synthesize any completed DOM state.
            queue.push(() => uiChecks.push({ selector, chainer, expected }));
          },
        };
      },
      request({ url }: { url: string }) {
        return observeRequest('publication')(new URL(url).pathname.split('/').pop()!);
      },
      location(key: string) {
        expect(key).toBe('pathname');
        let subject: string;
        queue.push(() => {
          subject = pathname;
        });
        const chain = {
          should(chainer: string, pattern: RegExp) {
            queue.push(() => {
              expect(chainer).toBe('match');
              expect(subject).toMatch(pattern);
              if (nextPathname !== undefined) pathname = nextPathname;
            });
            return chain;
          },
          then(consume: (value: string) => void) {
            queue.push(() => consume(subject));
            return chain;
          },
        };
        return chain;
      },
    },
  });
  return {
    requests,
    uiChecks,
    run() {
      while (queue.length > 0) queue.shift()!();
    },
  };
}

describe.each(consumers)(
  '$file run-location consumption',
  ({ file, expectedKinds, expectedUiChecks }) => {
    it('retains the validated run identity when navigation changes before consumption', () => {
      const scenario = exerciseConsumer(file, '/runs/accepted-run', '/login');
      scenario.run();
      expect(scenario.requests).toEqual(
        expectedKinds.map((kind) => ({ kind, runId: 'accepted-run' }))
      );
      expect(scenario.uiChecks).toEqual(expectedUiChecks);
    });

    it('reads the expected Run evidence for an unchanged valid route', () => {
      const scenario = exerciseConsumer(file, '/runs/stable-run');
      scenario.run();
      expect(scenario.requests).toEqual(
        expectedKinds.map((kind) => ({ kind, runId: 'stable-run' }))
      );
      expect(scenario.uiChecks).toEqual(expectedUiChecks);
    });

    it('rejects login before issuing any run-evidence request', () => {
      const scenario = exerciseConsumer(file, '/login');
      expect(() => scenario.run()).toThrow();
      expect(scenario.requests).toEqual([]);
      expect(scenario.uiChecks).toEqual([]);
    });
  }
);

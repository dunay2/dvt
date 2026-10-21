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
  },
  {
    file: 'cypress/support/semanticLive/execution.ts',
    expectedKinds: ['completion', 'events'],
  },
  {
    file: 'cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
    expectedKinds: ['completion'],
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
      const isLocation = (statement: ts.Statement): boolean =>
        ts.isExpressionStatement(statement) &&
        statement.getText(source).startsWith("cy.location('pathname'");
      const index = node.statements.findIndex(
        (statement) => isLocation(statement) && statement.getText(source).includes('.should(')
      );
      if (index !== -1) {
        const statements = [node.statements[index]!];
        const next = node.statements[index + 1];
        if (next && isLocation(next)) statements.push(next);
        matches.push(statements.map((statement) => statement.getText(source)).join('\n'));
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
): Readonly<{ requests: Array<{ kind: string; runId: string }>; run: () => void }> {
  let pathname = initialPathname;
  const queue: Array<() => void> = [];
  const requests: Array<{ kind: string; runId: string }> = [];
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
    cy: {
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
  return { requests, run: () => queue.forEach((command) => command()) };
}

describe.each(consumers)('$file run-location consumption', ({ file, expectedKinds }) => {
  it('retains the validated run identity when navigation changes before consumption', () => {
    const scenario = exerciseConsumer(file, '/runs/accepted-run', '/login');
    scenario.run();
    expect(scenario.requests).toEqual(
      expectedKinds.map((kind) => ({ kind, runId: 'accepted-run' }))
    );
  });

  it('reads snapshot/completion and events for an unchanged valid route', () => {
    const scenario = exerciseConsumer(file, '/runs/stable-run');
    scenario.run();
    expect(scenario.requests).toEqual(expectedKinds.map((kind) => ({ kind, runId: 'stable-run' })));
  });

  it('rejects login before issuing any run-evidence request', () => {
    const scenario = exerciseConsumer(file, '/login');
    expect(() => scenario.run()).toThrow();
    expect(scenario.requests).toEqual([]);
  });
});

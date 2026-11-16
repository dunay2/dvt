// @vitest-environment jsdom
/** Server-derived variants share one local selector, with actual rules and explicit retention. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { CanvasSqlPresentationResult } from './CanvasSqlPresentationResult';
import { container, root, setupWorkbenchTest } from './CanvasRelationalTreeWorkbench.test-support';

function openTrace(): Element {
  const trigger = container.querySelector<HTMLButtonElement>(
    '[data-slot="canvas-sql-trace-trigger"]'
  )!;
  act(() => trigger.click());
  const trace = document.querySelector('[data-slot="canvas-sql-trace-content"]');
  expect(trace).not.toBeNull();
  return trace!;
}

describe('SQL presentation result', () => {
  setupWorkbenchTest();
  it('defaults to the derived SQL, retains original bytes and displays the actual ordered trace', () => {
    act(() =>
      root.render(
        <CanvasSqlPresentationResult
          result={{
            sql: 'select q.id from (select id from raw.client) q',
            presentation: {
              status: 'rewritten',
              sql: 'select c.id from raw.client c',
              steps: [
                { rule: 'SQLREAD1.PROJECTION_FUSION', path: '$' },
                { rule: 'SQLREAD1.TRANSPARENT_SUBQUERY', path: '$.SelectStmt.fromClause[0]' },
              ],
            },
          }}
        >
          {(sql) => <pre>{sql}</pre>}
        </CanvasSqlPresentationResult>
      )
    );
    expect(container.querySelector('pre')?.textContent).toBe('select c.id from raw.client c');
    expect(container.querySelectorAll('[role="tablist"]')).toHaveLength(0);
    expect(document.querySelector('[data-slot="canvas-sql-trace-content"]')).toBeNull();
    expect(openTrace().querySelectorAll('ol li')).toHaveLength(2);
    const select = container.querySelector('select')!;
    act(() => {
      select.value = 'original';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(container.querySelector('pre')?.textContent).toBe(
      'select q.id from (select id from raw.client) q'
    );
    expect(container.querySelectorAll('select')).toHaveLength(1);
  });
  it.each(['unsupported_shape', 'metadata_permission_denied', 'unknown-future-diagnostic'])(
    'renders %s without claiming a rewrite or exposing a partial variant',
    (code) => {
      act(() =>
        root.render(
          <CanvasSqlPresentationResult
            result={{
              sql: 'original bytes',
              presentation: { status: 'retained', diagnostic: { code, path: '$' } },
            }}
          >
            {(sql) => <pre>{sql}</pre>}
          </CanvasSqlPresentationResult>
        )
      );
      expect(container.querySelector('pre')?.textContent).toBe('original bytes');
      expect(container.querySelector('select')).toBeNull();
      expect(container.querySelector('ol')).toBeNull();
      expect(openTrace().querySelector('code')?.textContent).toContain(code);
    }
  );
  it('distinguishes a true fixed point from a retained candidate', () => {
    act(() =>
      root.render(
        <CanvasSqlPresentationResult
          result={{
            sql: 'select id from raw.client',
            presentation: { status: 'unchanged', sql: 'select id from raw.client', steps: [] },
          }}
        >
          {(sql) => <pre>{sql}</pre>}
        </CanvasSqlPresentationResult>
      )
    );
    expect(container.querySelector('p')?.textContent).toContain('fixed point');
    expect(container.querySelector('[data-slot="canvas-sql-trace-trigger"]')).toBeNull();
  });
});

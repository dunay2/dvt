// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GraphNodeColumnSection } from './GraphNodeColumnSection';

describe('GraphNodeColumnSection controlled disclosure', () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  let previousActEnvironment: boolean | undefined;

  beforeEach(() => {
    const runtime = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    previousActEnvironment = runtime.IS_REACT_ACT_ENVIRONMENT;
    runtime.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.render(<></>));
    const runtime = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    runtime.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  it('retains the expanded state when the graph remounts the node', async () => {
    function RemountingGraph(): React.JSX.Element {
      const [expanded, setExpanded] = useState(false);
      const [revision, setRevision] = useState(0);
      return (
        <GraphNodeColumnSection
          key={revision}
          columns={[{ name: 'order_id', type: 'integer' }]}
          expanded={expanded}
          onDisclosureChange={(next) => {
            setExpanded(next);
            setRevision((current) => current + 1);
          }}
        />
      );
    }
    await act(async () => root.render(<RemountingGraph />));

    await act(async () => {
      fireEvent.click(container.querySelector('[data-slot="graph-node-column-toggle"]')!);
    });

    expect(
      container
        .querySelector('[data-slot="graph-node-column-toggle"]')
        ?.getAttribute('aria-expanded')
    ).toBe('true');
    expect(container.querySelector('[data-slot="graph-node-column-piece"]')).not.toBeNull();
  });
});

// @vitest-environment jsdom
import { getByRole } from '@testing-library/dom';
import React, { act, useContext } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { container, root, setupWorkbenchTest } from './CanvasRelationalTreeWorkbench.test-support';
import {
  CanvasStagedAnalysisProvider,
  type CanvasStagedAnalysisBinding,
} from './CanvasStagedAnalysisProvider';
import { compositionInput, stagedModelJoinFixture } from './stagedAnalysisContext.test-support';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';

type Analysis = ReturnType<typeof useCanvasRelationAnalysisSession>;

function AnalysisProbe({
  observe,
}: Readonly<{ observe: (analysis: Analysis) => void }>): JSX.Element {
  observe(useContext(CanvasRelationAnalysisContext));
  return <span data-slot="staged-analysis-consumer" />;
}

describe('staged analysis admission boundary', () => {
  setupWorkbenchTest();
  beforeEach(() => useApplicationLanguageStore.getState().configureApplicationLanguage('en'));

  it('supplies the actual execution provider to a Model-only canonical document', async () => {
    const fixture = stagedModelJoinFixture();
    const observe = vi.fn<(analysis: Analysis) => void>();
    await act(async () =>
      root.render(
        <CanvasStagedAnalysisProvider
          binding={fixture.binding}
          document={fixture.document}
          scope={fixture.staged.id}
        >
          <AnalysisProbe observe={observe} />
        </CanvasStagedAnalysisProvider>
      )
    );

    const analysis = observe.mock.lastCall![0]!;
    expect(analysis.session.executionProvider(analysis.revision)).toBe('postgres');
    expect(analysis.session.hasDocument(fixture.document)).toBe(true);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('explains a missing catalog input without activating an editor', async () => {
    const fixture = stagedModelJoinFixture();
    const observe = vi.fn<(analysis: Analysis) => void>();
    await act(async () =>
      root.render(
        <CanvasStagedAnalysisProvider
          binding={{ ...fixture.binding, inputs: [] }}
          document={fixture.document}
          scope={fixture.staged.id}
        >
          <AnalysisProbe observe={observe} />
        </CanvasStagedAnalysisProvider>
      )
    );

    expect(getByRole(container, 'alert').textContent).toContain('unavailable input');
    expect(observe).not.toHaveBeenCalled();
  });

  it('explains different connection ids without selecting the first provider', async () => {
    const fixture = stagedModelJoinFixture();
    const connection = {
      ...fixture.inputs[1]!.producer!.connection,
      connectionId: 'another-warehouse',
    };
    const binding = {
      ...fixture.binding,
      inputs: [fixture.inputs[0]!, compositionInput('right', true, connection)],
    };
    const observe = vi.fn<(analysis: Analysis) => void>();
    await act(async () =>
      root.render(
        <CanvasStagedAnalysisProvider
          binding={binding}
          document={fixture.document}
          scope={fixture.staged.id}
        >
          <AnalysisProbe observe={observe} />
        </CanvasStagedAnalysisProvider>
      )
    );

    expect(getByRole(container, 'alert').textContent).toContain('different execution connections');
    expect(observe).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'retains graph field denial and disconnected provenance, disconnected=%s',
    async (disconnected) => {
      const fixture = stagedModelJoinFixture();
      const input = fixture.document.sidecar.relations.find(
        (relation) => relation.producerRef != null
      )!;
      const denied = new Set(
        fixture.document.sidecar.fields
          .filter((field) => field.relationId === input.relationId)
          .map((field) => field.fieldId)
      );
      const binding: CanvasStagedAnalysisBinding = {
        inputs: fixture.inputs,
        readFieldEligibility: () => ({ denied, disconnected: disconnected ? denied : new Set() }),
      };
      const observe = vi.fn<(analysis: Analysis) => void>();
      await act(async () =>
        root.render(
          <CanvasStagedAnalysisProvider
            binding={binding}
            document={fixture.document}
            scope={fixture.staged.id}
          >
            <AnalysisProbe observe={observe} />
          </CanvasStagedAnalysisProvider>
        )
      );

      const analysis = observe.mock.lastCall![0]!;
      const field = (await analysis.session.query(input.relationId)).fields[0]!;
      expect(analysis.session.allowsInputSchema(field)).toBe(false);
      expect(analysis.session.canEditRetainedJoinOutput(analysis.session.rootId)).toBe(
        disconnected
      );
    }
  );

  it('does not create an editor or fallback provider without a document', async () => {
    const fixture = stagedModelJoinFixture();
    const observe = vi.fn<(analysis: Analysis) => void>();
    await act(async () =>
      root.render(
        <CanvasStagedAnalysisProvider
          binding={fixture.binding}
          document={null}
          scope={fixture.staged.id}
        >
          <AnalysisProbe observe={observe} />
        </CanvasStagedAnalysisProvider>
      )
    );
    expect(observe).not.toHaveBeenCalled();
    expect(container.textContent).toBe('');
  });
});

// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveDbtYamlDescriptionEditorCopy } from './dbtYamlDescriptionEditorCopy';
import { createDbtYamlDescriptionEditorState } from './dbtYamlDescriptionEditorModel';
import { DbtYamlDescriptionEditorView } from './DbtYamlDescriptionEditorView';

const COPY = resolveDbtYamlDescriptionEditorCopy('en');

describe('DbtYamlDescriptionEditorView', () => {
  let container: HTMLDivElement;
  let root: Root;
  let scrollIntoView: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete (HTMLElement.prototype as { scrollIntoView?: HTMLElement['scrollIntoView'] })
      .scrollIntoView;
  });

  it('renders an editable description with its authoritative YAML path', async () => {
    const onDraftChange = vi.fn();
    const onReview = vi.fn();

    await act(async () => {
      root.render(
        <DbtYamlDescriptionEditorView
          path="models/marts/schema.yml"
          copy={COPY}
          state={{
            ...createDbtYamlDescriptionEditorState('Existing description.'),
            draft: 'Changed description.',
          }}
          onDraftChange={onDraftChange}
          onReview={onReview}
          onDiscardReview={vi.fn()}
          onApply={vi.fn()}
          onRevert={vi.fn()}
          onReloadLatest={vi.fn()}
          onContinueEditing={vi.fn()}
        />
      );
    });

    const input = container.querySelector<HTMLTextAreaElement>(
      '[data-slot="dbt-yaml-description-input"]'
    )!;
    expect(container.textContent).toContain('models/marts/schema.yml');
    expect(input.readOnly).toBe(false);

    fireEvent.change(input, { target: { value: 'User-authored description.' } });
    fireEvent.click(container.querySelector('[data-slot="dbt-yaml-description-review"]')!);

    expect(onDraftChange).toHaveBeenCalledWith('User-authored description.');
    expect(onReview).toHaveBeenCalledOnce();
  });

  it('renders a focused read-only diff while the proposal awaits confirmation', async () => {
    const state = {
      ...createDbtYamlDescriptionEditorState('Existing description.'),
      phase: 'reviewing' as const,
      draft: 'Changed description.',
      proposal: {
        schemaVersion: 'dbt-yaml-description-edit-proposal.v1' as const,
        canvasId: 'analytics',
        resource: {
          uniqueId: 'model.analytics.orders',
          resourceType: 'model' as const,
          name: 'orders',
        },
        path: 'models/marts/schema.yml',
        previousDescription: 'Existing description.',
        nextDescription: 'Changed description.',
        expectedContentSha256: '1'.repeat(64),
        candidateContent: 'models: []',
        candidateContentSha256: '2'.repeat(64),
        unifiedDiff: '- Existing description.\n+ Changed description.',
        proposalDigest: '3'.repeat(64),
      },
    };

    await act(async () => {
      root.render(
        <DbtYamlDescriptionEditorView
          path="models/marts/schema.yml"
          copy={COPY}
          state={state}
          onDraftChange={vi.fn()}
          onReview={vi.fn()}
          onDiscardReview={vi.fn()}
          onApply={vi.fn()}
          onRevert={vi.fn()}
          onReloadLatest={vi.fn()}
          onContinueEditing={vi.fn()}
        />
      );
    });

    expect(
      container.querySelector<HTMLTextAreaElement>('[data-slot="dbt-yaml-description-input"]')
        ?.readOnly
    ).toBe(true);
    expect(container.querySelector('[data-slot="dbt-yaml-description-diff"]')?.textContent).toBe(
      state.proposal.unifiedDiff
    );
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    expect(container.querySelector('[data-slot="dbt-yaml-description-apply"]')).not.toBeNull();
  });

  it('renders the immutable apply receipt with abbreviated inspectable revisions', async () => {
    const receiptId = '4'.repeat(64);
    const appliedContentSha256 = '5'.repeat(64);
    const analysisSha256 = '6'.repeat(64);
    const projectContentSetSha256 = '7'.repeat(64);

    await act(async () => {
      root.render(
        <DbtYamlDescriptionEditorView
          path="models/marts/schema.yml"
          copy={COPY}
          state={{
            ...createDbtYamlDescriptionEditorState('Changed description.'),
            phase: 'applied',
            appliedReceipt: {
              schemaVersion: 'dbt-yaml-description-edit-applied-receipt.v1',
              receiptId,
              canvasId: 'analytics',
              resource: {
                uniqueId: 'model.analytics.orders',
                resourceType: 'model',
                name: 'orders',
              },
              path: 'models/marts/schema.yml',
              previousDescription: 'Existing description.',
              nextDescription: 'Changed description.',
              expectedContentSha256: '1'.repeat(64),
              appliedContentSha256,
              proposalDigest: '3'.repeat(64),
              idempotencyKey: 'apply-description-once',
              requestHash: '8'.repeat(64),
              deduplicated: false,
              analysis: {
                freshness: 'fresh',
                analysisSha256,
                projectContentSetSha256,
              },
            },
          }}
          onDraftChange={vi.fn()}
          onReview={vi.fn()}
          onDiscardReview={vi.fn()}
          onApply={vi.fn()}
          onRevert={vi.fn()}
          onReloadLatest={vi.fn()}
          onContinueEditing={vi.fn()}
        />
      );
    });

    const receipt = container.querySelector('[data-slot="dbt-yaml-description-receipt"]');
    expect(receipt).not.toBeNull();
    expect(receipt?.textContent).toContain('444444444444');
    expect(receipt?.textContent).toContain('555555555555');
    expect(receipt?.textContent).toContain('666666666666');
    expect(receipt?.textContent).toContain('777777777777');
    expect(
      receipt?.querySelector(`[data-full-value="${receiptId}"]`)?.getAttribute('aria-label')
    ).toContain(receiptId);
    expect(container.querySelector('[data-slot="dbt-yaml-description-revert"]')).not.toBeNull();
  });
});

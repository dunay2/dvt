// @vitest-environment jsdom

import {
  DbtYamlDescriptionAppliedReceiptSchema,
  DbtYamlDescriptionEditProposalSchema,
  DbtYamlDescriptionRevertedReceiptSchema,
} from '@dvt/contracts';
import { fireEvent, waitFor } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IDbtYamlDescriptionEditPort } from '../../ports/dbtYamlDescriptionEdit';
import { AppServicesProvider } from '../../services/AppServicesContext';
import type { CanonicalNode } from '../../types/canonical';
import { DbtYamlDescriptionEditor } from './DbtYamlDescriptionEditor';

const NODE: CanonicalNode = {
  id: 'model.analytics.orders',
  name: 'orders',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  path: 'models/marts/orders.sql',
  description: 'Existing description.',
};

const PROPOSAL = DbtYamlDescriptionEditProposalSchema.parse({
  schemaVersion: 'dbt-yaml-description-edit-proposal.v1',
  canvasId: 'analytics',
  resource: {
    uniqueId: NODE.id,
    resourceType: 'model',
    name: NODE.name,
    packageName: 'analytics',
  },
  path: 'models/marts/schema.yml',
  previousDescription: NODE.description,
  nextDescription: 'Changed description.',
  expectedContentSha256: '1'.repeat(64),
  candidateContent: 'models: []',
  candidateContentSha256: '2'.repeat(64),
  unifiedDiff: '- Existing description.\n+ Changed description.',
  proposalDigest: '3'.repeat(64),
});

const APPLIED_RECEIPT = DbtYamlDescriptionAppliedReceiptSchema.parse({
  schemaVersion: 'dbt-yaml-description-edit-applied-receipt.v1',
  receiptId: '4'.repeat(64),
  canvasId: PROPOSAL.canvasId,
  resource: PROPOSAL.resource,
  path: PROPOSAL.path,
  previousDescription: PROPOSAL.previousDescription,
  nextDescription: PROPOSAL.nextDescription,
  expectedContentSha256: PROPOSAL.expectedContentSha256,
  appliedContentSha256: PROPOSAL.candidateContentSha256,
  proposalDigest: PROPOSAL.proposalDigest,
  idempotencyKey:
    'dbt-description-apply:model.analytics.orders:00000000-0000-4000-8000-000000000000',
  requestHash: '5'.repeat(64),
  deduplicated: false,
  analysis: {
    freshness: 'fresh',
    analysisSha256: '6'.repeat(64),
    projectContentSetSha256: '7'.repeat(64),
    targetContentSha256: PROPOSAL.candidateContentSha256,
  },
});

const REVERTED_RECEIPT = DbtYamlDescriptionRevertedReceiptSchema.parse({
  schemaVersion: 'dbt-yaml-description-edit-reverted-receipt.v1',
  receiptId: '8'.repeat(64),
  appliedReceiptId: APPLIED_RECEIPT.receiptId,
  canvasId: PROPOSAL.canvasId,
  resource: PROPOSAL.resource,
  path: PROPOSAL.path,
  restoredDescription: PROPOSAL.previousDescription,
  expectedContentSha256: APPLIED_RECEIPT.appliedContentSha256,
  revertedContentSha256: '9'.repeat(64),
  idempotencyKey:
    'dbt-description-revert:model.analytics.orders:00000000-0000-4000-8000-000000000000',
  requestHash: 'a'.repeat(64),
  deduplicated: false,
  analysis: {
    freshness: 'fresh',
    analysisSha256: 'b'.repeat(64),
    projectContentSetSha256: 'c'.repeat(64),
    targetContentSha256: '9'.repeat(64),
  },
});

describe('DbtYamlDescriptionEditor', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal('crypto', {
      getRandomValues: (target: Uint8Array) => {
        target.fill(0);
        return target;
      },
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('reviews, conditionally applies, refreshes, and conditionally reverts one YAML description', async () => {
    const port: IDbtYamlDescriptionEditPort = {
      propose: vi.fn(async () => PROPOSAL),
      apply: vi.fn(async () => APPLIED_RECEIPT),
      revert: vi.fn(async () => REVERTED_RECEIPT),
    };
    const onProjectChanged = vi.fn(async () => undefined);

    await act(async () => {
      root.render(
        <AppServicesProvider overrides={{ dbtYamlDescriptionEditPort: port }}>
          <DbtYamlDescriptionEditor
            canvasId="analytics"
            node={NODE}
            descriptionFilePath="models/marts/schema.yml"
            onProjectChanged={onProjectChanged}
            onReloadLatest={vi.fn(async () => NODE.description ?? null)}
          />
        </AppServicesProvider>
      );
    });

    const input = container.querySelector<HTMLTextAreaElement>(
      '[data-slot="dbt-yaml-description-input"]'
    )!;
    await act(async () => {
      fireEvent.change(input, { target: { value: PROPOSAL.nextDescription } });
      fireEvent.click(container.querySelector('[data-slot="dbt-yaml-description-review"]')!);
    });

    await waitFor(() => {
      expect(port.propose).toHaveBeenCalledWith({
        canvasId: 'analytics',
        resourceUniqueId: NODE.id,
        nextDescription: PROPOSAL.nextDescription,
      });
      expect(container.querySelector('[data-slot="dbt-yaml-description-apply"]')).not.toBeNull();
    });

    await act(async () => {
      fireEvent.click(container.querySelector('[data-slot="dbt-yaml-description-apply"]')!);
    });
    await waitFor(() => {
      expect(port.apply).toHaveBeenCalledWith({
        proposal: PROPOSAL,
        idempotencyKey: APPLIED_RECEIPT.idempotencyKey,
      });
      expect(onProjectChanged).toHaveBeenCalledOnce();
      expect(container.querySelector('[data-slot="dbt-yaml-description-revert"]')).not.toBeNull();
    });

    await act(async () => {
      fireEvent.click(container.querySelector('[data-slot="dbt-yaml-description-revert"]')!);
    });
    await waitFor(() => {
      expect(port.revert).toHaveBeenCalledWith({
        appliedReceiptId: APPLIED_RECEIPT.receiptId,
        idempotencyKey: REVERTED_RECEIPT.idempotencyKey,
      });
      expect(onProjectChanged).toHaveBeenCalledTimes(2);
    });
  });

  it('does not apply a stale review and reloads the latest analyzed description', async () => {
    const staleProposal = { ...PROPOSAL, previousDescription: 'External change.' };
    const onReloadLatest = vi.fn(async () => 'External change.');
    const port: IDbtYamlDescriptionEditPort = {
      propose: vi.fn(async () => staleProposal),
      apply: vi.fn(async () => APPLIED_RECEIPT),
      revert: vi.fn(async () => REVERTED_RECEIPT),
    };

    await act(async () => {
      root.render(
        <AppServicesProvider overrides={{ dbtYamlDescriptionEditPort: port }}>
          <DbtYamlDescriptionEditor
            canvasId="analytics"
            node={NODE}
            descriptionFilePath="models/marts/schema.yml"
            onProjectChanged={vi.fn(async () => undefined)}
            onReloadLatest={onReloadLatest}
          />
        </AppServicesProvider>
      );
    });

    await act(async () => {
      fireEvent.change(container.querySelector('[data-slot="dbt-yaml-description-input"]')!, {
        target: { value: PROPOSAL.nextDescription },
      });
      fireEvent.click(container.querySelector('[data-slot="dbt-yaml-description-review"]')!);
    });
    await waitFor(() => {
      expect(container.querySelector('[data-slot="dbt-yaml-description-reload"]')).not.toBeNull();
      expect(port.apply).not.toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.click(container.querySelector('[data-slot="dbt-yaml-description-reload"]')!);
    });
    await waitFor(() => {
      expect(onReloadLatest).toHaveBeenCalledOnce();
      expect(
        container.querySelector<HTMLTextAreaElement>('[data-slot="dbt-yaml-description-input"]')
          ?.value
      ).toBe('External change.');
    });
  });
});

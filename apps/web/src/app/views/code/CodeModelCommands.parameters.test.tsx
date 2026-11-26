// @vitest-environment jsdom
/** Prove Code materializes only the preview accepted for the parameters confirmed in this dialog. */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestQueryClient } from '../../../testing/reactQueryHarness';
import type { PlanPreviewOutcome } from '../../ports/plans';
import { acceptedPlan, createCodeModelCommandsHarness } from './CodeModelCommands.test-support';
import { useAuthorizationStore } from '../../stores/authorizationStore';
import { makePlanRef } from '../../testing/contractTestUtils';
import { executableContextFixture } from './codeWorkspaceFileContext.test-support';

describe('Code model run parameters', () => {
  const h = createCodeModelCommandsHarness();
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        disconnect = vi.fn();
        unobserve = vi.fn();
      }
    );
    h.reset();
    h.fixture = {
      ...h.fixture,
      project: {
        ...h.fixture.project,
        nodes: h.fixture.project.nodes.map((node) =>
          node.name === 'clientes'
            ? {
                ...node,
                runParameters: [
                  {
                    name: 'country',
                    type: 'text',
                    choices: ['ES', 'FR'],
                    defaultValue: 'ES',
                    environmentDefaults: { 'env-1': 'FR' },
                  },
                  {
                    name: 'minimum',
                    type: 'integer',
                    defaultValue: 0,
                    enabledBy: 'with_minimum',
                    enabledByDefault: false,
                  },
                ],
              }
            : node
        ),
        edges: [
          {
            id: 'dependency',
            relation: 'dependency',
            sourceUniqueId: 'model.demo.clientes',
            targetUniqueId: 'model.demo.ventas',
          },
        ],
      },
    };
  });
  afterEach(async () => {
    await h.cleanup();
    vi.unstubAllGlobals();
  });
  const dialog = (): HTMLElement => document.querySelector<HTMLElement>('[role="dialog"]')!;
  const confirm = (): HTMLButtonElement =>
    dialog().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const cancel = (): HTMLButtonElement =>
    [...dialog().querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === 'Cancel'
    )!;

  it('shows inherited declarations, effective environment and explicit zero, then executes the accepted reference', async () => {
    // A malformed sibling outside this model's dependency closure cannot block it.
    h.fixture.project.nodes[2]!.runParameterError = 'invalid_declaration';
    h.ui = await withTestQueryClient(h.render());
    await h.click('execute');
    expect(h.preview).not.toHaveBeenCalled();
    expect(dialog().querySelector<HTMLSelectElement>('[name="country"]')?.value).toBe('FR');
    expect(dialog().textContent).toContain('Environment');
    const minimum = dialog().querySelector<HTMLInputElement>('[name="minimum"]')!;
    expect(minimum.value).toBe('0');
    expect(minimum.disabled).toBe(true);
    await act(async () => {
      dialog().querySelector<HTMLButtonElement>('[role="switch"]')!.click();
    });
    expect(minimum.disabled).toBe(false);
    await act(async () => {
      confirm().click();
      confirm().click();
    });
    expect(h.preview).toHaveBeenCalledOnce();
    expect(h.preview.mock.calls[0]?.[0]).toMatchObject({
      parameterOverrides: [{ name: 'minimum', enabled: true }],
    });
    expect(h.startRun).toHaveBeenCalledOnce();
    const expected = acceptedPlan(h.preview.mock.calls[0]![0]);
    expect(expected.kind === 'accepted' && expected.plan.planRef).toEqual(
      h.startRun.mock.calls[0]?.[0].planRef
    );
  });

  it('keeps compile separate and never uses its earlier successful plan after a rejected recompile', async () => {
    h.ui = await withTestQueryClient(h.render());
    await h.click('compile');
    await act(async () => {
      confirm().click();
    });
    expect(h.startRun).not.toHaveBeenCalled();
    h.preview.mockRejectedValueOnce(new Error('Compilation rejected'));
    await h.click('execute');
    expect(h.preview).toHaveBeenCalledTimes(2);
    expect(h.startRun).not.toHaveBeenCalled();
  });

  it('submits the fresh accepted PlanRef even when a previous compile succeeded', async () => {
    h.ui = await withTestQueryClient(h.render());
    await h.click('compile');
    await act(async () => {
      confirm().click();
    });
    const old = acceptedPlan(h.preview.mock.calls[0]![0]);
    if (old.kind !== 'accepted') throw new Error('The fixture must produce an accepted plan');
    const planId = 'another-accepted-plan';
    const planRef = makePlanRef({ planId });
    h.preview.mockResolvedValueOnce({
      kind: 'accepted',
      plan: {
        ...old.plan,
        planId,
        planRef,
        preview: {
          ...old.plan.preview,
          persisted: { planRecordId: planId, canonicalPlanSha256: planRef.sha256 },
        },
      },
    });
    await h.click('execute');
    expect(h.startRun).toHaveBeenCalledOnce();
    expect(h.startRun.mock.calls[0]?.[0].planRef).toEqual(planRef);
  });

  it('requires a missing boolean and accepts explicit false as a value', async () => {
    h.fixture.project.nodes[0]!.runParameters = [{ name: 'published', type: 'boolean' }];
    h.ui = await withTestQueryClient(h.render());
    await h.click('execute');
    const select = dialog().querySelector<HTMLSelectElement>('[name="published"]')!;
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(confirm().disabled).toBe(true);
    await act(async () => {
      select.value = 'false';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(select.getAttribute('aria-invalid')).toBe('false');
    await act(async () => {
      confirm().click();
    });
    expect(h.preview.mock.calls[0]?.[0]).toMatchObject({
      parameterOverrides: [{ name: 'published', value: false }],
    });
  });

  it.each(['conflict', 'malformed'] as const)(
    'blocks compilation and run for a %s declaration in the selected closure',
    async (kind) => {
      if (kind === 'conflict')
        h.fixture.project.nodes[0]!.runParameters = [{ name: 'country', type: 'date' }];
      else h.fixture.project.nodes[1]!.runParameterError = 'invalid_declaration';
      h.ui = await withTestQueryClient(h.render());
      expect(h.button('compile').disabled).toBe(true);
      expect(h.button('execute').disabled).toBe(true);
      expect(h.ui.container.querySelector('[role="status"]')?.textContent).toContain(
        'declarations'
      );
      expect(h.preview).not.toHaveBeenCalled();
      expect(h.startRun).not.toHaveBeenCalled();
    }
  );

  it.each(['cancel', 'scope', 'revision', 'permission'] as const)(
    'retires an in-flight confirmation on %s',
    async (change) => {
      let finish!: (outcome: PlanPreviewOutcome) => void;
      h.preview.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      );
      h.ui = await withTestQueryClient(h.render());
      await h.click('execute');
      await act(async () => {
        confirm().click();
      });
      if (change === 'cancel')
        await act(async () => {
          cancel().click();
        });
      else if (change === 'scope') {
        h.scope = { ...h.scope, environmentId: 'other' };
        await h.ui.render(h.render());
      } else if (change === 'revision') {
        h.fixture = executableContextFixture('select 2 as revised');
        await h.ui.render(h.render());
      } else {
        await act(async () => {
          useAuthorizationStore.setState({
            userPermissions: { ...useAuthorizationStore.getState().userPermissions, canRun: false },
          });
        });
      }
      await act(async () => {
        finish(acceptedPlan(h.preview.mock.calls[0]![0]));
      });
      expect(h.startRun).not.toHaveBeenCalled();
    }
  );
});

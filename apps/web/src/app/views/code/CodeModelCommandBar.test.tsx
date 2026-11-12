// @vitest-environment jsdom
/** Prove Code cannot materialize without its own current, accepted compilation. */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { withTestQueryClient } from '../../../testing/reactQueryHarness';
import type { PlanPreviewOutcome } from '../../ports/plans';
import type { FileContent } from '../../ports/workspace';
import { DEFAULT_USER_PERMISSIONS, useAuthorizationStore } from '../../stores/authorizationStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import type { RunStartReceipt } from '../../ports/runs';
import { executableContextFixture } from './codeWorkspaceFileContext.test-support';
import { acceptedPlan, createCodeModelCommandsHarness } from './CodeModelCommands.test-support';

describe('Code model compilation and materialization', () => {
  const h = createCodeModelCommandsHarness();
  beforeEach(h.reset);
  afterEach(h.cleanup);

  // Ordinary SQL must compile too; analysis of Jinja references grants no execution authority.
  it('requires compilation, then executes the open model through the accepted PlanRef', async () => {
    h.ui = await withTestQueryClient(h.render());
    expect(h.button('execute').disabled).toBe(true);
    await h.click('execute');
    expect(h.startRun).not.toHaveBeenCalled();
    await h.click('compile');
    expect(h.preview).toHaveBeenCalledOnce();
    expect(h.preview.mock.calls[0]?.[0]).toMatchObject({
      selection: { mode: 'explicit', nodeIds: ['model.demo.ventas'] },
    });
    expect(h.button('execute').disabled).toBe(false);
    await h.click('execute');
    expect(h.startRun).toHaveBeenCalledOnce();
    expect(h.ui.container.textContent).toContain('View run');
  });

  // A prior success must not survive any invalidating editor/session transition.
  it.each(['SQL', 'target', 'connection', 'environment', 'dirty buffer'] as const)(
    'requires a new compilation after changing %s',
    async (change) => {
      h.ui = await withTestQueryClient(h.render());
      await h.click('compile');
      expect(h.button('execute').disabled).toBe(false);
      if (change === 'SQL') h.fixture = executableContextFixture('select 2 as id');
      if (change === 'target')
        h.fixture = {
          ...h.fixture,
          project: {
            ...h.fixture.project,
            executionTarget: { ...h.fixture.project.executionTarget!, targetName: 'other' },
          },
        };
      if (change === 'environment') h.scope = { ...h.scope, environmentId: 'other' };
      if (change === 'connection') {
        const target = h.fixture.project.executionTarget!;
        h.fixture = {
          ...h.fixture,
          project: {
            ...h.fixture.project,
            executionTarget: {
              ...target,
              connectionRef: { ...target.connectionRef!, connectionId: 'other-warehouse' },
            },
          },
        };
      }
      if (change === 'dirty buffer') h.synchronized = false;
      await h.ui.render(h.render());
      expect(h.button('execute').disabled).toBe(true);
      await h.click('execute');
      expect(h.startRun).not.toHaveBeenCalled();
    }
  );

  it('clears the previous accepted plan when recompilation fails', async () => {
    h.ui = await withTestQueryClient(h.render());
    await h.click('compile');
    h.preview.mockRejectedValue(new Error('Compilation failed'));
    await h.click('compile');
    expect(h.button('execute').disabled).toBe(true);
    await h.click('execute');
    expect(h.startRun).not.toHaveBeenCalled();
  });

  it('rejects external file edits before compilation and before Run', async () => {
    h.ui = await withTestQueryClient(h.render());
    h.serverFile = executableContextFixture('select 9 as id').file;
    await h.click('compile');
    expect(h.preview).not.toHaveBeenCalled();
    expect(h.button('execute').disabled).toBe(true);
    h.serverFile = h.fixture.file;
    await h.click('compile');
    expect(h.button('execute').disabled).toBe(false);
    h.serverFile = executableContextFixture('select 9 as id').file;
    await h.click('execute');
    expect(h.startRun).not.toHaveBeenCalled();
    expect(h.button('execute').disabled).toBe(true);
  });

  // Slow responses and double activation used to let commands escape the current UI lifetime.
  it('ignores a compilation completed after leaving its scope and suppresses double activation', async () => {
    let finish!: (outcome: PlanPreviewOutcome) => void;
    h.preview.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    h.ui = await withTestQueryClient(h.render());
    await act(async () => {
      h.button('compile').click();
      h.button('compile').click();
    });
    expect(h.preview).toHaveBeenCalledOnce();
    expect(h.button('execute').disabled).toBe(true);
    h.scope = { ...h.scope, projectId: 'other-project' };
    await h.ui.render(h.render());
    await act(async () => {
      finish(acceptedPlan(h.preview.mock.calls[0]![0]));
    });
    expect(h.button('execute').disabled).toBe(true);
    expect(h.startRun).not.toHaveBeenCalled();
  });

  it('keeps command permissions independent from SQL readability', async () => {
    useAuthorizationStore.setState({ userPermissions: DEFAULT_USER_PERMISSIONS });
    h.ui = await withTestQueryClient(h.render());
    expect(h.button('compile').disabled).toBe(true);
    expect(h.button('execute').disabled).toBe(true);
    await h.click('compile');
    await h.click('execute');
    expect(h.preview).not.toHaveBeenCalled();
    expect(h.startRun).not.toHaveBeenCalled();
  });

  it('does not submit Run if permission is revoked while confirming the file revision', async () => {
    h.ui = await withTestQueryClient(h.render());
    await h.click('compile');
    let finish!: (file: FileContent) => void;
    h.pendingRead = new Promise((resolve) => {
      finish = resolve;
    });
    await h.click('execute');
    await act(async () => {
      useAuthorizationStore.setState({
        userPermissions: { ...DEFAULT_USER_PERMISSIONS, canPlan: true },
      });
    });
    await act(async () => {
      finish(h.serverFile);
    });
    expect(h.startRun).not.toHaveBeenCalled();
    expect(h.button('execute').disabled).toBe(true);
  });

  it('does not reveal Run feedback in a different workspace after a late receipt', async () => {
    h.ui = await withTestQueryClient(h.render());
    await h.click('compile');
    h.feedback.success.mockClear();
    let finish!: (receipt: RunStartReceipt) => void;
    h.startRun.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    await h.click('execute');
    expect(h.startRun).toHaveBeenCalledOnce();
    h.scope = { ...h.scope, environmentId: 'other' };
    await h.ui.render(h.render());
    await act(async () => {
      finish(await h.runs.startRun(h.startRun.mock.calls[0]![0]));
    });
    expect(useUiLayoutStore.getState().bottomDrawerVisible).toBe(false);
    expect(h.feedback.success).not.toHaveBeenCalled();
    expect(h.ui.container.querySelector('a')).toBeNull();
  });
});

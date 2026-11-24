// @vitest-environment jsdom

/** Prove the mounted shell publishes explorer changes only for actual context dependencies. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCanvasShellProps, createCanvasShellHarness } from './CanvasShell.testHarness';

const observations = vi.hoisted(() => ({ values: [] as unknown[] }));

vi.mock('./CanvasShellMainPanel', async () => {
  const { useContext } = await import('react');
  const { CanvasExplorerDocumentsContext } = await import('./explorer/CanvasExplorerDocuments');
  return {
    CanvasShellMainPanel: function ObserveExplorerContext() {
      observations.values.push(useContext(CanvasExplorerDocumentsContext));
      return null;
    },
  };
});

describe('CanvasShell explorer context identity', () => {
  let harness: ReturnType<typeof createCanvasShellHarness>;

  beforeEach(() => {
    // DOM capability only: jsdom does not calculate Tooltip resize geometry.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      }
    );
    observations.values = [];
    harness = createCanvasShellHarness();
  });

  afterEach(() => {
    harness.unmount();
    vi.unstubAllGlobals();
  });

  it('retains identity when only the command container changes', async () => {
    const props = buildCanvasShellProps();
    await harness.renderProps(props);
    const first = observations.values.at(-1);
    expect(first).toMatchObject({ activeId: props.panels.activeCanvasId });

    await harness.renderProps({ ...props, canvasCommands: { ...props.canvasCommands } });

    expect(observations.values.at(-1)).toBe(first);
  });

  it('publishes each changed callback rather than retaining stale commands', async () => {
    const props = buildCanvasShellProps();
    await harness.renderProps(props);
    const first = observations.values.at(-1);
    const onAddCanvas = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    await harness.renderProps({
      ...props,
      canvasCommands: { ...props.canvasCommands, onAddCanvas },
    });
    const added = observations.values.at(-1);
    expect(added).not.toBe(first);
    expect(added).toMatchObject({ onAddCanvas });

    const onSelectCanvas = vi.fn<(id: string) => void>();
    await harness.renderProps({ ...props, canvasCommands: { onAddCanvas, onSelectCanvas } });

    expect(observations.values.at(-1)).not.toBe(added);
    expect(observations.values.at(-1)).toMatchObject({ onAddCanvas, onSelectCanvas });
  });

  it('publishes changed documents and clears the context when Canvas is unavailable', async () => {
    const props = buildCanvasShellProps();
    await harness.renderProps(props);
    const first = observations.values.at(-1);
    const canvasDocuments = [...props.panels.canvasDocuments];
    await harness.renderProps({ ...props, panels: { ...props.panels, canvasDocuments } });
    expect(observations.values.at(-1)).not.toBe(first);
    expect(observations.values.at(-1)).toMatchObject({ documents: canvasDocuments });

    await harness.renderProps({ ...props, panels: { ...props.panels, activeCanvasId: null } });

    expect(observations.values.at(-1)).toBeNull();
  });
});

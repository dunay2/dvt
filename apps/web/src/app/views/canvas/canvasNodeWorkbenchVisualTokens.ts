/** Owned concern: centralize contextual node workbench geometry and interaction tokens. */
export const canvasNodeWorkbenchVisualTokens = Object.freeze({
  overlay:
    'absolute z-20 flex h-[min(40rem,calc(100%-2rem))] w-[min(28rem,calc(100%-2rem))] overflow-hidden rounded-md border border-(--border-default) bg-(--surface-panel) shadow-xl',
  dragHandle:
    'min-w-0 flex-1 cursor-move select-none rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)',
} as const);

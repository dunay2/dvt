/** Owned concern: centralize contextual node workbench geometry and interaction tokens. */
export const canvasNodeWorkbenchVisualTokens = Object.freeze({
  overlay:
    'absolute z-20 flex overflow-hidden rounded-md border border-(--border-default) bg-(--surface-panel) shadow-xl',
  defaultOverlaySize:
    'h-[min(40rem,calc(100%-2rem))] w-[min(28rem,calc(100%-2rem))]',
  sourceOverlaySize:
    'h-[min(56rem,calc(100%-2rem))] w-[min(52rem,calc(100%-2rem))]',
  dragHandle:
    'min-w-0 flex-1 cursor-move select-none rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)',
} as const);

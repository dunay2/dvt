/** Owned concern: define visual tokens for the Canvas node floating toolbar. */
import { cn } from '../../components/ui/utils';
import type { CanvasNodeFloatingToolbarAction } from './canvasNodeFloatingToolbarModel';

export const canvasNodeFloatingToolbarClasses = {
  surface: cn(
    'fixed left-0 top-0 z-50 flex items-center gap-1 rounded-lg border border-white/12',
    'bg-slate-950/95 px-1.5 py-1.5 shadow-2xl shadow-slate-950/40 backdrop-blur',
    'translate-x-[var(--node-toolbar-x)] translate-y-[var(--node-toolbar-y)]'
  ),
  action: cn(
    'nodrag nopan inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition',
    'border border-transparent bg-white/0 text-slate-100 hover:border-white/20 hover:bg-white/10'
  ),
  successAction: 'text-emerald-300 hover:text-emerald-200',
  availableAction: 'cursor-pointer',
  unavailableAction: 'cursor-not-allowed opacity-45 hover:border-transparent hover:bg-white/0',
  icon: 'size-4',
} as const;

export type CanvasNodeFloatingToolbarActionState = 'available' | 'unavailable';

export function resolveCanvasNodeFloatingToolbarActionState(
  action: CanvasNodeFloatingToolbarAction
): CanvasNodeFloatingToolbarActionState {
  return action.available ? 'available' : 'unavailable';
}

export function resolveCanvasNodeFloatingToolbarActionClassName(
  action: CanvasNodeFloatingToolbarAction
): string {
  return cn(
    canvasNodeFloatingToolbarClasses.action,
    action.tone === 'success' && canvasNodeFloatingToolbarClasses.successAction,
    action.available
      ? canvasNodeFloatingToolbarClasses.availableAction
      : canvasNodeFloatingToolbarClasses.unavailableAction
  );
}

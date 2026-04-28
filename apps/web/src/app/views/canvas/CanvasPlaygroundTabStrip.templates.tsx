/** Owned concern: render Canvas playground tab-strip presentation templates without command policy. */
import { Layers2, Plus } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { cn } from '../../components/ui/utils';
import {
  routeWorkbenchTabListClassName,
  routeWorkbenchTabTriggerClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import type { CanvasPlaygroundTabState } from './canvasPlaygroundTabState';
import type { CanvasReplacementActionViewState } from './canvasPlaygroundTabStripModel';

type CanvasPlaygroundTabStripTemplateProps = Readonly<{
  tabState: CanvasPlaygroundTabState;
  replacementAction: CanvasReplacementActionViewState;
  isReplacementDialogOpen: boolean;
  onRequestReplacement: () => void;
  onReplacementDialogOpenChange: (open: boolean) => void;
  onCancelReplacement: () => void;
  onConfirmReplacement: () => void;
}>;

type CanvasPlaygroundTabsTemplateProps = Readonly<{
  tabState: CanvasPlaygroundTabState;
}>;

type CanvasReplacementActionTemplateProps = Readonly<{
  action: CanvasReplacementActionViewState;
  isDialogOpen: boolean;
  onRequestReplacement: () => void;
  onDialogOpenChange: (open: boolean) => void;
  onCancelReplacement: () => void;
  onConfirmReplacement: () => void;
}>;

export function CanvasPlaygroundTabStripTemplate({
  tabState,
  replacementAction,
  isReplacementDialogOpen,
  onRequestReplacement,
  onReplacementDialogOpenChange,
  onCancelReplacement,
  onConfirmReplacement,
}: CanvasPlaygroundTabStripTemplateProps): JSX.Element {
  return (
    <div
      data-slot="canvas-playground-tab-strip"
      className="flex shrink-0 items-center justify-between gap-3 border-b border-[color:var(--border-default)] bg-[var(--surface-panel)] px-4 py-2"
    >
      <CanvasPlaygroundTabsTemplate tabState={tabState} />
      <CanvasReplacementActionTemplate
        action={replacementAction}
        isDialogOpen={isReplacementDialogOpen}
        onRequestReplacement={onRequestReplacement}
        onDialogOpenChange={onReplacementDialogOpenChange}
        onCancelReplacement={onCancelReplacement}
        onConfirmReplacement={onConfirmReplacement}
      />
    </div>
  );
}

function CanvasPlaygroundTabsTemplate({
  tabState,
}: CanvasPlaygroundTabsTemplateProps): JSX.Element {
  return (
    <Tabs value={tabState.activeTabId ?? undefined} className="min-w-0 flex-1">
      <TabsList className={cn(routeWorkbenchTabListClassName, 'h-auto gap-2 p-1')}>
        {tabState.tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            data-slot="canvas-playground-tab-trigger"
            className={cn(
              routeWorkbenchTabTriggerClassName,
              'flex h-auto min-w-0 items-center gap-2 rounded-md px-3 py-2'
            )}
          >
            <Layers2 className="size-4 shrink-0" />
            <span className="min-w-0 truncate text-sm font-medium">{tab.title}</span>
            <span className="rounded-sm border border-[color:var(--border-default)] px-1.5 py-0.5 text-[10px] leading-none text-[var(--text-subtle)]">
              {tab.kindLabel}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function CanvasReplacementActionTemplate({
  action,
  isDialogOpen,
  onRequestReplacement,
  onDialogOpenChange,
  onCancelReplacement,
  onConfirmReplacement,
}: CanvasReplacementActionTemplateProps): JSX.Element {
  return (
    <AlertDialog open={isDialogOpen} onOpenChange={onDialogOpenChange}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!action.canReplaceCanvas}
        title={action.buttonTitle}
        className="h-8 shrink-0 gap-1.5 border-slate-700 bg-slate-950/60 px-2.5 text-xs text-slate-200 hover:bg-slate-800 hover:text-white"
        onClick={onRequestReplacement}
      >
        <Plus className="size-4" />
        {action.buttonLabel}
      </Button>
      <AlertDialogContent className="border-slate-700 bg-slate-950 text-slate-50">
        <AlertDialogHeader>
          <AlertDialogTitle>{action.dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300">
            {action.dialogDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancelReplacement}>{action.cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmReplacement}>
            {action.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

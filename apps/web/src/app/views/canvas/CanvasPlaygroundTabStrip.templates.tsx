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
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { cn } from '../../components/ui/utils';
import { routeWorkbenchSubtleTextClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { canvasChromeClasses } from './canvasChromeTokens';
import type { CanvasPlaygroundTabState } from './canvasPlaygroundTabState';
import type { CanvasReplacementActionViewState } from './canvasPlaygroundTabStripModel';

export type CanvasPlaygroundTabStripTemplateProps = Readonly<{
  tabState: CanvasPlaygroundTabState;
  replacementAction: CanvasReplacementActionViewState;
  isReplacementDialogOpen: boolean;
  selectedReplacementKind: string | null;
  variant?: 'standalone' | 'inline';
  onRequestReplacement: () => void;
  onReplacementDialogOpenChange: (open: boolean) => void;
  onReplacementTemplateKindChange: (kind: string) => void;
  onCancelReplacement: () => void;
  onConfirmReplacement: () => void;
}>;

type CanvasPlaygroundTabsTemplateProps = Readonly<{
  tabState: CanvasPlaygroundTabState;
}>;

type CanvasReplacementActionTemplateProps = Readonly<{
  action: CanvasReplacementActionViewState;
  isDialogOpen: boolean;
  selectedReplacementKind: string | null;
  onRequestReplacement: () => void;
  onDialogOpenChange: (open: boolean) => void;
  onTemplateKindChange: (kind: string) => void;
  onCancelReplacement: () => void;
  onConfirmReplacement: () => void;
}>;

export function CanvasPlaygroundTabStripTemplate({
  tabState,
  replacementAction,
  isReplacementDialogOpen,
  selectedReplacementKind,
  variant = 'standalone',
  onRequestReplacement,
  onReplacementDialogOpenChange,
  onReplacementTemplateKindChange,
  onCancelReplacement,
  onConfirmReplacement,
}: CanvasPlaygroundTabStripTemplateProps): JSX.Element {
  return (
    <div
      data-slot="canvas-playground-tab-strip"
      className={
        variant === 'inline'
          ? 'flex min-w-0 shrink-0 items-center justify-between gap-2'
          : 'flex shrink-0 items-center justify-between gap-3 border-b border-[color:var(--border-default)] bg-[var(--surface-panel)] px-4 py-2'
      }
    >
      <CanvasPlaygroundTabsTemplate tabState={tabState} />
      <CanvasReplacementActionTemplate
        action={replacementAction}
        isDialogOpen={isReplacementDialogOpen}
        selectedReplacementKind={selectedReplacementKind}
        onRequestReplacement={onRequestReplacement}
        onDialogOpenChange={onReplacementDialogOpenChange}
        onTemplateKindChange={onReplacementTemplateKindChange}
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
      <TabsList className="flex h-11 min-w-0 items-stretch gap-4 rounded-none border-0 bg-transparent p-0">
        {tabState.tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            data-slot="canvas-playground-tab-trigger"
            className={cn(
              'flex h-11 min-w-0 max-w-56 flex-none items-center gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 text-[var(--text-muted)] shadow-none',
              'hover:bg-transparent hover:text-[var(--text-strong)]',
              'data-[state=active]:border-[color:var(--focus-ring)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--text-strong)] data-[state=active]:shadow-none'
            )}
          >
            <Layers2 className="size-4 shrink-0" />
            <span className="min-w-0 truncate text-sm font-medium">{tab.title}</span>
            <span className={canvasChromeClasses.tabKindBadge}>{tab.kindLabel}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function CanvasReplacementActionTemplate({
  action,
  isDialogOpen,
  selectedReplacementKind,
  onRequestReplacement,
  onDialogOpenChange,
  onTemplateKindChange,
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
        className={canvasChromeClasses.replacementButton}
        onClick={onRequestReplacement}
      >
        <Plus className="size-4" />
        {action.buttonLabel}
      </Button>
      <AlertDialogContent className={canvasChromeClasses.replacementDialog}>
        <AlertDialogHeader>
          <AlertDialogTitle>{action.dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription className={canvasChromeClasses.replacementDescription}>
            {action.dialogDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <div className="text-sm font-semibold text-[var(--text-default)]">
            {action.templateLabel}
          </div>
          <RadioGroup
            value={selectedReplacementKind ?? undefined}
            onValueChange={onTemplateKindChange}
            className="grid gap-2"
          >
            {action.templateOptions.map((option) => (
              <label
                key={option.kind}
                data-slot="canvas-replacement-template-option"
                data-kind={option.kind}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-[color:var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-left"
                htmlFor={`canvas-replacement-template-${option.kind}`}
              >
                <RadioGroupItem
                  id={`canvas-replacement-template-${option.kind}`}
                  value={option.kind}
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--text-default)]">
                    {option.title}
                  </span>
                  <span className={cn('block text-xs', routeWorkbenchSubtleTextClassName)}>
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>
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

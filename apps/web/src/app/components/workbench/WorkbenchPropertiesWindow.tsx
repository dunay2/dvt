/** Owned concern: compose one reusable contextual workbench properties window. */
import type { ReactNode } from 'react';

import { Button } from '../ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export type WorkbenchPropertiesSection = Readonly<{
  id: string;
  label: string;
  content: ReactNode;
}>;

type WorkbenchPropertiesWindowProps = Readonly<{
  open: boolean;
  title: string;
  description: string;
  closeLabel: string;
  tabsLabel: string;
  cancelLabel: string;
  applyLabel: string;
  sections: readonly WorkbenchPropertiesSection[];
  applyDisabled?: boolean;
  onCancel: () => void;
  onApply: () => void;
  onRestoreFocus?: () => void;
}>;

export function WorkbenchPropertiesWindow({
  open,
  title,
  description,
  closeLabel,
  tabsLabel,
  cancelLabel,
  applyLabel,
  sections,
  applyDisabled = false,
  onCancel,
  onApply,
  onRestoreFocus,
}: WorkbenchPropertiesWindowProps): JSX.Element {
  const initialSectionId = sections[0]?.id;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
    >
      <DialogContent
        data-slot="workbench-properties-window"
        closeLabel={closeLabel}
        className="max-h-[min(48rem,calc(100vh-2rem))] max-w-2xl gap-0 overflow-hidden border-(--border-default) bg-(--surface-panel) p-0 text-(--text-default)"
        onCloseAutoFocus={(event) => {
          if (onRestoreFocus) {
            event.preventDefault();
            onRestoreFocus();
          }
        }}
      >
        <DialogHeader
          data-slot="workbench-properties-header"
          className="border-b border-(--border-muted) px-5 py-4 pr-12"
        >
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{description}</DialogDescription>
        </DialogHeader>

        {initialSectionId == null ? null : (
          <Tabs
            defaultValue={initialSectionId}
            className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
          >
            <TabsList
              aria-label={tabsLabel}
              className="h-auto w-full shrink-0 justify-start rounded-none border-b border-(--border-muted) bg-transparent px-5 py-0"
            >
              {sections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="rounded-none border-x-0 border-t-0 px-3 py-3"
                >
                  {section.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <div
              data-slot="workbench-properties-body"
              className="min-h-0 flex-1 overflow-y-auto"
            >
              {sections.map((section) => (
                <TabsContent key={section.id} value={section.id} className="m-0 p-5">
                  {section.content}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        )}

        <DialogFooter
          data-slot="workbench-properties-footer"
          className="shrink-0 border-t border-(--border-muted) bg-(--surface-panel-subtle) px-5 py-3"
        >
          <DialogClose asChild>
            <Button
              type="button"
              data-slot="workbench-properties-cancel"
              variant="outline"
            >
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            data-slot="workbench-properties-apply"
            disabled={applyDisabled}
            onClick={onApply}
          >
            {applyLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Owned concern: separate selected-operation inspection tabs from the bottom data dock. */
import { X } from 'lucide-react';
import {
  resolveCanvasRelationalOperationPresentation,
  type CanvasPresentationOperation,
} from './canvasRelationalOperationPresentation';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  CanvasOperationDataPreview,
  CanvasOperationPreviewContext,
} from './CanvasOperationDataPreview';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export const CanvasOperationExpressionHost = createContext<Readonly<{
  host: HTMLDivElement | null;
  openProperties: () => void;
}> | null>(null);

export function CanvasRelationalTreeEditorFrame({
  operation,
  children,
  hidden = false,
  onClose,
  relationId,
  hasExpression = true,
  readOnly = false,
}: Readonly<{
  operation: CanvasPresentationOperation;
  children: ReactNode;
  hidden?: boolean;
  onClose: () => void;
  relationId?: string | null;
  hasExpression?: boolean;
  readOnly?: boolean;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const presentation = resolveCanvasRelationalOperationPresentation(operation);
  const title = resolveCanvasViewCopy(language)[presentation.labelKey];
  const Icon = presentation.icon;
  const preview = useContext(CanvasOperationPreviewContext);
  const [tab, setTab] = useState(readOnly ? 'tree' : 'properties');
  const [expressionHost, setExpressionHost] = useState<HTMLDivElement | null>(null);
  const expressionContext = useMemo(
    () => ({
      host: expressionHost,
      openProperties: () => setTab('properties'),
    }),
    [expressionHost]
  );
  const openData = preview?.onOpenData;
  useEffect(() => {
    if (!hidden && relationId != null) openData?.();
  }, [hidden, relationId, openData]);
  const showPreview = !hidden && preview?.dataHost != null && relationId != null;
  return (
    <section
      data-slot="canvas-relational-tree-inline-editor"
      aria-label={title}
      hidden={hidden}
      className={`canvas-operation-properties ${hidden ? 'hidden' : 'flex'} min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-l border-(--border-subtle) bg-(--surface-panel)`}
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-(--border-subtle) bg-(--surface-panel) px-3">
        <Icon className="size-4 text-(--status-info)" />
        <h3 className="text-xs font-semibold">{title}</h3>
        <button
          type="button"
          data-slot="canvas-relational-collapse"
          aria-label={copy.collapse}
          title={copy.collapse}
          onClick={onClose}
          className="ml-auto grid size-7 place-items-center rounded hover:bg-(--surface-selected)"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </header>
      <CanvasOperationExpressionHost.Provider value={expressionContext}>
        <Tabs
          value={hasExpression ? tab : 'properties'}
          onValueChange={setTab}
          className="min-h-0 flex-1 gap-0"
        >
          <TabsList aria-label={title} className="m-2 shrink-0">
            {hasExpression ? (
              <TabsTrigger value="tree" data-slot="canvas-operation-tree-tab">
                {copy.expressionTree}
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="properties" data-slot="canvas-operation-properties-tab">
              {copy.properties}
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="tree"
            data-value="tree"
            forceMount
            className="min-h-0 overflow-auto p-3 data-[state=inactive]:hidden"
          >
            <div ref={setExpressionHost} className="h-full min-h-64" />
          </TabsContent>
          <TabsContent
            value="properties"
            data-value="properties"
            forceMount
            className="canvas-operation-panels min-h-0 overflow-auto p-3 data-[state=inactive]:hidden"
          >
            <div className="canvas-operation-controls min-h-0 min-w-0">{children}</div>
            {readOnly ? <p className="text-xs text-(--text-muted)">{copy.inspectionOnly}</p> : null}
          </TabsContent>
        </Tabs>
      </CanvasOperationExpressionHost.Provider>
      {showPreview
        ? createPortal(
            <CanvasOperationDataPreview relationId={relationId} label={title} />,
            preview.dataHost!
          )
        : null}
    </section>
  );
}

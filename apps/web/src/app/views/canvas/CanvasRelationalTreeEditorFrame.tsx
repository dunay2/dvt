/** Owned concern: separate selected-operation inspection tabs from the bottom data dock. */
import { Pencil, X } from 'lucide-react';
import {
  resolveCanvasRelationalOperationPresentation,
  type CanvasPresentationOperation,
} from './canvasRelationalOperationPresentation';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { createContext, useMemo, useState, type ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export const CanvasOperationExpressionHost = createContext<Readonly<{
  host: HTMLDivElement | null;
  openProperties: () => void;
}> | null>(null);

export function CanvasRelationalTreeEditorFrame({
  operation,
  children,
  output,
  hidden = false,
  onClose,
  relationId,
  hasExpression = true,
  readOnly = false,
  label,
  onEdit,
}: Readonly<{
  operation: CanvasPresentationOperation;
  children: ReactNode;
  output?: ReactNode;
  hidden?: boolean;
  onClose: () => void;
  relationId?: string | null;
  hasExpression?: boolean;
  readOnly?: boolean;
  label?: string;
  onEdit?: () => void;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const presentation = resolveCanvasRelationalOperationPresentation(operation);
  const title = label ?? resolveCanvasViewCopy(language)[presentation.labelKey];
  const Icon = presentation.icon;
  const [tab, setTab] = useState('properties');
  const activeTab = !hasExpression && tab === 'tree' ? 'properties' : tab;
  const [expressionHost, setExpressionHost] = useState<HTMLDivElement | null>(null);
  const expressionContext = useMemo(
    () => ({
      host: expressionHost,
      openProperties: () => setTab('properties'),
    }),
    [expressionHost]
  );
  return (
    <section
      data-slot="canvas-relational-tree-inline-editor"
      data-relation-id={relationId ?? undefined}
      aria-label={title}
      hidden={hidden}
      className={`canvas-operation-properties ${hidden ? 'hidden' : 'flex'} min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-l border-(--border-subtle) bg-(--surface-panel)`}
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-(--border-subtle) bg-(--surface-panel) px-3">
        <Icon className="size-4 text-(--status-info)" />
        <h3 className="text-xs font-semibold">{title}</h3>
        {onEdit == null ? null : (
          <button
            type="button"
            data-slot="canvas-relational-edit"
            onClick={onEdit}
            className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-(--surface-selected)"
          >
            <Pencil aria-hidden="true" className="size-3" />
            {copy.edit}
          </button>
        )}
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
        <Tabs value={activeTab} onValueChange={setTab} className="min-h-0 flex-1 gap-0">
          <TabsList
            aria-label={title}
            className="workspace-navigation-tabs border-b border-(--border-subtle)"
          >
            {hasExpression ? (
              <TabsTrigger
                value="tree"
                data-slot="canvas-operation-tree-tab"
                className="workspace-navigation-tab"
              >
                {copy.expressionTree}
              </TabsTrigger>
            ) : null}
            <TabsTrigger
              value="properties"
              data-slot="canvas-operation-properties-tab"
              className="workspace-navigation-tab"
            >
              {copy.properties}
            </TabsTrigger>
            {output == null ? null : (
              <TabsTrigger
                value="output"
                data-slot="canvas-operation-output-tab"
                className="workspace-navigation-tab"
              >
                {copy.output}
              </TabsTrigger>
            )}
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
            {readOnly && onEdit == null ? (
              <p className="text-xs text-(--text-muted)">{copy.inspectionOnly}</p>
            ) : null}
          </TabsContent>
          {output == null ? null : (
            <TabsContent
              value="output"
              data-value="output"
              forceMount
              className="min-h-0 overflow-auto p-3 data-[state=inactive]:hidden"
            >
              {output}
            </TabsContent>
          )}
        </Tabs>
      </CanvasOperationExpressionHost.Provider>
    </section>
  );
}

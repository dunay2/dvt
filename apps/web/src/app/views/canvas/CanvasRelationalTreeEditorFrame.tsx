/**
 * Owned concern: retain selected-operation tabs across inspection and editing frames.
 * @baseline ADR-0064: relation identity survives an accepted authoring change.
 * @decision Scope tab selection to the Model, independently of the edit transaction.
 * @consequence Edit, Apply and Cancel retain the tab without persisting presentation state.
 * @version 1.1.0
 */
import { Pencil, X } from 'lucide-react';
import {
  resolveCanvasRelationalOperationPresentation,
  type CanvasPresentationOperation,
} from './canvasRelationalOperationPresentation';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export const CanvasOperationExpressionHost = createContext<Readonly<{
  host: HTMLDivElement | null;
  openProperties: () => void;
}> | null>(null);

type InspectorTab = Readonly<{ relationId: string; tab: string }>;
const InspectorTabs = createContext<
  readonly [InspectorTab | null, (selection: InspectorTab) => void] | null
>(null);
const CanvasOutputEditing = createContext(true);

export function useCanvasOutputEditing(): boolean {
  return useContext(CanvasOutputEditing);
}

export function CanvasOperationInspectorTabs({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  const [selection, setSelection] = useState<InspectorTab | null>(null);
  const value = useMemo(() => [selection, setSelection] as const, [selection]);
  return <InspectorTabs.Provider value={value}>{children}</InspectorTabs.Provider>;
}

function useInspectorTab(relationId: string | null | undefined, initialTab: string) {
  const shared = useContext(InspectorTabs);
  const [localTab, setLocalTab] = useState(initialTab);
  const selection = shared?.[0];
  const select = shared?.[1];
  const tab =
    select == null || relationId == null
      ? localTab
      : selection?.relationId === relationId
        ? selection.tab
        : initialTab;
  const setTab = useCallback(
    (next: string) => {
      if (select != null && relationId != null) select({ relationId, tab: next });
      else setLocalTab(next);
    },
    [select, relationId]
  );
  return [tab, setTab] as const;
}

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
  initialTab = 'properties',
  onEdit,
  editing = !readOnly,
  dataSlot = 'canvas-relational-tree-inline-editor',
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
  initialTab?: 'properties' | 'output';
  onEdit?: () => void;
  editing?: boolean;
  dataSlot?: string;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const presentation = resolveCanvasRelationalOperationPresentation(operation);
  const title = label ?? resolveCanvasViewCopy(language)[presentation.labelKey];
  const Icon = presentation.icon;
  const [tab, setTab] = useInspectorTab(relationId, initialTab);
  const activeTab =
    (!hasExpression && tab === 'tree') || (output == null && tab === 'output') ? 'properties' : tab;
  const [expressionHost, setExpressionHost] = useState<HTMLDivElement | null>(null);
  const expressionContext = useMemo(
    () => ({
      host: expressionHost,
      openProperties: () => setTab('properties'),
    }),
    [expressionHost, setTab]
  );
  return (
    <section
      data-slot={dataSlot}
      data-canvas-inspector="true"
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
            aria-pressed={editing}
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
      <CanvasOutputEditing.Provider value={editing}>
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
      </CanvasOutputEditing.Provider>
    </section>
  );
}

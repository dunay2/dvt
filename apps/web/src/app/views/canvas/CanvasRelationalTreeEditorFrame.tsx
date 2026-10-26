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
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Checkbox } from '../../components/ui/checkbox';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export const CanvasOperationExpressionHost = createContext<Readonly<{
  host: HTMLDivElement | null;
  openProperties: () => void;
}> | null>(null);

type InspectorPresentation = Readonly<{
  relationId: string;
  tab?: string;
  editing?: boolean;
  selectedOnly?: boolean;
}>;
const InspectorTabs = createContext<
  | readonly [InspectorPresentation | null, Dispatch<SetStateAction<InspectorPresentation | null>>]
  | null
>(null);
const CanvasOutputPresentation = createContext({ editing: true, showExcluded: true });

export function useCanvasOutputPresentation() {
  return useContext(CanvasOutputPresentation);
}

export function CanvasOperationInspectorTabs({
  children,
  resetRevision = 0,
}: Readonly<{ children: ReactNode; resetRevision?: number }>): JSX.Element {
  const [selection, setSelection] = useState<InspectorPresentation | null>(null);
  useEffect(() => {
    setSelection((current) =>
      current == null
        ? current
        : {
            ...current,
            editing: false,
            selectedOnly: false,
          }
    );
  }, [resetRevision]);
  const value = useMemo(() => [selection, setSelection] as const, [selection]);
  return <InspectorTabs.Provider value={value}>{children}</InspectorTabs.Provider>;
}

function useInspectorPresentation(relationId: string | null | undefined) {
  const shared = useContext(InspectorTabs);
  const [local, setLocal] = useState<Omit<InspectorPresentation, 'relationId'>>({});
  const selection = shared?.[0];
  const select = shared?.[1];
  const current: Omit<InspectorPresentation, 'relationId'> =
    select == null || relationId == null
      ? local
      : selection?.relationId === relationId
        ? selection
        : {};
  const update = useCallback(
    (changes: Partial<Omit<InspectorPresentation, 'relationId'>>) => {
      if (select != null && relationId != null)
        select((previous) => ({
          ...(previous?.relationId === relationId ? previous : { relationId }),
          ...changes,
        }));
      else setLocal((previous) => ({ ...previous, ...changes }));
    },
    [select, relationId]
  );
  return [current, update] as const;
}

export function useCanvasInspectorEditing(relationId: string | null | undefined) {
  const [presentation, update] = useInspectorPresentation(relationId);
  const setEditing = useCallback(
    (editing: boolean) => update({ editing, selectedOnly: false }),
    [update]
  );
  return [presentation.editing ?? false, setEditing] as const;
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
  const [inspector, updateInspector] = useInspectorPresentation(relationId);
  const tab = inspector.tab ?? initialTab;
  const selectedOnly = inspector.selectedOnly ?? false;
  const setTab = useCallback((next: string) => updateInspector({ tab: next }), [updateInspector]);
  const outputPresentation = useMemo(
    () => ({ editing, showExcluded: editing && !selectedOnly }),
    [editing, selectedOnly]
  );
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
      className={`${inspectorVisualClasses.inspectorForm} canvas-operation-properties ${hidden ? 'hidden' : 'flex'} min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-l border-(--border-subtle) bg-(--surface-panel)`}
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-(--border-subtle) bg-(--surface-panel) px-3">
        <Icon className="size-4 text-(--status-info)" />
        <h3 className="text-xs font-semibold">{title}</h3>
        {onEdit == null ? null : (
          <button
            type="button"
            data-slot="canvas-relational-edit"
            aria-pressed={editing}
            onClick={() => {
              updateInspector({ selectedOnly: false });
              onEdit();
            }}
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
      <CanvasOutputPresentation.Provider value={outputPresentation}>
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
                {editing ? (
                  <label className="mb-2 flex items-center gap-2 text-xs text-(--text-muted)">
                    <Checkbox
                      aria-label={copy.selectedFieldsOnly}
                      checked={selectedOnly}
                      onCheckedChange={(checked) =>
                        updateInspector({ selectedOnly: checked === true })
                      }
                    />
                    {copy.selectedFieldsOnly}
                  </label>
                ) : null}
                {output}
              </TabsContent>
            )}
          </Tabs>
        </CanvasOperationExpressionHost.Provider>
      </CanvasOutputPresentation.Provider>
    </section>
  );
}

/** One transient gesture boundary; semantic decisions stay in the canonical command adapter. */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { useRelationCommand } from './useRelationCommand';
import {
  canvasRelationalFieldConsumers,
  selectCanvasRelationalField,
} from './canvasRelationalFieldSelection';
import {
  CANVAS_RELATIONAL_FIELD_DRAG_TYPE,
  readCanvasRelationalFieldDrag,
  type CanvasRelationalFieldReference,
} from './canvasRelationalTreeDrag';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { useCanvasStagedFieldConnection } from './useCanvasStagedFieldConnection';

type FieldSelectionActions = Readonly<{
  enabled: boolean;
  begin: (reference: CanvasRelationalFieldReference) => void;
  end: () => void;
  add: (reference: CanvasRelationalFieldReference, relationId: string) => void;
  remove: (reference: CanvasRelationalFieldReference) => void;
  connect: (reference: CanvasRelationalFieldReference, id: string, port: number) => void;
  backgroundDragOver: (event: DragEvent<HTMLDivElement>) => boolean;
  backgroundDrop: (event: DragEvent<HTMLDivElement>) => boolean;
}>;
const FieldSelectionContext = createContext<FieldSelectionActions | null>(null);
export const useCanvasRelationalFieldSelection = () => useContext(FieldSelectionContext);

export function CanvasRelationalFieldSelectionProvider({
  enabled,
  onChange,
  onConnect,
  children,
}: Readonly<{
  enabled: boolean;
  onChange: (document: SubstraitDocument) => void | boolean;
  onConnect?: ReturnType<typeof useCanvasStagedFieldConnection>;
  children: ReactNode;
}>) {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const copy = resolveCanvasSemanticEditorCopy(
    useApplicationLanguageStore((state) => state.language)
  );
  const active = useRef<CanvasRelationalFieldReference | null>(null);
  const connection = useRef<AbortController | null>(null);
  const [connectionState, setConnectionState] = useState<'idle' | 'busy' | 'error'>('idle');
  useEffect(() => {
    setConnectionState('idle');
    return () => {
      connection.current?.abort();
      connection.current = null;
    };
  }, [enabled]);
  const [affected, setAffected] = useState<readonly string[]>([]);
  const command = useRelationCommand('', (document) => {
    if (document !== analysis?.document) return onChange(document);
  });
  const editable =
    enabled &&
    analysis?.document != null &&
    analysis.error == null &&
    command.state !== 'busy' &&
    connectionState !== 'busy';
  const isActive = (reference: CanvasRelationalFieldReference) =>
    active.current?.fieldId === reference.fieldId &&
    active.current.revision === reference.revision &&
    active.current.rootId === reference.rootId &&
    active.current.relationId === reference.relationId;
  const edit = (
    reference: CanvasRelationalFieldReference,
    target: Parameters<typeof selectCanvasRelationalField>[2]
  ) => {
    if (!editable) return;
    setAffected([]);
    void command.executeAt(
      target.kind === 'remove' ? reference.relationId : target.relationId,
      async (session, request) => {
        const consumers =
          target.kind === 'remove' ? canvasRelationalFieldConsumers(session, reference) : [];
        try {
          return (
            (await selectCanvasRelationalField(session, reference, target, request.signal)) ??
            analysis.document!
          );
        } catch (error) {
          if (!request.signal.aborted) setAffected(consumers);
          throw error;
        }
      }
    );
  };
  const background = (event: DragEvent<HTMLDivElement>) => {
    const view = event.currentTarget.ownerDocument.defaultView;
    if (view == null || !(event.target instanceof view.Element)) return false;
    const control = event.target.closest(
      '[data-slot="canvas-relational-card"], button, input, textarea, [role="button"]'
    );
    return control == null || !event.currentTarget.contains(control);
  };
  const actions: FieldSelectionActions = {
    enabled: editable,
    begin: (reference) => {
      active.current = reference;
    },
    end: () => {
      active.current = null;
    },
    add: (reference, relationId) => edit(reference, { kind: 'add', relationId }),
    remove: (reference) => edit(reference, { kind: 'remove' }),
    connect: (reference, id, port) => {
      if (!editable || connection.current != null || !isActive(reference)) return;
      const controller = new AbortController();
      connection.current = controller;
      setAffected([]);
      setConnectionState('busy');
      void (onConnect?.(reference, id, port, controller.signal) ?? Promise.resolve(false))
        .then((accepted) => {
          if (!controller.signal.aborted) setConnectionState(accepted ? 'idle' : 'error');
        })
        .catch(() => {
          if (!controller.signal.aborted) setConnectionState('error');
        })
        .finally(() => {
          if (connection.current === controller) connection.current = null;
        });
      active.current = null;
    },
    backgroundDragOver: (event) => {
      if (!event.dataTransfer.types.includes(CANVAS_RELATIONAL_FIELD_DRAG_TYPE)) return false;
      event.stopPropagation();
      if (editable && active.current?.selectedOutput === true && background(event)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }
      return true;
    },
    backgroundDrop: (event) => {
      if (!event.dataTransfer.types.includes(CANVAS_RELATIONAL_FIELD_DRAG_TYPE)) return false;
      event.stopPropagation();
      const reference = readCanvasRelationalFieldDrag(event.dataTransfer);
      if (
        editable &&
        reference?.selectedOutput === true &&
        background(event) &&
        isActive(reference)
      ) {
        event.preventDefault();
        edit(reference, { kind: 'remove' });
      }
      active.current = null;
      return true;
    },
  };
  return (
    <FieldSelectionContext.Provider value={actions}>
      {children}
      {command.state === 'error' || connectionState === 'error' ? (
        <div
          role="alert"
          data-slot="canvas-field-selection-error"
          className="pointer-events-none absolute bottom-16 left-3 z-20 max-w-sm rounded border border-(--status-danger) bg-(--surface-panel) p-3 text-sm"
        >
          <p>{copy.fieldSelectionRejected}</p>
          {affected.length > 0 ? (
            <p>
              {copy.fieldSelectionDependencies}: {affected.join(', ')}
            </p>
          ) : null}
        </div>
      ) : null}
    </FieldSelectionContext.Provider>
  );
}

/** Compose canonical condition presentation with a controlled, discardable edit. */
import { Plus } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from 'react';
import { Button } from '../../components/ui/button';
import {
  dvtSubstraitJoinConditionKey,
  type DvtSubstraitJoinPredicateCondition,
} from './canvasDvtSubstraitJoinCondition';
import {
  dvtSubstraitJoinOperandKey,
  resolveDvtSubstraitJoinUnaryFunctions,
  type DvtSubstraitJoinPredicateOperand,
} from './canvasDvtSubstraitJoinOperand';
import { projectSemanticWorkbenchJoinConditionRows } from './join-condition/conditionRows';
import {
  conditionFromDraft,
  editConditionDraft,
  newConditionDraft,
  type ConditionDraft,
  type ConditionFieldOption,
  type Comparison,
  type ComparisonRow,
} from './join-condition/conditionDraft';
import { JoinConditionForm } from './join-condition/JoinConditionForm';
import { JoinConditionList } from './join-condition/JoinConditionList';

type ConditionEdit = Readonly<{
  conditionKey: string | null;
  condition: Comparison | null;
  groupWithPrevious: boolean;
}>;
type Props = Readonly<{
  renderExpression?: (
    edit: ConditionEdit | null,
    onSelect: (index: number, operand?: 'left' | 'right') => void
  ) => ReactNode;
  draft: ConditionDraft | null;
  onDraftChange: Dispatch<SetStateAction<ConditionDraft | null>>;
  fields: readonly ConditionFieldOption[];
  conditions: readonly DvtSubstraitJoinPredicateCondition[];
  onAdd: (condition: Comparison, groupWithPrevious: boolean) => Promise<boolean>;
  onUpdate: (key: string, condition: Comparison) => Promise<boolean>;
  onRemove: (key: string) => Promise<boolean>;
}>;
const operandKey = (operand: DvtSubstraitJoinPredicateOperand) =>
  dvtSubstraitJoinOperandKey(operand, (field) => field.sourceFieldId);

export function hasPendingConditionDraft(draft: ConditionDraft | null): boolean {
  const condition = conditionFromDraft(draft);
  return (
    draft != null &&
    (condition == null ||
      draft.conditionKey == null ||
      dvtSubstraitJoinConditionKey(condition, operandKey) !== draft.conditionKey)
  );
}

export function SemanticWorkbenchJoinConditionEditor(props: Props) {
  const { draft, onDraftChange: setDraft } = props;
  const editorRef = useRef<HTMLDivElement>(null);
  const automaticallyOpened = useRef(false);
  const rows = useMemo(
    () =>
      projectSemanticWorkbenchJoinConditionRows({
        conditions: props.conditions,
        fieldLabelById: new Map(props.fields.map((field) => [field.fieldId, field.label])),
        functionNameById: new Map(
          [...new Set(props.fields.map((field) => field.dataType))].flatMap((dataType) =>
            resolveDvtSubstraitJoinUnaryFunctions({ dataType, provider: 'postgres' }).map(
              (fn) => [fn.capabilityId, fn.name] as const
            )
          )
        ),
      }),
    [props.conditions, props.fields]
  );
  const condition = conditionFromDraft(draft);
  const editing = hasPendingConditionDraft(draft);
  const edit = (row: ComparisonRow) => setDraft(editConditionDraft(props.fields, row));
  useEffect(() => {
    if (props.renderExpression == null || automaticallyOpened.current) return;
    if (draft != null) {
      automaticallyOpened.current = true;
      return;
    }
    const row = rows.find((item) => item.kind === 'comparison');
    if (row?.kind !== 'comparison') return;
    automaticallyOpened.current = true;
    edit(row);
  });
  const save = async () => {
    if (draft == null || condition == null) return;
    const saved =
      draft.conditionKey == null
        ? await props.onAdd(condition, draft.groupWithPrevious)
        : await props.onUpdate(draft.conditionKey, condition);
    if (saved) setDraft((current) => (current === draft ? null : current));
  };
  return (
    <div
      className={
        props.renderExpression == null
          ? undefined
          : 'canvas-operation-editors grid min-h-0 min-w-0 gap-3'
      }
    >
      {props.renderExpression?.(
        draft == null
          ? null
          : {
              conditionKey: draft.conditionKey,
              condition,
              groupWithPrevious: draft.groupWithPrevious,
            },
        (index, operand) => {
          const row = rows.filter((item) => item.kind === 'comparison')[index];
          if (row?.kind !== 'comparison') return;
          if (row.conditionKey !== draft?.conditionKey) {
            if (editing) return;
            edit(row);
          }
          requestAnimationFrame(() => {
            const selector =
              operand == null
                ? '[aria-label="Comparador de la condición"]'
                : `[data-slot="semantic-workbench-join-${operand === 'left' ? 'izquierdo' : 'derecho'}-operand"] select`;
            editorRef.current
              ?.querySelector<HTMLSelectElement>(selector)
              ?.focus({ preventScroll: true });
          });
        }
      )}
      <div
        ref={editorRef}
        data-slot="semantic-workbench-join-condition-list"
        className="mt-1 min-h-0 overflow-auto pr-1"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-(--text-muted)">CONDICIONES DEL JOIN</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Añadir condición"
            title="Añadir condición"
            onClick={() => setDraft(newConditionDraft(props.fields))}
          >
            <Plus size={13} aria-hidden />
          </Button>
        </div>
        <JoinConditionList
          rows={rows}
          activeKey={draft?.conditionKey ?? null}
          onEdit={edit}
          onRemove={(key) => {
            void props.onRemove(key).then((saved) => {
              if (saved) setDraft((current) => (current?.conditionKey === key ? null : current));
            });
          }}
        />
        {draft == null ? null : (
          <JoinConditionForm
            draft={draft}
            fields={props.fields}
            hasConditions={props.conditions.length > 0}
            canApply={condition != null}
            onChange={setDraft}
            onClose={() => setDraft(null)}
            onSave={() => {
              void save();
            }}
          />
        )}
      </div>
    </div>
  );
}

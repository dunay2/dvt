/** Projects canonical destination drafts into bounded, passive form bindings. */
import {
  DVT_TRANSFORM_MATERIALIZATIONS,
  type ConnectionRef,
  type DvtPostgresRelationTargetV1,
} from '@dvt/contracts';
import type { Dispatch, SetStateAction } from 'react';
import type { CanvasViewCopy } from './canvasCopy.types';
import type {
  DvtNodeAuthoringMetadata,
  DvtNodeAuthoringMetadataErrors,
  DvtSinkAuthoringMetadata,
} from './canvasDvtAuthoringTypes';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import type { CanvasInspectorNodeDraftErrorCode } from './canvasInspectorAuthoringErrorCodes';
import { withDvtTransformMaterialization } from './canvasDvtMaterializationPolicy';

type DestinationDraft = Readonly<{
  connectionRef?: ConnectionRef;
  schema: string;
  relation: string;
}>;
type DraftChange = Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
type TransformDraft = Extract<DvtNodeAuthoringMetadata, { kind: 'transform' }>;
type DestinationArgs = Readonly<{
  target: DestinationDraft | null | undefined;
  connection: ConnectionRef | undefined;
  disabled: boolean;
  errors?: DvtNodeAuthoringMetadataErrors;
  onChange(target: DestinationDraft | null): void;
}>;

export interface DvtDestinationBinding {
  readonly model: Readonly<{
    connectionId: string;
    connections: readonly DvtPostgresRelationTargetV1['connectionRef'][];
    schema: string;
    relation: string;
    showNames: boolean;
    disabled: boolean;
    errors: DvtNodeAuthoringMetadataErrors | undefined;
  }>;
  setConnection(value: string): void;
  setSchema(value: string): void;
  setRelation(value: string): void;
}

export interface DvtDestinationChoiceBinding {
  readonly value: string;
  readonly options: readonly Readonly<{ value: string; label: string; disabled?: boolean }>[];
  readonly disabled: boolean;
  readonly error?: CanvasInspectorNodeDraftErrorCode;
  setValue(value: string): void;
}

export interface DvtSinkAuthoringBinding {
  readonly destination: DvtDestinationBinding;
  readonly qualifiedTarget: string;
  readonly materialization: DvtDestinationChoiceBinding;
  readonly writeMode: DvtDestinationChoiceBinding;
}

export function createDvtDestinationBinding(args: DestinationArgs): DvtDestinationBinding {
  const { target, disabled, onChange } = args;
  const connections: DvtPostgresRelationTargetV1['connectionRef'][] = [];
  for (const connection of [target?.connectionRef, args.connection]) {
    if (
      connection?.provider === 'postgres' &&
      !connections.some((item) => item.connectionId === connection.connectionId)
    ) {
      connections.push({ ...connection, provider: 'postgres' });
    }
  }
  const updateName = (field: 'schema' | 'relation', value: string): void => {
    if (!disabled && target != null) onChange({ ...target, [field]: value });
  };
  return {
    model: {
      connectionId: target?.connectionRef?.connectionId ?? '',
      connections,
      schema: target?.schema ?? '',
      relation: target?.relation ?? '',
      showNames: target != null,
      disabled,
      errors: args.errors,
    },
    setConnection(value) {
      if (disabled) return;
      if (value === '') {
        onChange(null);
        return;
      }
      const connectionRef = connections.find((item) => item.connectionId === value);
      if (connectionRef !== undefined)
        onChange({ connectionRef, schema: target?.schema ?? '', relation: target?.relation ?? '' });
    },
    setSchema: (value) => updateName('schema', value),
    setRelation: (value) => updateName('relation', value),
  };
}

type TransformBindingArgs = Readonly<{
  draft: TransformDraft;
  disabled: boolean;
  errors?: DvtNodeAuthoringMetadataErrors;
  copy: CanvasViewCopy;
  onChange: DraftChange;
}>;

export function createDvtTransformMaterializationBinding(
  args: TransformBindingArgs
): DvtDestinationChoiceBinding {
  const labels = {
    view: args.copy.inspectorDvtMaterializationViewLabel,
    table: args.copy.inspectorDvtMaterializationTableLabel,
    ephemeral: args.copy.inspectorDvtMaterializationEphemeralLabel,
  };
  return {
    value: args.draft.materialized,
    options: DVT_TRANSFORM_MATERIALIZATIONS.map((value) => ({ value, label: labels[value] })),
    disabled: args.disabled,
    error: args.errors?.materialization,
    setValue(value) {
      if (args.disabled || !DVT_TRANSFORM_MATERIALIZATIONS.some((mode) => mode === value)) return;
      args.onChange((current) =>
        current.dvt?.kind !== 'transform'
          ? current
          : {
              ...current,
              dvt: withDvtTransformMaterialization(current.dvt, value),
            }
      );
    },
  };
}

export function createDvtTransformDestinationBinding(
  args: Omit<TransformBindingArgs, 'copy'> & { readonly connection: ConnectionRef | undefined }
): DvtDestinationBinding {
  return createDvtDestinationBinding({
    target: args.draft.resultTarget,
    connection: args.connection,
    disabled: args.disabled,
    errors: args.errors,
    onChange: (target) =>
      args.onChange((current) =>
        current.dvt?.kind !== 'transform'
          ? current
          : {
              ...current,
              dvt: {
                ...current.dvt,
                resultTarget:
                  target?.connectionRef?.provider === 'postgres'
                    ? {
                        schemaVersion: 'dvt-transform-result-target.v1',
                        ...target,
                        connectionRef: { ...target.connectionRef, provider: 'postgres' },
                      }
                    : null,
              },
            }
      ),
  });
}

export function createDvtSinkAuthoringBinding(
  args: Readonly<{
    draft: DvtSinkAuthoringMetadata;
    connection: ConnectionRef | undefined;
    disabled: boolean;
    errors?: DvtNodeAuthoringMetadataErrors;
    copy: CanvasViewCopy;
    onChange: DraftChange;
  }>
): DvtSinkAuthoringBinding {
  const update = (patch: Partial<DvtSinkAuthoringMetadata>): void =>
    args.onChange((current) =>
      current.dvt?.kind !== 'sink' ? current : { ...current, dvt: { ...current.dvt, ...patch } }
    );
  const choice = (
    field: 'materialization' | 'writeMode',
    value: string,
    label: string
  ): DvtDestinationChoiceBinding => ({
    value: args.draft[field],
    disabled: args.disabled,
    error: args.errors?.[field],
    options: [
      { value, label },
      ...(args.draft[field] === value
        ? []
        : [{ value: args.draft[field], label: args.draft[field], disabled: true }]),
    ],
    setValue: (selected) => {
      if (!args.disabled && selected === value) update({ [field]: selected });
    },
  });
  return {
    qualifiedTarget: `${args.draft.schema}.${args.draft.table}`,
    destination: createDvtDestinationBinding({
      target: {
        schema: args.draft.schema,
        relation: args.draft.table,
        ...(args.draft.connectionRef == null ? {} : { connectionRef: args.draft.connectionRef }),
      },
      connection: args.connection,
      disabled: args.disabled,
      errors: args.errors,
      onChange: (target) =>
        update(
          target === null
            ? { connectionRef: null }
            : { connectionRef: target.connectionRef, schema: target.schema, table: target.relation }
        ),
    }),
    materialization: choice(
      'materialization',
      'table',
      args.copy.inspectorDvtMaterializationTableLabel
    ),
    writeMode: choice('writeMode', 'replace', args.copy.inspectorDvtWriteModeReplaceLabel),
  };
}

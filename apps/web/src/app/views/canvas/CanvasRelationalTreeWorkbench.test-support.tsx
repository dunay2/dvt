import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach } from 'vitest';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import type { ConnectedSourceRef } from '@dvt/contracts';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { setupOperationMenuDom } from './operation-menu/operationMenu.test-support';

export const COPY = {
  ...resolveCanvasViewCopy('en'),
  inspectorDbtOriginLabel: 'Input',
  inspectorDvtRelationalLeftInput: 'Left input',
  inspectorDvtRelationalRightInput: 'Right input',
  nodePresentationColumnsLabel: 'Columns',
  reactFlowFitViewLabel: 'Fit view',
  reactFlowZoomInLabel: 'Zoom in',
  reactFlowZoomOutLabel: 'Zoom out',
  relationalTreeDetailLabel: 'Detail',
  relationalTreeInputIdentityUnavailableMessage: 'Input identity unavailable.',
  relationalTreeInvalidMessage: 'The canonical relational tree could not be read.',
  relationalTreeLabel: 'Relational tree',
  relationalTreeValidMessage: 'Valid expression',
  relationalTreeMissingLabel: 'Missing',
  relationalTreeOutputLabel: 'Output',
  relationalTreeParticipatingLabel: 'Participating',
  relationalTreePendingLabel: 'Pending',
  relationalTreePrimaryInputLabel: 'Primary input',
  relationalTreeReadOnlyMessage: 'Inspection only.',
  relationalTreeSecondaryInputTemplate: 'Secondary input {ordinal}',
  relationalTreeSourcesLabel: 'Sources',
  relationalTreeUnavailableMessage: 'No canonical relational tree is available.',
  relationalTreeSelectFirstSourceMessage: 'Select the first Source.',
  relationalTreeSelectOperationMessage: 'Select a relational operation.',
  relationalTreeSelectNextSourceMessage: 'Select the next Source.',
  relationalTreeSelectedInputsLabel: 'Selected inputs',
  relationalTreeCanvasLabel: 'Relation canvas',
  relationalTreePrimarySlotLabel: 'Primary slot',
  relationalTreeSecondarySlotLabel: 'Secondary slot',
  relationalTreeDropSourceMessage: 'Drop a Source here.',
  relationalTreeComposeAction: 'Compose relation',
  relationalTreePendingInputsMessage: 'Inputs available',
  relationalTreeSourceActionHint: 'Drag or press to add',
  relationalTreeProjectOperationLabel: 'PROJECT',
  relationalTreeExpressionStageLabel: 'EXPRESSION / DERIVE',
  relationalTreeExpressionStageSummaryTemplate: 'Derived: {derived} · Passthrough: {passthrough}',
  inspectorDvtRelationalOperationTitle: 'Relate / compose',
  inspectorDvtRelationalAvailable: 'Available',
  inspectorDvtRelationalNeedsPredicate: 'Needs predicate',
  inspectorDvtRelationalNeedsSchemaAlignment: 'Needs schema alignment',
  inspectorDvtRelationalTargetUnavailable: 'Target unavailable',
  inspectorDvtRelationalUnavailable: 'Unavailable',
  inspectorDvtRelationalReadOnly: 'Read only',
  inspectorDvtSubstraitInnerJoinAction: 'INNER JOIN',
  inspectorDvtSubstraitLeftJoinAction: 'LEFT JOIN',
  inspectorDvtSubstraitRightJoinAction: 'RIGHT JOIN',
  inspectorDvtSubstraitFullOuterJoinAction: 'FULL OUTER JOIN',
  inspectorDvtSubstraitLeftSemiJoinAction: 'LEFT SEMI JOIN',
  inspectorDvtSubstraitLeftAntiJoinAction: 'LEFT ANTI JOIN',
  inspectorDvtSubstraitRightSemiJoinAction: 'RIGHT SEMI JOIN',
  inspectorDvtSubstraitRightAntiJoinAction: 'RIGHT ANTI JOIN',
  inspectorDvtSubstraitCrossJoinAction: 'CROSS JOIN',
  inspectorDvtSubstraitJoinTypeLabel: 'Join type',
  inspectorDvtSubstraitJoinTypeImpactHint:
    'Types that would remove selected columns are unavailable.',
  inspectorDvtSubstraitLeftJoinRolesHint: 'L preserved · R nullable',
  inspectorDvtSubstraitRightJoinRolesHint: 'L nullable · R preserved',
  inspectorDvtSubstraitFullOuterJoinRolesHint: 'L nullable · R nullable',
  inspectorDvtSubstraitLeftFilteringJoinRolesHint: 'L retained · R queried',
  inspectorDvtSubstraitRightFilteringJoinRolesHint: 'L queried · R retained',
  inspectorDvtSubstraitAppendInputAction: 'Add input',
  inspectorDvtSubstraitAppendInputTitle: 'Add connected input',
  inspectorDvtSubstraitConnectedFieldLabel: 'Connected field',
  inspectorDvtSubstraitExistingFieldLabel: 'Existing field',
  inspectorDvtSubstraitUnionAllAction: 'UNION ALL',
  inspectorDvtSubstraitUnionDistinctAction: 'UNION DISTINCT',
  inspectorDvtSubstraitIntersectDistinctAction: 'INTERSECT',
  inspectorDvtSubstraitExceptDistinctAction: 'EXCEPT',
  inspectorDvtSubstraitIntersectAllAction: 'INTERSECT ALL',
  inspectorDvtSubstraitExceptAllAction: 'EXCEPT ALL',
  inspectorDvtRelationalApply: 'Apply',
  inspectorDvtRelationalCancel: 'Cancel',
};

export function sourceRef(table: string): ConnectedSourceRef {
  return {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse-main',
      provider: 'postgres',
    },
    sourceObjectId: `public.${table}`,
  };
}

export function sourceNode(id: string, table: string): CanonicalNode {
  return {
    id,
    name: table,
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      schema: 'public',
      tableName: table,
      connectedSourceRef: sourceRef(table),
      columns: [{ name: `${table}_id`, type: 'text' }],
    },
  };
}

export function transformNode(): CanonicalNode {
  return {
    id: 'transform',
    name: 'Orders with clients',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {},
  };
}

export function edge(sourceId: string): CanonicalEdge {
  return {
    id: `${sourceId}-transform`,
    sourceId,
    targetId: 'transform',
    relation: 'lineage',
  };
}

export let container: HTMLDivElement;
export let root: Root;

export function setupWorkbenchTest(): void {
  setupOperationMenuDom();
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
}

export function dragSourceTo(source: HTMLElement, target: HTMLElement): void {
  const values = new Map<string, string>();
  const dataTransfer = {
    effectAllowed: 'move',
    getData: (type: string) => values.get(type) ?? '',
    setData: (type: string, value: string) => values.set(type, value),
  };
  const dragStart = new Event('dragstart', { bubbles: true });
  const drop = new Event('drop', { bubbles: true });
  Object.defineProperty(dragStart, 'dataTransfer', { value: dataTransfer });
  Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
  source.dispatchEvent(dragStart);
  target.dispatchEvent(drop);
  source.dispatchEvent(new Event('dragend', { bubbles: true }));
}

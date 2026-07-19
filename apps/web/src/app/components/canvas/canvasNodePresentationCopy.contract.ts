/** Owned concern: define and validate localized copy consumed by node presentation adapters. */
export type CanvasNodePresentationCopy = Readonly<{
  columnsLabel: string;
  declaredColumnsDetailTemplate: string;
  inheritedColumnsDetailTemplate: string;
  noColumnsDetail: string;
  codeLabel: string;
  workspaceCodeDetailTemplate: string;
  generatedCodeDetailTemplate: string;
  codeUnavailableMessage: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isCanvasNodePresentationCopy(value: unknown): value is CanvasNodePresentationCopy {
  return (
    isRecord(value) &&
    typeof value.columnsLabel === 'string' &&
    typeof value.declaredColumnsDetailTemplate === 'string' &&
    typeof value.inheritedColumnsDetailTemplate === 'string' &&
    typeof value.noColumnsDetail === 'string' &&
    typeof value.codeLabel === 'string' &&
    typeof value.workspaceCodeDetailTemplate === 'string' &&
    typeof value.generatedCodeDetailTemplate === 'string' &&
    typeof value.codeUnavailableMessage === 'string'
  );
}

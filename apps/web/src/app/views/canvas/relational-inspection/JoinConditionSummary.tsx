/** Applied condition presentation uses the same rows as the explicit JOIN editor. */
import { useMemo } from 'react';
import type { CanonicalNode } from '../../../types/canonical';
import { useSelectedJoin } from '../useSelectedJoin';
import { joinConditionRows } from '../join-condition/conditionRows';
import { JoinConditionList } from '../join-condition/JoinConditionList';
import { CanvasRelationalExpressionTree } from '../CanvasRelationalExpressionTree';

export function JoinConditionSummary({
  relationId,
  transformNode,
}: Readonly<{
  relationId: string;
  transformNode: CanonicalNode;
}>) {
  const selected = useSelectedJoin(relationId);
  const rows = useMemo(
    () =>
      selected?.conditions == null ? null : joinConditionRows(selected.conditions, selected.fields),
    [selected]
  );
  return (
    <section className="mb-4">
      <h3 className="text-xs font-semibold text-(--text-muted)">CONDICIONES DEL JOIN</h3>
      {rows == null ? null : <JoinConditionList rows={rows} />}
      <CanvasRelationalExpressionTree
        transformNode={transformNode}
        relationId={relationId}
        showSummary={rows == null}
      />
    </section>
  );
}

/** Passive topology detail; selection and ordering belong to the relationship controller. */
import { NodePropertyFacts } from './NodePropertyFacts';
import {
  inspectorRelationshipClasses as styles,
  inspectorVisualClasses,
} from './inspectorVisualTokens';
import type { SourceRelationship } from './nodePropertyTopologyRows';
import type { sourceRelationshipsCopyEn } from './sourceRelationshipsCopy.en';

function TopologyNode({ name, caption }: Readonly<{ name: string; caption: string }>): JSX.Element {
  return (
    <div className={styles.node}>
      <p className={styles.nodeName}>{name}</p>
      <p className={styles.nodeCaption}>{caption}</p>
    </div>
  );
}

export function SourceRelationshipDetail({
  selected,
  nodeName,
  copy,
}: Readonly<{
  selected: SourceRelationship | null;
  nodeName: string;
  copy: typeof sourceRelationshipsCopyEn;
}>): JSX.Element {
  const outgoing = selected?.direction === 'output';
  const from = outgoing ? nodeName : (selected?.relatedNodeName ?? '');
  const to = outgoing ? selected.relatedNodeName : nodeName;
  return (
    <section data-slot="source-relationship-detail" className={styles.detail}>
      {selected == null ? (
        <p className={inspectorVisualClasses.inspectorSubtle}>{copy.noConnections}</p>
      ) : (
        <div className={styles.detailBody}>
          <div className={styles.detailHeader}>
            <h3 className={styles.detailTitle}>{selected.relatedNodeName}</h3>
            <span className={styles.caption}>
              {outgoing ? copy.selectedOutput : copy.selectedInput}
            </span>
          </div>
          <div className={styles.topology}>
            <TopologyNode
              name={from}
              caption={outgoing ? copy.currentSource : copy.connectedNode}
            />
            <span aria-hidden="true" className={styles.arrow}>
              →
            </span>
            <TopologyNode name={to} caption={outgoing ? copy.connectedNode : copy.currentSource} />
          </div>
          <NodePropertyFacts
            layout="relationship"
            rows={[
              { label: copy.direction, value: outgoing ? copy.outgoing : copy.incoming },
              { label: copy.from, value: from },
              { label: copy.to, value: to },
              { label: copy.relation, value: selected.relation },
            ]}
          />
        </div>
      )}
    </section>
  );
}

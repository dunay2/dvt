/** Present one pending occurrence using the shared Source form and caller-owned Output adapter. */
import type { ReactNode } from 'react';
import type { PendingSourceOccurrence } from './pendingSourceOccurrence';
import { SourceOccurrencePropertiesForm } from './SourceOccurrencePropertiesForm';

export function PendingSourceOccurrenceProperties({
  occurrence,
  occupied,
  actions,
  onPendingChange,
  output,
}: Readonly<{
  occurrence: PendingSourceOccurrence;
  occupied: ReadonlySet<string>;
  actions: Readonly<{ rename: (alias: string) => boolean; close: () => void }>;
  onPendingChange: (pending: boolean) => void;
  output: (editing: boolean) => ReactNode;
}>): JSX.Element {
  const { read } = occurrence;
  return (
    <SourceOccurrencePropertiesForm
      data={{
        relationId: read.binding.relationId,
        alias: read.binding.displayName,
        occupied,
        supported: true,
      }}
      actions={{ save: actions.rename, close: actions.close }}
      onPendingChange={onPendingChange}
      output={output}
    />
  );
}

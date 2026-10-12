/**
 * Owned concern: bind the shared bounded preview grid to local presentation and copy.
 * @baseline ADR-0044: Diagnostic prose is not a semantic contract.
 * @decision Reuse TanStack and the existing protected sample; never query from this view.
 * @consequence Sources and operations share one grid, passive template and stylesheet.
 * @version 1.0.0
 */
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { OperationalDrawerDataTableTemplate } from './OperationalDrawerDataTableTemplate';
import { operationalDrawerDataTableCopy } from './operationalDrawerDataTableCopy';
import {
  useOperationalDrawerDataTable,
  type OperationalDrawerDataTableInput,
} from './useOperationalDrawerDataTable';

export function OperationalDrawerDataTable(props: OperationalDrawerDataTableInput): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const model = useOperationalDrawerDataTable(props);
  return (
    <OperationalDrawerDataTableTemplate
      model={model}
      copy={operationalDrawerDataTableCopy[language]}
    />
  );
}

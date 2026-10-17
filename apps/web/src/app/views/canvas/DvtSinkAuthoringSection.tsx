/** Passive explicit Sink destination and publication-policy presentation. */
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { DvtSinkAuthoringBinding } from './dvtDestinationBinding';
import {
  DvtPostgresDestinationFields,
  DvtDestinationChoiceField,
} from './DvtPostgresDestinationFields';
import type { CanvasViewCopy } from './canvasCopy.types';
import styles from './dvtDestinationFields.module.css';

export function DvtSinkAuthoringSection({
  binding,
  copy,
}: Readonly<{ binding: DvtSinkAuthoringBinding; copy: CanvasViewCopy }>): JSX.Element {
  return (
    <div className={styles.stack}>
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {copy.inspectorDvtSinkTitle}
      </h3>
      <code className={styles.target}>{binding.qualifiedTarget}</code>
      <DvtPostgresDestinationFields
        binding={binding.destination}
        namespace="dvt-sink"
        copy={copy}
      />
      <DvtDestinationChoiceField
        binding={binding.materialization}
        name="dvt-sink-materialization"
        label={copy.inspectorDvtMaterializationLabel}
        copy={copy}
      />
      <DvtDestinationChoiceField
        binding={binding.writeMode}
        name="dvt-sink-write-mode"
        label={copy.inspectorDvtWriteModeLabel}
        copy={copy}
      />
    </div>
  );
}

/** Owned concern: render bounded PostgreSQL staging-target fields. */
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { canvasViewCopy } from '../../views/canvas/copy';
import { ObjectFilePostgresFieldError } from './ObjectFilePostgresFieldError';
import type { ObjectFilePostgresSectionProps } from './objectFilePostgresAuthoringFields.types';
import { objectFilePostgresAuthoringClasses as classes } from './objectFilePostgresAuthoringVisualTokens';

export function ObjectFilePostgresTargetFields({
  nodeId,
  disabled,
  draft,
  errors,
  onChange,
}: ObjectFilePostgresSectionProps): JSX.Element {
  const update = (patch: Partial<typeof draft>): void => onChange({ ...draft, ...patch });

  return (
    <section className={classes.separatedSection}>
      <div>
        <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
          {canvasViewCopy.inspectorObjectFileTargetTitle}
        </h3>
        <p className={inspectorVisualClasses.inspectorBody}>
          {canvasViewCopy.inspectorObjectFileTargetSummary}
        </p>
      </div>
      <div className={classes.field}>
        <Label htmlFor={`${nodeId}-target-relation`}>
          {canvasViewCopy.inspectorObjectFileTargetRelationLabel}
        </Label>
        <Input
          id={`${nodeId}-target-relation`}
          value={draft.targetRelation}
          disabled={disabled}
          aria-invalid={errors?.targetRelation ? 'true' : undefined}
          onChange={(event) => update({ targetRelation: event.target.value })}
        />
        <ObjectFilePostgresFieldError code={errors?.targetRelation} />
      </div>
      <div className={classes.field}>
        <Label htmlFor={`${nodeId}-target-credential`}>
          {canvasViewCopy.inspectorObjectFileTargetCredentialLabel}
        </Label>
        <Input
          id={`${nodeId}-target-credential`}
          value={draft.targetCredentialRef}
          disabled={disabled}
          aria-invalid={errors?.targetCredentialRef ? 'true' : undefined}
          onChange={(event) => update({ targetCredentialRef: event.target.value })}
        />
        <ObjectFilePostgresFieldError code={errors?.targetCredentialRef} />
      </div>
    </section>
  );
}

/** Owned concern: compose object-file source, target, and mapping presentation sections. */
import { ObjectFilePostgresColumnFields } from './ObjectFilePostgresColumnFields';
import { ObjectFilePostgresSourceFields } from './ObjectFilePostgresSourceFields';
import { ObjectFilePostgresTargetFields } from './ObjectFilePostgresTargetFields';
import type { ObjectFilePostgresAuthoringFieldsProps } from './objectFilePostgresAuthoringFields.types';
import { objectFilePostgresAuthoringClasses as classes } from './objectFilePostgresAuthoringVisualTokens';

export function ObjectFilePostgresAuthoringFields(
  props: ObjectFilePostgresAuthoringFieldsProps
): JSX.Element {
  return (
    <div data-slot="object-file-postgres-authoring" className={classes.root}>
      <ObjectFilePostgresSourceFields {...props} />
      <ObjectFilePostgresTargetFields {...props} />
      <ObjectFilePostgresColumnFields {...props} />
    </div>
  );
}

/** Owned concern: define the presentation contract for object-file PostgreSQL authoring fields. */
import type {
  ObjectFilePostgresAuthoringDraft,
  ObjectFilePostgresAuthoringErrors,
} from '../../views/canvas/objectFilePostgresAuthoringModel';

export type ObjectFilePostgresAuthoringFieldsProps = Readonly<{
  nodeId: string;
  disabled: boolean;
  draft: ObjectFilePostgresAuthoringDraft;
  errors: ObjectFilePostgresAuthoringErrors | undefined;
  onChange: (draft: ObjectFilePostgresAuthoringDraft) => void;
}>;

export type ObjectFilePostgresSectionProps = ObjectFilePostgresAuthoringFieldsProps;

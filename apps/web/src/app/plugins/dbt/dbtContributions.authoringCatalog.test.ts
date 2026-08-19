import { describe, expect, it } from 'vitest';

import { HTTP_JSON_NODE_KINDS } from '../httpJson/httpJsonNodeTypeCatalog';
import { DBT_NODE_KINDS } from '../nodeTypeCatalog.dbt';
import { OBJECT_FILE_POSTGRES_NODE_KINDS } from '../objectFilePostgres/objectFilePostgresNodeTypeCatalog';
import { dbtContributions } from './dbtContributions';

const MANUALLY_AUTHORED_DBT_KINDS = ['dbt:source', 'dbt:model', 'dbt:test'];

describe('dbt Graph Draft authoring catalog', () => {
  it('offers only supported manual dbt resources while retaining every imported renderer kind', () => {
    const canvasRegistration = dbtContributions.canvasKinds?.find(
      (registration) => registration.kind === 'dbt'
    );

    expect(canvasRegistration).toBeDefined();
    expect(
      canvasRegistration?.nodeKinds
        .filter((registration) => registration.pluginId === 'dbt')
        .map((registration) => registration.kind)
    ).toEqual(MANUALLY_AUTHORED_DBT_KINDS);
    expect(dbtContributions.nodeKinds?.map((registration) => registration.kind)).toEqual(
      DBT_NODE_KINDS.map((registration) => registration.kind)
    );
    expect(canvasRegistration?.nodeKinds).toEqual(
      expect.arrayContaining([...HTTP_JSON_NODE_KINDS, ...OBJECT_FILE_POSTGRES_NODE_KINDS])
    );
  });

  it('describes only the supported authoring choices in English and Spanish', () => {
    const canvasRegistration = dbtContributions.canvasKinds?.find(
      (registration) => registration.kind === 'dbt'
    );

    expect(canvasRegistration?.emptyState.editableMessage).toBe(
      'Start this dbt canvas by adding a governed source, model, or test.'
    );
    expect(canvasRegistration?.localizedCopy?.es?.emptyState.editableMessage).toBe(
      'Inicia este canvas añadiendo un origen, modelo o prueba gobernados.'
    );
  });
});

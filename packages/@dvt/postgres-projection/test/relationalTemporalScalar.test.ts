import { encodeDvtSubstraitPlanV1 } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { projectSubstraitToPostgresSql } from '../src/relationalSql/project.js';

import { scalarFixture, textLiteral } from './relationalScalarFixture.js';

describe('UTC year target binding', () => {
  it('retains the canonical output type and source without rewriting the document', async () => {
    const { document } = scalarFixture(true);
    const before = globalThis.structuredClone(document);
    const result = await projectSubstraitToPostgresSql(document);
    expect(result.projection.outputs).toMatchObject([{ dataType: 'i64', nullable: true }]);
    expect(result.projection.inputs[0]?.sourceRef).toEqual(
      document.sidecar.relations[0]?.sourceRef
    );
    expect(document).toEqual(before);
  });
  it.each(['component', 'timezone', 'missing', 'argument-type'] as const)(
    'rejects an unadmitted %s before emitting SQL',
    async (fault) => {
      const { document, fn } = scalarFixture(true);
      if (fault === 'component') fn.arguments[0]!.argType = { case: 'enum', value: 'MONTH' };
      if (fault === 'timezone')
        fn.arguments[2]!.argType = { case: 'value', value: textLiteral('Europe/Madrid') };
      if (fault === 'missing') fn.arguments.pop();
      if (fault === 'argument-type')
        fn.arguments[1]!.argType = { case: 'value', value: textLiteral('2026') };
      document.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(document.plan).sha256;
      await expect(projectSubstraitToPostgresSql(document)).rejects.toMatchObject({
        code: 'unsupported_shape',
      });
    }
  );
});

/** Real canonical read/aggregate document shared by unit and PostgreSQL proofs. */
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import {
  ExpressionSchema,
  RelSchema,
  type AggregateRel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  SimpleExtensionDeclarationSchema,
  SimpleExtensionURNSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/extensions/extensions_pb.js';
import {
  TypeSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';
import {
  decodeDvtSubstraitPlanV1,
  encodeDvtSubstraitPlanV1,
  DvtSubstraitSemanticDocumentV1Schema,
} from '@dvt/contracts';
import type { SubstraitDocument } from '@dvt/substrait-analysis';

import { createSumFunction } from '../src/substraitSumFunction.js';

export function sumFixture(kind: 'i64' | 'fp64'): {
  document: SubstraitDocument;
  aggregate: AggregateRel;
  refresh: () => void;
} {
  const encoded = DvtSubstraitSemanticDocumentV1Schema.parse(
    JSON.parse(
      readFileSync(new URL('./fixtures/scalar-documents.json', import.meta.url), 'utf8')
    )[1]
  );
  const document = { plan: decodeDvtSubstraitPlanV1(encoded), sidecar: encoded.sidecar };
  const root = document.plan.relations[0]!.relType;
  if (root.case !== 'root' || root.value.input?.relType.case !== 'project')
    throw new Error('Expected Project');
  const input = root.value.input.relType.value.input!;
  if (input.relType.case !== 'read' || input.relType.value.readType.case !== 'namedTable')
    throw new Error('Expected Read');
  const type = create(TypeSchema, {
    kind: { case: kind, value: { nullability: Type_Nullability.NULLABLE } },
  });
  input.relType.value.baseSchema!.struct!.types = [type];
  input.relType.value.readType.value.names = ['pg_temp', 'sum_items'];
  document.plan.extensionUrns.push(
    create(SimpleExtensionURNSchema, {
      extensionUrnAnchor: 10,
      urn: 'extension:io.substrait:functions_arithmetic',
    })
  );
  document.plan.extensions.push(
    create(SimpleExtensionDeclarationSchema, {
      mappingType: {
        case: 'extensionFunction',
        value: { extensionUrnReference: 10, functionAnchor: 10, name: `sum:${kind}` },
      },
    })
  );
  const operand = create(ExpressionSchema, {
    rexType: {
      case: 'selection',
      value: {
        referenceType: {
          case: 'directReference',
          value: { referenceType: { case: 'structField', value: { field: 0 } } },
        },
        rootType: { case: 'rootReference', value: {} },
      },
    },
  });
  const measure = createSumFunction(10, operand, type);
  root.value.input = create(RelSchema, {
    relType: {
      case: 'aggregate',
      value: {
        common: { relAnchor: 2 },
        input,
        groupings: [{ expressionReferences: [] }],
        measures: [{ measure }],
      },
    },
  });
  const refresh = (): void => {
    document.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(document.plan).sha256;
  };
  refresh();
  if (root.value.input.relType.case !== 'aggregate') throw new Error('Expected Aggregate');
  return { document, aggregate: root.value.input.relType.value, refresh };
}

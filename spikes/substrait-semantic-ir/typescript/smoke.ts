import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { PlanSchema } from './generated/substrait/plan_pb.js';

const plan = create(PlanSchema, {
  version: {
    majorNumber: 0,
    minorNumber: 99,
    patchNumber: 0,
    producer: 'dvt-substrait-typescript-spike',
  },
});

const bytes = toBinary(PlanSchema, plan);
const decoded = fromBinary(PlanSchema, bytes);

if (decoded.version?.minorNumber !== 99) {
  throw new Error('Generated Substrait TypeScript binding failed binary roundtrip.');
}

console.log(
  JSON.stringify({
    binaryBytes: bytes.byteLength,
    producer: decoded.version?.producer,
    version: `${decoded.version?.majorNumber}.${decoded.version?.minorNumber}.${decoded.version?.patchNumber}`,
  })
);

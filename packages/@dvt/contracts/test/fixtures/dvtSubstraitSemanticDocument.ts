import {
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  DVT_SUBSTRAIT_PLAN_ENCODING,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  type DvtSubstraitSemanticDocumentV1,
} from '../../src/substrait.js';

const PLAN_BYTES_BASE64 =
  'GnQScgpaOlgKCRIFCgMDAQIoAhJBCj8KAigBEiwKBG5hbWUKBWVtYWlsCgdjb3VudHJ5EhQKBGICEAEKBGICEAEKBGICEAEYAjoLCgljdXN0b21lcnMaCBIGCgISACIAEgRuYW1lEgVlbWFpbBIHY291bnRyeTIXEGUqE2R2dC12dHgyLWNhcmQtcGlsb3Q=';
const PLAN_SHA256 = '69252aee277c67b76620f3113ed17230f89d41c5a752ead85afce305be765203';

export function buildDvtSubstraitSemanticDocumentFixture(): DvtSubstraitSemanticDocumentV1 {
  return {
    schemaVersion: DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
    profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
    semanticPlan: {
      encoding: DVT_SUBSTRAIT_PLAN_ENCODING,
      bytesBase64: PLAN_BYTES_BASE64,
      sha256: PLAN_SHA256,
    },
    sidecar: {
      schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
      semanticPlanSha256: PLAN_SHA256,
      relations: [
        { relationId: 'relation:source-node', relAnchor: 1, displayName: 'customers' },
        {
          relationId: 'relation:transform-node:project',
          relAnchor: 2,
          displayName: 'customers',
        },
      ],
      fields: ['name', 'email', 'country'].map((displayName, outputOrdinal) => ({
        fieldId: `field:transform-node:${displayName}`,
        relationId: 'relation:transform-node:project',
        outputOrdinal,
        displayName,
      })),
    },
  };
}

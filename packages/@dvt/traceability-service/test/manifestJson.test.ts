import { describe, expect, it } from 'vitest';

import { formatTraceabilityManifestJson } from '../src/core/manifest-json.js';

describe('formatTraceabilityManifestJson', () => {
  it('keeps generated manifest output aligned with repository JSON formatting', () => {
    const output = formatTraceabilityManifestJson({
      baseline_adrs: [
        {
          number: 'ADR-0034',
          decisions: ['Define local write/read repository ports for run events'],
          implemented_by: ['packages/@dvt/adapter-postgres/src/RunEventWriteRepository.ts'],
        },
      ],
    });

    expect(output).toBe(`{
  "baseline_adrs": [
    {
      "number": "ADR-0034",
      "decisions": ["Define local write/read repository ports for run events"],
      "implemented_by": [
        "packages/@dvt/adapter-postgres/src/RunEventWriteRepository.ts"
      ]
    }
  ]
}
`);
  });

  it('leaves long single-string arrays expanded when they exceed JSON print width', () => {
    const output = formatTraceabilityManifestJson({
      decisions: [
        'This generated traceability decision is intentionally too long to fit in one JSON line.',
      ],
    });

    expect(output).toBe(`{
  "decisions": [
    "This generated traceability decision is intentionally too long to fit in one JSON line."
  ]
}
`);
  });
});

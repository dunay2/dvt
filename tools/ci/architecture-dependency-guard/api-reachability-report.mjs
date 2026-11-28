/** @ownedConcern Format the API reachability classifications and findings for the CLI. */
import { API_REACHABILITY_CLASSIFICATIONS } from './api-reachability-policy.mjs';

export function formatApiReachabilityFindings(findings) {
  return findings.map(
    (finding) =>
      `${finding.ruleName}: ${finding.source}${finding.target ? ` -> ${finding.target}` : ''} (${finding.reason})`
  );
}

export function formatApiReachabilityReport(result) {
  const counts = Object.values(API_REACHABILITY_CLASSIFICATIONS).map((classification) => [
    classification,
    result.classifications.filter((item) => item.classification === classification).length,
  ]);
  const lines = [
    `[api-production-reachability] modules=${result.classifications.length} ${counts
      .map(([classification, count]) => `${classification}=${count}`)
      .join(' ')}`,
    '[api-production-reachability] supported profiles:',
    ...result.profileEvidence.map(
      ({ profile, classification, proof, sources }) =>
        `- ${profile}: ${classification} [${sources.join(', ')}] (${proof})`
    ),
    '[api-production-reachability] dynamic imports:',
    ...result.dynamicImports.map(({ source, target }) => `- ${target}: ${source}`),
  ];
  const productionTypeSupport = result.classifications.filter(
    ({ retentionReason }) => retentionReason === 'production-type-support'
  );
  lines.push(
    '[api-production-reachability] production type support:',
    ...productionTypeSupport.map(({ source }) => `- production-type-support: ${source}`)
  );
  const candidates = result.classifications.filter(({ classification }) =>
    [
      API_REACHABILITY_CLASSIFICATIONS.testSupport,
      API_REACHABILITY_CLASSIFICATIONS.orphan,
    ].includes(classification)
  );
  lines.push(
    '[api-production-reachability] cleanup candidates:',
    ...candidates.map(({ source, classification }) => `- ${classification}: ${source}`)
  );
  const classificationBySource = new Map(
    result.classifications.map(({ source, classification }) => [source, classification])
  );
  const exportCandidates = result.exportEvidence.filter(
    ({ source, classification }) =>
      classification === 'test-support-export' ||
      (classification === 'unused-export' &&
        [
          API_REACHABILITY_CLASSIFICATIONS.testSupport,
          API_REACHABILITY_CLASSIFICATIONS.orphan,
        ].includes(classificationBySource.get(source)))
  );
  lines.push(
    '[api-production-reachability] export candidates:',
    ...exportCandidates.map(
      ({ source, symbol, classification, consumers }) =>
        `- ${classification}: ${source}#${symbol}${
          consumers.length > 0 ? ` <- ${consumers.join(', ')}` : ''
        }`
    )
  );
  return lines.join('\n');
}

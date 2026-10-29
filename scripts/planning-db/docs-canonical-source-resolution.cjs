/** Owned concern: validate and plan one proven canonical-document relocation. No I/O. */
function planCanonicalDocumentRelocation({ command, sourceRow, validateOnly = false }) {
  const proof = command.canonicalSource;
  const keys = [
    'sourceCommit',
    'retirementCommit',
    'expectedSourceContentSha256',
    'targetCommit',
    'targetPath',
    'targetAnchors',
    'expectedTargetContentSha256',
    'expectedResolutionSha256',
  ];
  if (
    !proof ||
    Object.getPrototypeOf(proof) !== Object.prototype ||
    Object.keys(proof).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(proof, key)) ||
    command.issueKind !== 'canonical_document_relocation' ||
    command.resolutionStatus !== 'linked' ||
    command.referenceText != null
  )
    throw new Error('DOC-RELOCATION: Explicit linked canonical-source proof required.');
  for (const key of ['sourceCommit', 'retirementCommit', 'targetCommit']) {
    if (!/^[a-f0-9]{40}$/u.test(proof[key]))
      throw new Error('DOC-RELOCATION: Exact Git commits required.');
  }
  for (const key of ['expectedSourceContentSha256', 'expectedTargetContentSha256']) {
    if (!/^[a-f0-9]{64}$/u.test(proof[key]))
      throw new Error('DOC-RELOCATION: Exact content hashes required.');
  }
  for (const value of [command.documentPath, proof.targetPath]) {
    if (
      typeof value !== 'string' ||
      !/^docs\/(?:[^\s/#:\\]+\/)*[^\s/#:\\]+\.md$/u.test(value) ||
      value.split('/').some((part) => part === '.' || part === '..')
    ) {
      throw new Error('DOC-RELOCATION: Repository Markdown paths required.');
    }
  }
  if (
    proof.targetPath === command.documentPath ||
    !Array.isArray(proof.targetAnchors) ||
    !proof.targetAnchors.length ||
    proof.targetAnchors.some(
      (anchor) => typeof anchor !== 'string' || !/^[a-zA-Z0-9_-]+$/u.test(anchor)
    ) ||
    new Set(proof.targetAnchors).size !== proof.targetAnchors.length ||
    (proof.expectedResolutionSha256 !== 'absent' &&
      !/^[a-f0-9]{64}$/u.test(proof.expectedResolutionSha256))
  ) {
    throw new Error('DOC-RELOCATION: Distinct target, exact anchors and overlay CAS required.');
  }
  if (validateOnly) return proof;
  if (
    !sourceRow?.document_id ||
    !sourceRow.target_document_id ||
    sourceRow.document_path !== command.documentPath ||
    sourceRow.target_document_path !== proof.targetPath ||
    sourceRow.source_content_sha256 !== proof.expectedSourceContentSha256 ||
    sourceRow.target_content_sha256 !== proof.expectedTargetContentSha256 ||
    ![
      'architecture',
      'architecture_component',
      'concept',
      'contract',
      'guide',
      'runbook',
      'adr',
    ].includes(sourceRow.document_type) ||
    ![
      'architecture',
      'architecture_component',
      'concept',
      'contract',
      'guide',
      'runbook',
      'adr',
    ].includes(sourceRow.target_document_type) ||
    /^(superseded|rejected|archived|discarded|retired)$/iu.test(sourceRow.target_status ?? '') ||
    sourceRow.target_relocated ||
    (sourceRow.overlay_target_path && sourceRow.overlay_target_path !== proof.targetPath)
  ) {
    throw new Error(
      'DOC-RELOCATION: Missing, stale, retired or contradictory registered source/target.'
    );
  }
  if ((sourceRow.overlay_sha256 ?? 'absent') !== proof.expectedResolutionSha256) {
    throw new Error('DOC-RELOCATION: Stale resolution CAS.');
  }
  if (typeof sourceRow.source_is_canonical_target !== 'boolean') {
    throw new Error('DOC-RELOCATION: Canonical target state is unavailable.');
  }
  if (sourceRow.source_is_canonical_target) {
    throw new Error('DOC-RELOCATION: Source is already a canonical target.');
  }
  return {
    ...proof,
    sourceDocumentId: sourceRow.document_id,
    targetDocumentId: sourceRow.target_document_id,
  };
}

module.exports = { planCanonicalDocumentRelocation };

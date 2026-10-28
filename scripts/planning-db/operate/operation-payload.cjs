/**
 * @file scripts/planning-db/operate/operation-payload.cjs
 * @ownedConcern Exact canonical payload and idempotency-key projection.
 * @baseline ADR-0061: Planning DB architecture and Git physical source authority.
 * @decision Keep existing named implementations in their cohesive operational concern.
 * @consequence Reuse direct references and the same native authorization, replay and transaction rails.
 * @version 1.0.0
 */

const { canonicalJson, normalizeOptionalText } = require('./command-values.cjs');

const { sha256HexUtf8 } = require('@dvt/crypto');

function operationPayload(command) {
  if (command.kind === 'docs_disposition_resolve') {
    return {
      resolutionScope: command.resolutionScope,
      issueKind: command.issueKind,
      documentPath: normalizeOptionalText(command.documentPath),
      referenceText: normalizeOptionalText(command.referenceText),
      resolutionStatus: command.resolutionStatus,
      reason: command.reason,
      ...(command.canonicalSource === undefined
        ? {}
        : { canonicalSource: command.canonicalSource }),
    };
  }

  if (command.kind === 'fowler_analysis_disposition_record') {
    return {
      documentPath: command.documentPath,
      dispositionStatus: command.dispositionStatus,
      dispositionKind: command.dispositionKind,
      canonicalTargetPath: normalizeOptionalText(command.canonicalTargetPath),
      reason: command.reason,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'fowler_analysis_canonical_target_link') {
    return {
      documentPath: command.documentPath,
      targetPath: command.targetPath,
      targetKind: command.targetKind,
      targetStatus: command.targetStatus,
      reason: command.reason,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'fowler_analysis_reference_resolve') {
    return {
      documentPath: command.documentPath,
      referencePath: command.referencePath,
      relationType: command.relationType,
      resolutionStatus: command.resolutionStatus,
      canonicalTargetPath: normalizeOptionalText(command.canonicalTargetPath),
      reason: command.reason,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'fowler_analysis_retirement_approve') {
    return {
      documentPath: command.documentPath,
      decisionStatus: command.decisionStatus,
      reason: command.reason,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_design_create') {
    return {
      designId: command.designId,
      workItemId: command.workItemId,
      title: command.title,
      owner: command.owner,
      status: command.status,
      rationale: command.rationale,
      fowlerSignal: command.fowlerSignal,
      railRef: command.railRef,
      supersedesId: normalizeOptionalText(command.supersedesId),
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
      scopes: command.scopes || [],
    };
  }

  if (command.kind === 'architecture_design_transition') {
    return {
      designId: command.designId,
      fromStatus: command.fromStatus,
      toStatus: command.toStatus,
      reason: command.reason,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_component_record') {
    return {
      designId: command.designId,
      componentId: command.componentId,
      name: command.name,
      kind: command.componentKind,
      layer: command.layer,
      owner: command.owner,
      repoPath: command.repoPath,
      publicContract: command.publicContract,
      runtime: command.runtime,
      criticality: command.criticality,
      status: command.status,
      parentComponentId: normalizeOptionalText(command.parentComponentId),
      responsibilities: command.responsibilities || [],
      ...(command.sourceBindings === undefined
        ? {}
        : {
            sourceBindings: command.sourceBindings,
            expectedBindingsHash: command.expectedBindingsHash,
          }),
      ...(command.expectedResponsibilityStatus === undefined
        ? {}
        : {
            expectedResponsibilityStatus: command.expectedResponsibilityStatus,
            responsibilityStatus: command.responsibilityStatus,
          }),
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_component_responsibility_retire') {
    return {
      designId: command.designId,
      componentId: command.componentId,
      responsibilityId: command.responsibilityId,
      reason: command.reason,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_relation_record') {
    return {
      designId: command.designId,
      relationId: command.relationId,
      sourceComponentId: command.sourceComponentId,
      targetComponentId: command.targetComponentId,
      relationType: command.relationType,
      direction: command.direction,
      syncAsync: command.syncAsync,
      contractId: normalizeOptionalText(command.contractId),
      failureMode: command.failureMode,
      authorizationScope: command.authorizationScope,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
      status: command.status,
    };
  }

  if (command.kind === 'architecture_contract_record') {
    return {
      designId: command.designId,
      contractId: command.contractId,
      contractKind: command.contractKind,
      ownerComponentId: command.ownerComponentId,
      contractRef: command.contractRef,
      compatibility: command.compatibility,
      status: command.status,
      validationCommand: command.validationCommand,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_port_record') {
    return {
      designId: command.designId,
      portId: command.portId,
      componentId: command.componentId,
      portName: command.portName,
      portKind: command.portKind,
      direction: command.direction,
      inputContractId: normalizeOptionalText(command.inputContractId),
      outputContractId: normalizeOptionalText(command.outputContractId),
      negativeTests: command.negativeTests || [],
      status: command.status,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_storage_io_record') {
    return {
      designId: command.designId,
      storageIoId: command.storageIoId,
      componentId: command.componentId,
      expectedStorageObject: command.expectedStorageObject,
      storageObject: command.storageObject,
      direction: command.direction,
      accessPattern: command.accessPattern,
      contractId: normalizeOptionalText(command.contractId),
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_fitness_scan') {
    return {
      designId: command.designId,
      scanId: command.scanId,
      root: command.root,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_test_record') {
    return {
      designId: command.designId,
      testId: command.testId,
      componentId: command.componentId,
      testPath: command.testPath,
      testKind: command.testKind,
      coverageLevel: command.coverageLevel,
      required: command.required,
      validationCommand: command.validationCommand,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_test_retire') {
    return {
      designId: command.designId,
      testId: command.testId,
      componentId: command.componentId,
      reason: command.reason,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_observability_record') {
    return {
      designId: command.designId,
      observabilityId: command.observabilityId,
      componentId: command.componentId,
      signalName: command.signalName,
      signalKind: command.signalKind,
      required: command.required,
      status: command.status,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_evidence_record') {
    return {
      designId: command.designId,
      evidenceId: command.evidenceId,
      subjectKind: command.subjectKind,
      subjectId: command.subjectId,
      evidenceKind: command.evidenceKind,
      evidenceOrigin: command.evidenceOrigin,
      resultState: command.resultState,
      sourceRef: command.sourceRef,
      sourcePath: command.sourcePath,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_evidence_retire') {
    return {
      designId: command.designId,
      evidenceId: command.evidenceId,
      reason: command.reason,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'component_create') {
    return {
      componentId: command.componentId,
      name: command.name,
      parentComponentId: command.parentComponentId,
      level: command.level,
      status: command.status,
      childrenRequired: command.childrenRequired,
      ownedConcern: command.ownedConcern,
      owns: command.owns || [],
      excludes: command.excludes || [],
      responsibilities: command.responsibilities || [],
      nonGoals: command.nonGoals || [],
      reasonsToChange: command.reasonsToChange || [],
      dddOwner: command.dddOwner,
      cqRails: command.cqRails,
      publicApi: command.publicApi || [],
      invariants: command.invariants || [],
      transitions: command.transitions || [],
      consumers: command.consumers || [],
      governance: command.governance || [],
      fowlerSignals: command.fowlerSignals || [],
    };
  }

  if (command.kind === 'component_reparent') {
    return {
      componentId: command.componentId,
      parentComponentId: command.parentComponentId,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'component_revise') {
    return {
      designId: command.designId,
      componentId: command.componentId,
      status: command.status,
      childrenRequired: command.childrenRequired,
      ownedConcern: command.ownedConcern,
      ...(command.dddOwner ? { dddOwner: command.dddOwner } : {}),
      ...(command.cqRails ? { cqRails: command.cqRails } : {}),
      addOwns: command.addOwns || [],
      removeOwns: command.removeOwns || [],
      addExcludes: command.addExcludes || [],
      removeExcludes: command.removeExcludes || [],
      responsibilities: command.responsibilities || [],
      ...(command.removeResponsibilities?.length
        ? { removeResponsibilities: command.removeResponsibilities }
        : {}),
      nonGoals: command.nonGoals || [],
      reasonsToChange: command.reasonsToChange || [],
      ...(command.removeNonGoals?.length ? { removeNonGoals: command.removeNonGoals } : {}),
      ...(command.removeReasonsToChange?.length
        ? { removeReasonsToChange: command.removeReasonsToChange }
        : {}),
      publicApi: command.publicApi || [],
      ...(command.removePublicApi?.length ? { removePublicApi: command.removePublicApi } : {}),
      invariants: command.invariants || [],
      transitions: command.transitions || [],
      consumers: command.consumers || [],
      governance: command.governance || [],
      fowlerSignals: command.fowlerSignals || [],
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'db_surface_upsert') {
    return {
      surfaceName: command.surfaceName,
      canonicalSource: command.canonicalSource,
      writeRail: command.writeRail,
      writeRailKind: command.writeRailKind,
      readQueryRail: command.readQueryRail,
      projection: command.projection,
      validation: command.validation,
      authorityMode: command.authorityMode,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'feature_mechanization_rail_record') {
    const referencePayload =
      command.referenceOnly === true
        ? { referenceOnly: true, authorityRef: command.authorityRef }
        : {};
    return {
      featureId: command.featureId,
      railName: command.railName,
      normalizedRailName: command.normalizedRailName,
      railType: command.railType,
      dddOwner: command.dddOwner,
      applicationPort: command.applicationPort,
      adapterSurface: command.adapterSurface,
      authorizationScope: command.authorizationScope,
      negativeTests: command.negativeTests || [],
      mechanizationStatus: command.mechanizationStatus,
      railStatus: command.railStatus,
      ...referencePayload,
      implementationRefs: command.implementationRefs || [],
      documentationRefs: command.documentationRefs || [],
      implementationPlan: command.implementationPlan,
      componentGuides: command.componentGuides || [],
      userStories: command.userStories || [],
      governingSources: command.governingSources || [],
      allowedImplementationSurfaces: command.allowedImplementationSurfaces || [],
      forbiddenImplementationSurfaces: command.forbiddenImplementationSurfaces || [],
      domainObjects: command.domainObjects || [],
      fowlerSignals: command.fowlerSignals || [],
      architectureGuards: command.architectureGuards || [],
      cypressFlows: command.cypressFlows || [],
      completionGate: command.completionGate || [],
      unitTests: command.unitTests || [],
      redTest: command.redTest,
      expectedFailure: command.expectedFailure,
      patchSurfaces: command.patchSurfaces || [],
      ...(command.redGreenCycle === undefined ? {} : { redGreenCycle: command.redGreenCycle }),
      greenTest: command.greenTest,
      replaceImplementationRefs: command.replaceImplementationRefs,
      replaceArchitectureGuards: command.replaceArchitectureGuards,
      ...(command.replaceDocumentationRefs === true ? { replaceDocumentationRefs: true } : {}),
      ...(command.replaceCurrent === true ? { replaceCurrent: true } : {}),
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'feature_mechanization_rail_retire') {
    return {
      designId: command.designId,
      featureId: command.featureId,
      railId: command.railId,
      railName: command.railName,
      normalizedRailName: command.normalizedRailName,
      railType: command.railType,
      expectedRevision: command.expectedRevision,
      reason: command.reason,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind && command.kind.startsWith('fowler_analysis_')) {
    return [
      command.kind,
      command.actor || 'anonymous',
      command.documentPath || 'no-document',
      command.targetPath || command.referencePath || 'no-subject',
      command.relationType || 'no-relation',
      sha256HexUtf8(canonicalJson(operationPayload(command))).slice(0, 16),
    ].join(':');
  }

  return {};
}

function docsResolutionIdempotencyPayload(command) {
  return {
    ...operationPayload(command),
    sourceContentSha256: normalizeOptionalText(command.sourceContentSha256),
  };
}

function defaultIdempotencyKey(command) {
  if (command.kind === 'docs_disposition_resolve') {
    return [
      command.kind,
      command.actor || 'anonymous',
      command.resolutionScope,
      command.issueKind,
      command.documentPath || 'no-document',
      command.referenceText || 'no-reference',
      sha256HexUtf8(canonicalJson(docsResolutionIdempotencyPayload(command))).slice(0, 16),
    ].join(':');
  }

  if (
    command.kind === 'component_create' ||
    command.kind === 'component_revise' ||
    command.kind === 'component_reparent'
  ) {
    return [
      command.kind,
      command.actor || 'anonymous',
      command.componentId || 'all',
      command.expectedRevision ?? 'latest',
      sha256HexUtf8(canonicalJson(operationPayload(command))).slice(0, 16),
    ].join(':');
  }

  if (
    command.kind === 'architecture_design_create' ||
    command.kind === 'architecture_design_transition'
  ) {
    return [
      command.kind,
      command.actor || 'anonymous',
      command.designId || 'all',
      sha256HexUtf8(canonicalJson(operationPayload(command))).slice(0, 16),
    ].join(':');
  }

  if (
    command.kind === 'architecture_component_record' ||
    command.kind === 'architecture_component_responsibility_retire' ||
    command.kind === 'architecture_relation_record' ||
    command.kind === 'architecture_contract_record' ||
    command.kind === 'architecture_port_record' ||
    command.kind === 'architecture_storage_io_record' ||
    command.kind === 'architecture_fitness_scan' ||
    command.kind === 'architecture_test_record' ||
    command.kind === 'architecture_test_retire' ||
    command.kind === 'architecture_observability_record' ||
    command.kind === 'architecture_evidence_record' ||
    command.kind === 'architecture_evidence_retire'
  ) {
    return [
      command.kind,
      command.actor || 'anonymous',
      command.designId || 'no-design',
      command.storageIoId ||
        command.contractId ||
        command.portId ||
        command.responsibilityId ||
        command.componentId ||
        command.relationId ||
        command.scanId ||
        command.testId ||
        command.observabilityId ||
        command.evidenceId ||
        'no-subject',
      sha256HexUtf8(canonicalJson(operationPayload(command))).slice(0, 16),
    ].join(':');
  }

  if (command.kind === 'db_surface_upsert') {
    return [
      command.kind,
      command.actor || 'anonymous',
      command.surfaceName || 'all',
      sha256HexUtf8(canonicalJson(operationPayload(command))).slice(0, 16),
    ].join(':');
  }

  if (
    command.kind === 'feature_mechanization_rail_record' ||
    command.kind === 'feature_mechanization_rail_retire'
  ) {
    return [
      command.kind,
      command.actor || 'anonymous',
      command.featureId || 'no-feature',
      command.railType || 'no-type',
      command.normalizedRailName || 'no-rail',
      command.expectedRevision ?? 'latest',
      sha256HexUtf8(canonicalJson(operationPayload(command))).slice(0, 16),
    ].join(':');
  }

  return [
    command.kind,
    command.actor || 'anonymous',
    command.expectedRevision ?? 'latest',
    sha256HexUtf8(JSON.stringify(operationPayload(command))).slice(0, 16),
  ].join(':');
}

module.exports = {
  defaultIdempotencyKey,
  operationPayload,
};

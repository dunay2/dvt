import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { defineArtifact } from './applicationArchitectureAst.artifacts.js';

const SRC_ROOT = join(import.meta.dirname, '../../../src');
const APPLICATION_ROOT = join(SRC_ROOT, 'application');
const ENTRYPOINTS_ROOT = join(SRC_ROOT, 'entrypoints/http');
const INFRA_ROOT = join(SRC_ROOT, 'infrastructure');
const MODULES_ROOT = join(SRC_ROOT, 'modules');
const DOMAIN_ROOT = join(SRC_ROOT, 'domain');
const DOCS_ROOT = join(import.meta.dirname, '../../../docs');

const artifacts = {
  accessDecisionPort: defineArtifact(APPLICATION_ROOT, 'ports/accessDecision.ts'),
  authPort: defineArtifact(APPLICATION_ROOT, 'ports/auth.ts'),
  authContract: defineArtifact(APPLICATION_ROOT, 'ports/authContract.ts'),
  authorizeCommandScopeService: defineArtifact(
    APPLICATION_ROOT,
    'services/authorizeCommandScopeService.ts'
  ),
  authorizeWorkspaceGraphDraftCapabilityService: defineArtifact(
    APPLICATION_ROOT,
    'services/authorizeWorkspaceGraphDraftCapabilityService.ts'
  ),
  workspaceGraphDraftCapabilityPolicy: defineArtifact(
    APPLICATION_ROOT,
    'services/workspaceGraphDraftCapabilityPolicy.ts'
  ),
  workspaceGraphDraftPort: defineArtifact(APPLICATION_ROOT, 'ports/workspaceGraphDraft.ts'),
  planRoutePolicyCatalog: defineArtifact(
    APPLICATION_ROOT,
    'services/planRoutePolicyCatalog.ts'
  ),
  embeddedAccessDecisionService: defineArtifact(
    INFRA_ROOT,
    'auth/embeddedAccessDecisionService.ts'
  ),
  buildProtectedSecurityRuntime: defineArtifact(
    MODULES_ROOT,
    'protectedRuntime/buildProtectedSecurityRuntime.ts'
  ),
  authorizeExecutionScope: defineArtifact(ENTRYPOINTS_ROOT, 'authorizeExecutionScope.ts'),
  authorizeAdminExecutionScope: defineArtifact(
    ENTRYPOINTS_ROOT,
    'authorizeAdminExecutionScope.ts'
  ),
  startRunRouteParser: defineArtifact(ENTRYPOINTS_ROOT, 'startRunRouteParser.ts'),
  getRunActionConstants: defineArtifact(ENTRYPOINTS_ROOT, 'getRunRouteParser.constants.ts'),
  getRunEventsActionConstants: defineArtifact(
    ENTRYPOINTS_ROOT,
    'getRunEventsRouteParser.constants.ts'
  ),
  listRunsActionConstants: defineArtifact(
    ENTRYPOINTS_ROOT,
    'listRunsRouteParser.constants.ts'
  ),
  runCommandActionConstants: defineArtifact(
    ENTRYPOINTS_ROOT,
    'runCommandRoute.constants.ts'
  ),
  adminRoutes: defineArtifact(ENTRYPOINTS_ROOT, 'adminRoutes.ts'),
  domainAuthTypes: defineArtifact(DOMAIN_ROOT, 'auth/types.ts'),
  componentGuide: defineArtifact(DOCS_ROOT, 'protected-security-access-decision-component.md'),
} as const;

describe('Protected security access-decision architecture', () => {
  it('ships a local component guide with API, invariants, transitions, and consumers', () => {
    expect(artifacts.componentGuide.exists()).toBe(true);

    const docText = artifacts.componentGuide.readText();
    for (const section of [
      '## Owned concern',
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Component map',
    ]) {
      expect(docText).toContain(section);
    }

    expect(docText).toContain('```mermaid');
    expect(docText).toContain('accessDecision.ts');
    expect(docText).toContain('AuthorizeCommandScopeService');
    expect(docText).toContain('workspaceGraphDraftCapabilityPolicy.ts');
    expect(docText).toContain('EmbeddedAccessDecisionService');
    expect(docText).toContain('buildProtectedSecurityRuntime.ts');
  });

  it('states owned-concern docblocks on the component modules', () => {
    for (const artifact of [
      artifacts.accessDecisionPort,
      artifacts.authPort,
      artifacts.authContract,
      artifacts.authorizeCommandScopeService,
      artifacts.authorizeWorkspaceGraphDraftCapabilityService,
      artifacts.workspaceGraphDraftCapabilityPolicy,
      artifacts.embeddedAccessDecisionService,
      artifacts.authorizeExecutionScope,
      artifacts.authorizeAdminExecutionScope,
      artifacts.buildProtectedSecurityRuntime,
    ]) {
      expect(artifact.hasOwnedConcernDocblock()).toBe(true);
    }
  });

  it('keeps the canonical access language in accessDecision.ts and out of domain identity types', () => {
    const accessDecisionText = artifacts.accessDecisionPort.readText();
    expect(accessDecisionText).toContain('AUTHORIZATION_ACTION_NAME');
    expect(accessDecisionText).toContain('AUTHORIZATION_ACTION');
    expect(accessDecisionText).toContain('ACCESS_SCOPE_RESOURCE');
    expect(accessDecisionText).toContain('IAccessDecisionService');
    expect(accessDecisionText).toContain('buildTenantAccessScope');
    expect(accessDecisionText).toContain('buildWorkspaceGraphDraftAccessScope');

    const domainAuthTypesText = artifacts.domainAuthTypes.readText();
    for (const forbiddenSnippet of [
      'run:start',
      'run:list',
      'run:view',
      'run:logs:view',
      'workspace:graph-draft:view',
      'workspace:graph-draft:save',
      'ExecutionScope',
      'RequestedScope',
      'DeniedReason',
      'AUTHORIZATION_ACTION',
    ]) {
      expect(domainAuthTypesText).not.toContain(forbiddenSnippet);
    }
  });

  it('forces route and application consumers to reuse the canonical action catalog', () => {
    expect(
      artifacts.planRoutePolicyCatalog.readText().includes('AUTHORIZATION_ACTION.runStart')
    ).toBe(true);
    expect(
      artifacts.workspaceGraphDraftPort
        .readText()
        .includes('AUTHORIZATION_ACTION.workspaceGraphDraftView')
    ).toBe(true);
    expect(
      artifacts.workspaceGraphDraftPort
        .readText()
        .includes('AUTHORIZATION_ACTION.workspaceGraphDraftSave')
    ).toBe(true);
    expect(artifacts.startRunRouteParser.readText().includes('AUTHORIZATION_ACTION.runStart')).toBe(
      true
    );
    expect(
      artifacts.adminRoutes.readText().includes('AUTHORIZATION_ACTION.adminRebuildSnapshot')
    ).toBe(true);

    for (const artifact of [
      artifacts.getRunActionConstants,
      artifacts.getRunEventsActionConstants,
      artifacts.listRunsActionConstants,
    ]) {
      const source = artifact.readSource();
      expect(
        source.hasNamedImport({
          importedName: 'AUTHORIZATION_ACTION',
          moduleSpecifier: '../../application/ports/accessDecision.js',
        })
      ).toBe(true);
    }

    expect(
      artifacts.runCommandActionConstants
        .readSource()
        .hasNamedImport({
          importedName: 'AUTHORIZATION_ACTION_NAME',
          moduleSpecifier: '../../application/ports/accessDecision.js',
        })
    ).toBe(true);
  });

  it('keeps orchestration, backend evaluation, and assembly on their owned concerns', () => {
    const authorizerSource = artifacts.authorizeCommandScopeService.readSource();
    expect(
      authorizerSource.hasNamedImport({
        importedName: 'IAccessDecisionService',
        moduleSpecifier: '../ports/accessDecision.js',
      })
    ).toBe(true);
    expect(
      authorizerSource.hasNamedImport({
        importedName: 'IAuthAuditPort',
        moduleSpecifier: '../ports/auth.js',
      })
    ).toBe(true);
    expect(artifacts.authorizeCommandScopeService.readText()).not.toContain('../../infrastructure/');

    const workspaceDraftSource =
      artifacts.authorizeWorkspaceGraphDraftCapabilityService.readSource();
    expect(
      workspaceDraftSource.hasNamedImport({
        importedName: 'WORKSPACE_GRAPH_DRAFT_CAPABILITY_POLICY',
        moduleSpecifier: './workspaceGraphDraftCapabilityPolicy.js',
      })
    ).toBe(true);
    expect(
      workspaceDraftSource.hasNamedImport({
        importedName: 'buildWorkspaceGraphDraftDeniedCapability',
        moduleSpecifier: './workspaceGraphDraftCapabilityPolicy.js',
      })
    ).toBe(true);
    expect(
      workspaceDraftSource.hasNamedImport({
        importedName: 'buildWorkspaceGraphDraftCapabilityFromPolicy',
        moduleSpecifier: './workspaceGraphDraftCapabilityPolicy.js',
      })
    ).toBe(true);
    expect(
      artifacts.authorizeWorkspaceGraphDraftCapabilityService.readText()
    ).not.toContain('const WORKSPACE_GRAPH_DRAFT_CAPABILITY_POLICY =');

    const embeddedText = artifacts.embeddedAccessDecisionService.readText();
    expect(
      artifacts.embeddedAccessDecisionService
        .readSource()
        .hasNamedImport({
          importedName: 'ACCESS_SCOPE_RESOURCE',
          moduleSpecifier: '../../application/ports/accessDecision.js',
        })
    ).toBe(true);
    expect(embeddedText).toContain('switch (requestedScope.resource)');
    expect(embeddedText).not.toContain('requestedScope.projectId === undefined');
    expect(embeddedText).not.toContain('requestedScope.environmentId === undefined');
    expect(embeddedText).not.toContain('openfga');
    expect(embeddedText).not.toContain('verifiedpermissions');

    const securityRuntimeText = artifacts.buildProtectedSecurityRuntime.readText();
    expect(securityRuntimeText).toContain('new EmbeddedAccessDecisionService(');
    expect(securityRuntimeText).toContain('new StructuredAuditLogger(');
    expect(securityRuntimeText).toContain('new AuthorizeCommandScopeService(');
    expect(securityRuntimeText).toContain('new OidcAuthenticator(');
    expect(securityRuntimeText).toContain('migrateAccessDecisionService');
  });
});

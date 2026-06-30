-- Split the broad Web Canvas draft lifecycle component into responsibility
-- leaves. These files are active implementation and validation assets; old or
-- nonfunctional files require explicit deprecation evidence before they can be
-- marked deprecated.

drop table if exists pg_temp.web_canvas_draft_lifecycle_leaf_map;
drop table if exists pg_temp.web_canvas_draft_lifecycle_dependency_map;

create temporary table web_canvas_draft_lifecycle_leaf_map (
  component_id text primary key,
  name text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  invariant text not null,
  repo_path text not null,
  public_contract text not null,
  fowler_signal text not null,
  public_api text[] not null,
  owns text[] not null,
  test_paths text[] not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null,
  port_name text not null,
  port_kind text not null,
  negative_tests text[] not null,
  maturity_score numeric not null,
  criticality text not null,
  relation_suffix text not null
);

create temporary table web_canvas_draft_lifecycle_dependency_map (
  source_component_id text not null,
  target_component_id text not null,
  relation_id text primary key,
  contract_id text not null,
  failure_mode text not null
);

insert into web_canvas_draft_lifecycle_leaf_map (
  component_id,
  name,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  invariant,
  repo_path,
  public_contract,
  fowler_signal,
  public_api,
  owns,
  test_paths,
  test_kind,
  coverage_level,
  validation_command,
  port_name,
  port_kind,
  negative_tests,
  maturity_score,
  criticality,
  relation_suffix
)
values
  (
    'SYS-WEB-CANVAS-DRAFT-ACCESS-POSTURE',
    'Canvas draft access posture',
    'CanvasDraftAccessPosture',
    'ReadCanvasDraftAccessPosture;ValidateCanvasDraftAuthTransportPosture',
    'Owns Canvas draft access, auth transport posture, and recovery-copy presentation for denied or degraded draft states.',
    'Model draft access posture and auth transport failures without mixing them into persistence, session, or autosave orchestration.',
    'Access posture model, auth transport posture, recovery copy, denied state, or fail-closed UX changes.',
    'Draft access posture must remain query-only and must not mutate draft session or repository state.',
    'apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.ts',
    'Canvas draft access posture and auth transport read model.',
    'hidden_authority',
    array['canvasDraftAccessPostureModel', 'canvasDraftAuthTransportPosture', 'CanvasDraftAccessRecoveryTemplates']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.ts',
      'apps/web/src/app/views/canvas/CanvasDraftAccessRecovery.templates.tsx',
      'apps/web/src/app/views/canvas/canvasDraftAuthTransportPosture.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftAuthTransportPosture.ts'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftAuthTransportPosture.test.ts'
    ]::text[],
    'unit',
    'negative',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasDraftAccessPostureModel.test.ts src/app/views/canvas/canvasDraftAuthTransportPosture.test.ts',
    'ReadCanvasDraftAccessPosture',
    'query',
    array['unauthenticated draft access', 'workspace scope denied', 'transport posture degraded']::text[],
    80,
    'high',
    'ACCESS-POSTURE'
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-AUTHORING-MODEL',
    'Canvas draft authoring model',
    'CanvasDraftAuthoringModel',
    'ApplyCanvasDraftAuthoringChange;ReadCanvasDraftLocalNodeCatalog',
    'Owns draft authoring commands, local node catalog selection, and authoring component architecture evidence.',
    'Apply draft authoring changes through a named command boundary while keeping catalog lookup separate from session persistence.',
    'Draft authoring command, local node catalog, authoring architecture, or authoring test changes.',
    'Authoring code must not persist remote draft state directly; persistence belongs to the repository and autosave leaves.',
    'apps/web/src/app/views/canvas/canvasDraftAuthoring.ts',
    'Canvas draft authoring command and local catalog boundary.',
    'boundary_drift',
    array['canvasDraftAuthoring', 'canvasDraftLocalNodeCatalog']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasDraftAuthoringComponent.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftAuthoring.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftAuthoring.ts',
      'apps/web/src/app/views/canvas/canvasDraftLocalNodeCatalog.ts'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/canvasDraftAuthoringComponent.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftAuthoring.test.ts'
    ]::text[],
    'architecture',
    'behavior',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasDraftAuthoring.test.ts src/app/views/canvas/canvasDraftAuthoringComponent.architecture.test.ts',
    'ApplyCanvasDraftAuthoringChange',
    'command',
    array['unknown node catalog item', 'invalid draft authoring command', 'authoring persistence shortcut']::text[],
    82,
    'critical',
    'AUTHORING-MODEL'
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-REPOSITORY-SCOPE',
    'Canvas draft repository and scope',
    'CanvasDraftRepositoryScope',
    'ReadCanvasDraftRecord;WriteCanvasDraftRecord;ResolveCanvasDraftScope;DeriveCanvasDraftIdempotencyKey',
    'Owns draft repository read/write behavior, conflict evidence, scope value objects, idempotency keys, structural signatures, and transport error state.',
    'Persist and retrieve draft records with explicit scope and idempotency semantics independent from React hook orchestration.',
    'Repository read/write, conflict policy, draft scope, idempotency key, structural signature, or transport error changes.',
    'Repository writes must remain scope-aware and idempotent; UI hooks must not invent repository semantics.',
    'apps/web/src/app/views/canvas/canvasDraftRepository.ts',
    'Canvas draft repository, scope, idempotency, and transport error boundary.',
    'published_language',
    array['canvasDraftRepository', 'canvasDraftScope', 'canvasDraftIdempotencyKey', 'canvasDraftStructuralSignature', 'canvasDraftTransportErrorState']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasDraftIdempotencyKey.ts',
      'apps/web/src/app/views/canvas/canvasDraftRepository.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftRepository.conflict.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftRepository.readWrite.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftRepository.test.fixtures.ts',
      'apps/web/src/app/views/canvas/canvasDraftRepository.ts',
      'apps/web/src/app/views/canvas/canvasDraftScope.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftScope.ts',
      'apps/web/src/app/views/canvas/canvasDraftStructuralSignature.ts',
      'apps/web/src/app/views/canvas/canvasDraftTransportErrorState.ts'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/canvasDraftRepository.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftRepository.conflict.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftRepository.readWrite.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftScope.test.ts'
    ]::text[],
    'architecture',
    'negative',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasDraftRepository.readWrite.test.ts src/app/views/canvas/canvasDraftRepository.conflict.test.ts src/app/views/canvas/canvasDraftRepository.architecture.test.ts src/app/views/canvas/canvasDraftScope.test.ts',
    'WriteCanvasDraftRecord',
    'command',
    array['stale draft revision', 'scope mismatch', 'duplicate idempotency key', 'transport write failure']::text[],
    86,
    'critical',
    'REPOSITORY-SCOPE'
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
    'Canvas draft session state',
    'CanvasDraftSessionState',
    'ManageCanvasDraftSessionState;ReadCanvasDraftSessionState;ComputeCanvasDraftStatus',
    'Owns draft session state machine, baseline state, lifecycle snapshot, working set, status state, layout hydration policy, and shared draft lifecycle types.',
    'Coordinate local draft session state without taking repository writes, autosave scheduling, or read-model presentation responsibilities.',
    'Draft session state, baseline, status state, lifecycle snapshot, working set, state-machine, layout hydration, or lifecycle type changes.',
    'Session state must remain deterministic and serializable enough for repository, autosave, and presentation leaves to consume it.',
    'apps/web/src/app/views/canvas/canvasDraftSession.ts',
    'Canvas draft session state and lifecycle value boundary.',
    'state_pattern',
    array['canvasDraftSession', 'canvasDraftSessionMachine', 'canvasDraftStatusState', 'canvasDraftLifecycleSnapshot', 'canvasDraftLayoutHydrationPolicy']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasDraftLayoutHydrationPolicy.ts',
      'apps/web/src/app/views/canvas/canvasDraftLifecycleSnapshot.ts',
      'apps/web/src/app/views/canvas/canvasDraftLifecycle.types.ts',
      'apps/web/src/app/views/canvas/canvasDraftSession.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftSessionBaseline.ts',
      'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts',
      'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftSession.ts',
      'apps/web/src/app/views/canvas/canvasDraftSession.types.ts',
      'apps/web/src/app/views/canvas/canvasDraftSessionWorkingSet.ts',
      'apps/web/src/app/views/canvas/canvasDraftStatusState.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftStatusState.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftBaseline.ts'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/canvasDraftSession.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftStatusState.test.ts'
    ]::text[],
    'architecture',
    'behavior',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasDraftSession.test.ts src/app/views/canvas/canvasDraftStatusState.test.ts src/app/views/canvas/canvasDraftSession.architecture.test.ts',
    'ManageCanvasDraftSessionState',
    'command',
    array['invalid session transition', 'missing baseline state', 'layout hydration mismatch']::text[],
    86,
    'critical',
    'SESSION-STATE'
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-READ-PRESENTATION',
    'Canvas draft read and presentation model',
    'CanvasDraftReadPresentation',
    'ReadCanvasDraftModel;ReadCanvasDraftPresentation;CacheCanvasDraftQuery',
    'Owns draft read model projection, query cache policy, presentation model, presentation store, save status view, and persistence runtime evidence.',
    'Project draft state for UI consumption without owning repository writes or autosave orchestration.',
    'Draft read-model shape, presentation store, save status rendering, query cache, or persistence runtime display changes.',
    'Presentation and read-model code must consume session and repository facts instead of becoming the source of draft truth.',
    'apps/web/src/app/views/canvas/canvasDraftReadModel.ts',
    'Canvas draft read model and presentation boundary.',
    'presentation_model',
    array['canvasDraftReadModel', 'canvasDraftPresentationModel', 'canvasDraftPresentationStore', 'CanvasDraftSaveStatus', 'canvasDraftQueryCache', 'canvasDraftPersistenceRuntime']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasDraftPersistenceRuntime.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftPersistenceRuntime.ts',
      'apps/web/src/app/views/canvas/canvasDraftPresentationModel.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftPresentationModel.ts',
      'apps/web/src/app/views/canvas/canvasDraftPresentationStore.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftPresentationStore.ts',
      'apps/web/src/app/views/canvas/canvasDraftQueryCache.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftQueryCache.ts',
      'apps/web/src/app/views/canvas/canvasDraftReadModel.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftReadModel.ts',
      'apps/web/src/app/views/canvas/CanvasDraftSaveStatus.tsx'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/canvasDraftPersistenceRuntime.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftPresentationModel.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftPresentationStore.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftQueryCache.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasDraftReadModel.test.ts'
    ]::text[],
    'architecture',
    'behavior',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasDraftReadModel.test.ts src/app/views/canvas/canvasDraftPresentationModel.test.ts src/app/views/canvas/canvasDraftPresentationStore.test.ts src/app/views/canvas/canvasDraftPersistenceRuntime.test.ts src/app/views/canvas/canvasDraftQueryCache.architecture.test.ts',
    'ReadCanvasDraftPresentation',
    'query',
    array['stale query cache', 'missing save status', 'presentation store becomes authority']::text[],
    84,
    'high',
    'READ-PRESENTATION'
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-AUTOSAVE-PERSISTENCE',
    'Canvas draft autosave and persistence hooks',
    'CanvasDraftAutosavePersistence',
    'ScheduleCanvasDraftAutosave;PersistCanvasDraftFromHook;SyncMissingRemoteDraft',
    'Owns autosave scheduling/execution and React hook orchestration for draft persistence, attempt refs, and missing-remote synchronization.',
    'Schedule and execute draft persistence from UI hooks without embedding repository semantics in the autosave layer.',
    'Autosave scheduling, autosave execution, attempt reference, persistence hook, missing remote sync, or autosave architecture changes.',
    'Autosave hooks must delegate durable read/write semantics to the repository leaf and must not invent draft identity or scope.',
    'apps/web/src/app/views/canvas/useCanvasDraftAutosave.ts',
    'Canvas draft autosave and persistence hook boundary.',
    'service_layer',
    array['canvasDraftAutosaveScheduling', 'canvasDraftAutosaveExecution', 'useCanvasDraftAutosave', 'useCanvasDraftPersistence', 'useCanvasDraftMissingRemoteSync']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasDraftAutosaveExecution.ts',
      'apps/web/src/app/views/canvas/canvasDraftAutosaveScheduling.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftAttemptRefs.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftAutosave.architecture.test.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftAutosave.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftMissingRemoteSync.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftPersistence.architecture.test.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftPersistence.ts'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/useCanvasDraftAutosave.architecture.test.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftPersistence.architecture.test.ts'
    ]::text[],
    'architecture',
    'flow',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/useCanvasDraftAutosave.architecture.test.ts src/app/views/canvas/useCanvasDraftPersistence.architecture.test.ts',
    'ScheduleCanvasDraftAutosave',
    'command',
    array['autosave race', 'missing remote draft', 'duplicate persistence attempt', 'repository shortcut from hook']::text[],
    82,
    'critical',
    'AUTOSAVE-PERSISTENCE'
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-BOOTSTRAP-RECOVERY',
    'Canvas draft bootstrap and recovery hooks',
    'CanvasDraftBootstrapRecovery',
    'BootstrapCanvasDraft;RecoverCanvasDraft;ReconcileCanonicalCanvasDraft',
    'Owns draft bootstrap, startup publication, canonical reconciliation, lifecycle hook orchestration, recovery actions, and reload hydration.',
    'Recover and bootstrap draft state across reloads and startup without owning repository semantics or access posture decisions.',
    'Draft bootstrapping, bootstrap sync, canonical reconciliation, lifecycle hook, recovery action, reload hydration, startup publication, or recovery boundary changes.',
    'Bootstrap and recovery hooks must coordinate existing session, repository, access, and presentation leaves instead of replacing them.',
    'apps/web/src/app/views/canvas/useCanvasDraftBootstrapping.ts',
    'Canvas draft bootstrap, recovery, and canonical reconciliation boundary.',
    'orchestration',
    array['useCanvasDraftBootstrapping', 'useCanvasDraftBootstrapSync', 'useCanvasDraftCanonicalReconcile', 'useCanvasDraftInitialBootstrap', 'useCanvasDraftLifecycle', 'useCanvasDraftRecoveryActions', 'useCanvasDraftReloadHydration']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasDraftRecoveryBoundary.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasStartupAndDraftRecovery.architecture.support.ts',
      'apps/web/src/app/views/canvas/canvasStartupBootstrapPublication.architecture.test.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftBootstrapping.architecture.test.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftBootstrapping.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftBootstrapSync.architecture.test.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftBootstrapSync.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftCanonicalReconcile.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftInitialBootstrap.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftLifecycle.architecture.test.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftLifecycle.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftRecoveryActions.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftReloadHydration.ts'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/canvasDraftRecoveryBoundary.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasStartupBootstrapPublication.architecture.test.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftBootstrapping.architecture.test.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftBootstrapSync.architecture.test.ts',
      'apps/web/src/app/views/canvas/useCanvasDraftLifecycle.architecture.test.ts'
    ]::text[],
    'architecture',
    'boundary',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasDraftRecoveryBoundary.architecture.test.ts src/app/views/canvas/canvasStartupBootstrapPublication.architecture.test.ts src/app/views/canvas/useCanvasDraftBootstrapping.architecture.test.ts src/app/views/canvas/useCanvasDraftBootstrapSync.architecture.test.ts src/app/views/canvas/useCanvasDraftLifecycle.architecture.test.ts',
    'RecoverCanvasDraft',
    'command',
    array['missing bootstrap source', 'stale canonical draft', 'reload hydration mismatch', 'recovery replaces repository semantics']::text[],
    84,
    'critical',
    'BOOTSTRAP-RECOVERY'
  );

insert into web_canvas_draft_lifecycle_dependency_map (
  source_component_id,
  target_component_id,
  relation_id,
  contract_id,
  failure_mode
)
values
  (
    'SYS-WEB-CANVAS-DRAFT-AUTHORING-MODEL',
    'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
    'REL-WEB-CANVAS-DRAFT-AUTHORING-DEPENDS-ON-SESSION-STATE',
    'CONTRACT-SYS-WEB-CANVAS-DRAFT-SESSION-STATE-SURFACE',
    'Authoring commands can drift from draft session invariants.'
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-READ-PRESENTATION',
    'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
    'REL-WEB-CANVAS-DRAFT-PRESENTATION-DEPENDS-ON-SESSION-STATE',
    'CONTRACT-SYS-WEB-CANVAS-DRAFT-SESSION-STATE-SURFACE',
    'Presentation models can become hidden draft authority.'
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-AUTOSAVE-PERSISTENCE',
    'SYS-WEB-CANVAS-DRAFT-REPOSITORY-SCOPE',
    'REL-WEB-CANVAS-DRAFT-AUTOSAVE-DEPENDS-ON-REPOSITORY',
    'CONTRACT-SYS-WEB-CANVAS-DRAFT-REPOSITORY-SCOPE-SURFACE',
    'Autosave hooks can duplicate repository write semantics.'
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-AUTOSAVE-PERSISTENCE',
    'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
    'REL-WEB-CANVAS-DRAFT-AUTOSAVE-DEPENDS-ON-SESSION-STATE',
    'CONTRACT-SYS-WEB-CANVAS-DRAFT-SESSION-STATE-SURFACE',
    'Autosave scheduling can drift from local session state.'
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-BOOTSTRAP-RECOVERY',
    'SYS-WEB-CANVAS-DRAFT-ACCESS-POSTURE',
    'REL-WEB-CANVAS-DRAFT-RECOVERY-DEPENDS-ON-ACCESS-POSTURE',
    'CONTRACT-SYS-WEB-CANVAS-DRAFT-ACCESS-POSTURE-SURFACE',
    'Recovery can bypass denied or degraded access posture.'
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-BOOTSTRAP-RECOVERY',
    'SYS-WEB-CANVAS-DRAFT-REPOSITORY-SCOPE',
    'REL-WEB-CANVAS-DRAFT-RECOVERY-DEPENDS-ON-REPOSITORY',
    'CONTRACT-SYS-WEB-CANVAS-DRAFT-REPOSITORY-SCOPE-SURFACE',
    'Recovery can invent persistence semantics outside the repository.'
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-BOOTSTRAP-RECOVERY',
    'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
    'REL-WEB-CANVAS-DRAFT-RECOVERY-DEPENDS-ON-SESSION-STATE',
    'CONTRACT-SYS-WEB-CANVAS-DRAFT-SESSION-STATE-SURFACE',
    'Recovery can produce an invalid local draft session.'
  );

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'PLANNING-DB-WEB-CANVAS-DRAFT-LIFECYCLE-LEAF-COMPONENTS-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas draft lifecycle leaf component mapping',
  'Architecture / Planning DB / Web Canvas',
  'review',
  'SYS-WEB-CANVAS-DRAFT-LIFECYCLE owned 64 active implementation and test files directly across access, authoring, repository, session, read-model, autosave, and recovery responsibilities. This migration keeps the existing component as an aggregate and maps concrete files to responsibility-owned leaves with component graph relations, ports, contracts, tests, observability, and Fowler basis.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;ReadCanvasDraftSessionState;WriteCanvasDraftRecord;RecoverCanvasDraft',
  null
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
select distinct
  'PLANNING-DB-WEB-CANVAS-DRAFT-LIFECYCLE-LEAF-COMPONENTS-20260619',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-WEB-CANVAS-DRAFT-LIFECYCLE'::text, 'may_update'::text
  union all
  select 'component', 'SYS-WEB-VIEW-CANVAS', 'may_reference'
  union all
  select 'path', 'apps/web/src/app/views/canvas/**', 'may_update'
  union all
  select 'component', component_id, 'may_create'
  from web_canvas_draft_lifecycle_leaf_map
  union all
  select 'component', target_component_id, 'may_reference'
  from web_canvas_draft_lifecycle_dependency_map
  union all
  select 'path', pattern, 'may_update'
  from web_canvas_draft_lifecycle_leaf_map
  cross join lateral unnest(owns) as owned(pattern)
) scope(subject_kind, subject_id, scope_kind)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_components component
set
  children_required = true,
  cq_rails = 'ManageCanvasDraftSessionState;WriteCanvasDraftRecord;ReadCanvasDraftPresentation;RecoverCanvasDraft',
  fowler_signals = jsonb_build_array('responsibility_overload', 'component_split', 'draft_lifecycle_boundary'),
  raw_component = component.raw_component || jsonb_build_object(
    'childrenRequired',
    true,
    'cqRails',
    'ManageCanvasDraftSessionState;WriteCanvasDraftRecord;ReadCanvasDraftPresentation;RecoverCanvasDraft',
    'reconciledBy',
    '210_web_canvas_draft_lifecycle_leaf_components',
    'ownedConcern',
    'Owns the aggregate Web Canvas draft lifecycle boundary; concrete files resolve to responsibility-owned child components.'
  )
where component.component_id = 'SYS-WEB-CANVAS-DRAFT-LIFECYCLE';

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
values (
  'SYS-WEB-CANVAS-DRAFT-LIFECYCLE',
  'tools/planning-db/migrations/210_web_canvas_draft_lifecycle_leaf_components.sql',
  md5('SYS-WEB-CANVAS-DRAFT-LIFECYCLE:210') || md5('web-canvas-draft-lifecycle-parent:210'),
  0,
  'Canvas draft lifecycle',
  'component',
  'SYS-WEB-VIEW-CANVAS',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  true,
  'Owns the aggregate Web Canvas draft lifecycle boundary; concrete files resolve to responsibility-owned child components.',
  'CanvasDraftLifecycleCatalog',
  'ManageCanvasDraftSessionState;WriteCanvasDraftRecord;ReadCanvasDraftPresentation;RecoverCanvasDraft',
  'codex'
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
select
  component_id,
  'tools/planning-db/migrations/210_web_canvas_draft_lifecycle_leaf_components.sql',
  md5(component_id || ':210') || md5(repo_path || cq_rails || ':web-canvas-draft-lifecycle-leaf'),
  0,
  name,
  'component',
  'SYS-WEB-CANVAS-DRAFT-LIFECYCLE',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from web_canvas_draft_lifecycle_leaf_map
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
select
  component_id,
  'owns',
  own.pattern,
  own.pattern_order - 1
from web_canvas_draft_lifecycle_leaf_map
cross join lateral unnest(owns) with ordinality as own(pattern, pattern_order)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  item.component_id,
  item.item_kind,
  item.item_value,
  item.item_order
from (
  values
    (
      'SYS-WEB-CANVAS-DRAFT-LIFECYCLE',
      'responsibility',
      'Own the aggregate Web Canvas draft lifecycle boundary and delegate concrete files to access, authoring, repository, session, presentation, autosave, and recovery leaves.',
      0
    ),
    (
      'SYS-WEB-CANVAS-DRAFT-LIFECYCLE',
      'reason_to_change',
      'Canvas draft lifecycle taxonomy, child component ownership, draft command/query rail grouping, or component hierarchy changes.',
      0
    ),
    (
      'SYS-WEB-CANVAS-DRAFT-LIFECYCLE',
      'invariant',
      'The aggregate must own no concrete apps/web/src/app/views/canvas draft lifecycle files directly once draft lifecycle leaves are applied.',
      0
    ),
    (
      'SYS-WEB-CANVAS-DRAFT-LIFECYCLE',
      'non_goal',
      'Do not deprecate active Canvas draft files merely to reduce direct-file count; nonfunctional files require explicit deprecation evidence.',
      0
    ),
    (
      'SYS-WEB-CANVAS-DRAFT-LIFECYCLE',
      'governance_ref',
      'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
      0
    )
) item(component_id, item_kind, item_value, item_order)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  item.component_id,
  item.item_kind,
  item.item_value,
  item.item_order
from (
  select component_id, 'responsibility' as item_kind, responsibility as item_value, 0 as item_order
  from web_canvas_draft_lifecycle_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from web_canvas_draft_lifecycle_leaf_map
  union all
  select component_id, 'invariant', invariant, 0
  from web_canvas_draft_lifecycle_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented after component-quality shows SYS-WEB-CANVAS-DRAFT-LIFECYCLE owns no direct files and leaf validation commands pass.', 0
  from web_canvas_draft_lifecycle_leaf_map
  union all
  select component_id, 'consumer', 'Canvas route maintainers, Planning DB component-profile readers, component-integrity, and CI changed-slice checks', 0
  from web_canvas_draft_lifecycle_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0
  from web_canvas_draft_lifecycle_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from web_canvas_draft_lifecycle_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from web_canvas_draft_lifecycle_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  kind = 'ui-view',
  layer = 'ui',
  owner = 'CanvasDraftLifecycleCatalog',
  repo_path = 'apps/web/src/app/views/canvas',
  public_contract = 'Aggregate Web Canvas draft lifecycle boundary; concrete files are owned by responsibility leaves.',
  runtime = 'browser',
  criticality = 'critical',
  status = 'review',
  maturity_score = greatest(coalesce(maturity_score, 0), 84),
  parent_component_id = 'SYS-WEB-VIEW-CANVAS',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-DRAFT-LIFECYCLE';

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  maturity_score,
  parent_component_id
)
select
  component_id,
  name,
  'ui-view',
  'ui',
  ddd_owner,
  repo_path,
  public_contract,
  'browser',
  criticality,
  'review',
  maturity_score,
  'SYS-WEB-CANVAS-DRAFT-LIFECYCLE'
from web_canvas_draft_lifecycle_leaf_map
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  maturity_score = excluded.maturity_score,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
select
  'RESP-' || component_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  'implemented'
from web_canvas_draft_lifecycle_leaf_map
union all
select
  'RESP-SYS-WEB-CANVAS-DRAFT-LIFECYCLE',
  'SYS-WEB-CANVAS-DRAFT-LIFECYCLE',
  'Own the aggregate Web Canvas draft lifecycle boundary and delegate concrete files to responsibility leaves.',
  'Canvas draft lifecycle taxonomy, child component ownership, draft command/query rail grouping, or component hierarchy changes.',
  'CanvasDraftLifecycleCatalog',
  'implemented'
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.contract (
  contract_id,
  contract_kind,
  owner_component_id,
  contract_ref,
  compatibility,
  status,
  validation_command
)
select
  'CONTRACT-' || component_id || '-SURFACE',
  'type',
  component_id,
  public_contract,
  'internal',
  'implemented',
  validation_command
from web_canvas_draft_lifecycle_leaf_map
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command;

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
select
  'REL-WEB-CANVAS-DRAFT-LIFECYCLE-CONTAINS-' || relation_suffix,
  'SYS-WEB-CANVAS-DRAFT-LIFECYCLE',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this Canvas draft lifecycle leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local Web Canvas governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from web_canvas_draft_lifecycle_leaf_map
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
select
  relation_id,
  source_component_id,
  target_component_id,
  'depends_on',
  'outbound',
  'sync',
  contract_id,
  failure_mode,
  'browser-local Canvas draft state',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    'tools/planning-db/migrations/210_web_canvas_draft_lifecycle_leaf_components.sql'
  ),
  'implemented'
from web_canvas_draft_lifecycle_dependency_map
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  input_contract_id,
  output_contract_id,
  negative_tests,
  status
)
select
  'PORT-' || component_id || '-' || upper(regexp_replace(port_name, '[^A-Za-z0-9]+', '-', 'g')),
  component_id,
  port_name,
  port_kind,
  'inbound',
  'CONTRACT-' || component_id || '-SURFACE',
  'CONTRACT-' || component_id || '-SURFACE',
  negative_tests,
  'implemented'
from web_canvas_draft_lifecycle_leaf_map
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
select
  'TEST-' || component_id || '-' || test_path.test_order,
  component_id,
  test_path.path,
  test_kind,
  coverage_level,
  true,
  validation_command
from web_canvas_draft_lifecycle_leaf_map
cross join lateral unnest(test_paths) with ordinality as test_path(path, test_order)
union all
select
  'TEST-SYS-WEB-CANVAS-DRAFT-LIFECYCLE-COMPONENT-PROFILE',
  'SYS-WEB-CANVAS-DRAFT-LIFECYCLE',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-quality --component SYS-WEB-CANVAS-DRAFT-LIFECYCLE --no-refresh --limit 20 && pnpm planning:db:query files --component SYS-WEB-CANVAS-DRAFT-LIFECYCLE --no-refresh --limit 20'
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
select
  'OBS-' || component_id || '-WEB-CANVAS-DRAFT-LIFECYCLE',
  component_id,
  name || ' is observable through component-profile, component-quality, focused web unit tests, and browser draft state surfaces.',
  'dashboard',
  true,
  'implemented'
from web_canvas_draft_lifecycle_leaf_map
union all
select
  'OBS-SYS-WEB-CANVAS-DRAFT-LIFECYCLE-COMPONENT-QUALITY',
  'SYS-WEB-CANVAS-DRAFT-LIFECYCLE',
  'Canvas draft lifecycle aggregate health is observable through component-quality and files query output.',
  'dashboard',
  true,
  'implemented'
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.web_canvas_draft_lifecycle_dependency_map;
drop table if exists pg_temp.web_canvas_draft_lifecycle_leaf_map;

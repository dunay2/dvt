/** Owned concern: present persisted, authorized selection and provenance evidence. */
import type { PlanPreviewSelectionIntentViewModel, PlanViewModel } from '../../types/plans';
import { PlanExecutionDecisionView } from '../PlanExecutionDecisionView';
import { PlanPreviewField, PlanPreviewFieldGrid, PlanPreviewSection } from './PlanPreviewFields';
import type { PlanPreviewModalMessages } from './PlanPreviewMessages';
import styles from './PlanPreview.module.css';
export function PlanPreviewEvidence(
  props: Readonly<{ plan: PlanViewModel; messages: PlanPreviewModalMessages }>
): JSX.Element {
  return (
    <>
      <PlanPreviewMetadata {...props} />
      <PlanPreviewProvenance {...props} />
    </>
  );
}
function PlanPreviewMetadata({
  plan,
  messages,
}: Readonly<{ plan: PlanViewModel; messages: PlanPreviewModalMessages }>) {
  const { persisted: persistedPreview, selectionIntent } = plan.preview ?? {};
  return (
    <>
      {' '}
      {persistedPreview ? (
        <PlanPreviewSection
          title={messages.planPreviewPersistenceTitle}
          caption={messages.planPreviewPersistenceCaption}
        >
          <div className={styles.fieldGrid}>
            <PlanPreviewField label={messages.planPreviewRecordLabel} long>
              {persistedPreview.planRecordId}
            </PlanPreviewField>
            <PlanPreviewField label={messages.planPreviewCanonicalShaLabel} long>
              {persistedPreview.canonicalPlanSha256}
            </PlanPreviewField>
          </div>
        </PlanPreviewSection>
      ) : null}
      {selectionIntent ? (
        <PlanPreviewSelectionReview selectionIntent={selectionIntent} messages={messages} />
      ) : null}
      {plan.decisions ? (
        <PlanExecutionDecisionView
          decisions={plan.decisions}
          messages={{
            title: messages.planPreviewDecisionsTitle,
            caption: messages.planPreviewDecisionsCaption,
            subjectLabel: messages.planPreviewDecisionSubjectLabel,
            statusLabel: messages.planPreviewDecisionStatusLabel,
            reasonLabel: messages.planPreviewDecisionReasonLabel,
            includedLabel: messages.planPreviewDecisionIncludedLabel,
            excludedLabel: messages.planPreviewDecisionExcludedLabel,
            statusRun: messages.planPreviewDecisionRunLabel,
            statusSkip: messages.planPreviewDecisionSkipLabel,
            statusPartial: messages.planPreviewDecisionPartialLabel,
            reasonSelectedRoot: messages.planPreviewDecisionSelectedRootReason,
            reasonSelectedClosure: messages.planPreviewDecisionSelectedClosureReason,
            reasonOutsideSelectedClosure: messages.planPreviewDecisionOutsideClosureReason,
            reasonBoundedSelection: messages.planPreviewDecisionBoundedSelectionReason,
          }}
        />
      ) : null}
    </>
  );
}

function PlanPreviewSelectionReview({
  selectionIntent,
  messages,
}: Readonly<{
  selectionIntent: PlanPreviewSelectionIntentViewModel;
  messages: PlanPreviewModalMessages;
}>) {
  return (
    <PlanPreviewSection
      title={messages.planPreviewSelectionTitle}
      caption={messages.planPreviewSelectionCaption}
    >
      <div className={styles.fieldGrid}>
        <PlanPreviewField label={messages.planPreviewSelectionModeLabel}>
          {selectionIntent.mode === 'explicit'
            ? messages.planPreviewSelectionExplicitValue
            : messages.planPreviewSelectionWorkspaceDefaultValue}
        </PlanPreviewField>
        <PlanPreviewField label={messages.planPreviewRequestedResourcesLabel} long>
          {selectionIntent.requestedRootNodeIds.join(', ')}
        </PlanPreviewField>
        <PlanPreviewField label={messages.planPreviewIncludedDependenciesLabel} long>
          {selectionIntent.derivedDependencyNodeIds.join(', ') || messages.planPreviewNoneValue}
        </PlanPreviewField>
        <PlanPreviewField label={messages.planPreviewAuthorizedScopeLabel} long>
          {selectionIntent.authorizedScopeNodeIds.join(', ')}
        </PlanPreviewField>
      </div>
    </PlanPreviewSection>
  );
}

function PlanPreviewProvenance({
  plan,
  messages,
}: Readonly<{ plan: PlanViewModel; messages: PlanPreviewModalMessages }>) {
  const provenance = plan.preview?.provenance;
  if (!provenance) return null;
  const captions = {
    'dbt-project-files': messages.planPreviewDbtProvenanceCaption,
    'dvt-protected-workspace-graph': messages.planPreviewDvtProvenanceCaption,
    'transformation-git-artifacts': messages.planPreviewRepositoryProvenanceCaption,
  };
  return (
    <PlanPreviewSection
      title={messages.planPreviewProvenanceTitle}
      caption={captions[provenance.kind ?? 'transformation-git-artifacts']}
    >
      <PlanPreviewProvenanceFields
        provenance={provenance}
        selectionIntent={plan.preview?.selectionIntent}
        messages={messages}
      />
    </PlanPreviewSection>
  );
}

function PlanPreviewProvenanceFields({
  provenance,
  selectionIntent,
  messages,
}: Readonly<{
  provenance: NonNullable<NonNullable<PlanViewModel['preview']>['provenance']>;
  selectionIntent: NonNullable<PlanViewModel['preview']>['selectionIntent'];
  messages: PlanPreviewModalMessages;
}>) {
  if (provenance.kind === 'dbt-project-files') {
    const fields = [
      { label: messages.planPreviewCanvasLabel, value: provenance.canvasId, long: true },
      { label: messages.planPreviewProjectRootLabel, value: provenance.projectRoot, long: true },
      { label: messages.planPreviewDbtVersionLabel, value: provenance.dbtVersion },
      {
        label: messages.planPreviewProjectRevisionLabel,
        value: provenance.contentSetSha256,
        long: true,
      },
      {
        label: messages.planPreviewAnalysisRevisionLabel,
        value: provenance.analysisSha256,
        long: true,
      },
      ...(selectionIntent
        ? []
        : [
            {
              label: messages.planPreviewSelectedResourcesLabel,
              value: provenance.selectedUniqueIds.join(', '),
              long: true,
            },
          ]),
    ];
    return <PlanPreviewFieldGrid fields={fields} />;
  }
  if (provenance.kind === 'dvt-protected-workspace-graph')
    return (
      <PlanPreviewFieldGrid
        fields={[
          { label: messages.planPreviewCanvasLabel, value: provenance.canvasId, long: true },
        ]}
      />
    );
  const fields = [
    ...(provenance.graphArtifact
      ? [
          {
            label: messages.planPreviewGraphArtifactLabel,
            value: (
              <>
                {provenance.graphArtifact.repo}: {provenance.graphArtifact.path}
              </>
            ),
            long: true,
          },
        ]
      : []),
    ...(provenance.sqlArtifact
      ? [
          {
            label: messages.planPreviewSqlArtifactLabel,
            value: (
              <>
                {provenance.sqlArtifact.repo}: {provenance.sqlArtifact.path}
              </>
            ),
            long: true,
          },
        ]
      : []),
  ];
  return <PlanPreviewFieldGrid fields={fields} />;
}

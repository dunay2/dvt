import { XCircle, Clock, Zap, AlertTriangle, Download } from 'lucide-react';
import type { ReactNode } from 'react';

import type { DbtEdge } from '../types/dbt';
import type { PlanViewModel } from '../types/plans';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface PlanPreviewModalProps {
  open: boolean;
  onClose: () => void;
  plan: PlanViewModel | null;
  startRunDisabled?: boolean;
  startRunMessage?: string;
  onStartRun: () => void;
}

function formatPlanCost(estimatedCost: number | undefined): string {
  return typeof estimatedCost === 'number' && Number.isFinite(estimatedCost)
    ? `$${estimatedCost.toFixed(2)}`
    : 'Not estimated';
}

function PlanPreviewSection({
  title,
  caption,
  children,
}: Readonly<{
  title: string;
  caption?: string;
  children: ReactNode;
}>) {
  return (
    <section className="min-w-0 rounded-lg border border-slate-700/80 bg-slate-900/75 p-3 shadow-sm sm:p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-50">{title}</h3>
        {caption ? <p className="mt-1 text-xs text-slate-400">{caption}</p> : null}
      </div>
      {children}
    </section>
  );
}

function PlanPreviewField({
  label,
  children,
  long = false,
  mono = false,
}: Readonly<{
  label: string;
  children: ReactNode;
  long?: boolean;
  mono?: boolean;
}>) {
  const valueClassName = long
    ? 'block min-w-0 break-all font-mono text-xs leading-5 text-blue-300'
    : mono
      ? 'font-mono text-xs text-blue-300'
      : 'text-sm font-medium text-slate-50';

  return (
    <div className="min-w-0 rounded-md border border-slate-800 bg-slate-950/45 px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div
        data-testid={long ? 'plan-preview-long-value' : undefined}
        className={`mt-1 ${valueClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

export function PlanPreviewModal({
  open,
  onClose,
  plan,
  startRunDisabled = false,
  startRunMessage,
  onStartRun,
}: PlanPreviewModalProps) {
  if (!plan) return null;

  const previewSummary = plan.preview?.summary;
  const persistedPreview = plan.preview?.persisted;
  const provenance = plan.preview?.provenance;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        data-testid="plan-preview-modal"
        className="min-w-0 max-h-[92vh] w-[calc(100vw-2rem)] gap-0 overflow-hidden border-slate-700 bg-slate-950 p-0 text-slate-50 shadow-2xl sm:max-w-4xl"
      >
        <DialogHeader className="min-w-0 border-b border-slate-800 px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle className="flex min-w-0 flex-wrap items-center gap-2 pr-8 text-lg text-slate-50 sm:text-xl">
            Execution Preview
            <Badge variant="outline" className="border-blue-400/50 bg-blue-500/10 text-blue-100">
              Read-only
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-slate-200">
            Review the immutable execution preview before starting a run.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 max-h-[70vh] overflow-y-auto overflow-x-hidden">
          <div className="min-w-0 space-y-4 px-4 py-4 sm:px-6 sm:py-5">
            {startRunMessage ? (
              <div className="rounded-md border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-50">
                {startRunMessage}
              </div>
            ) : null}

            <PlanPreviewSection
              title="Execution Preview identity"
              caption="Immutable identifiers for the persisted preview."
            >
              <div className="grid min-w-0 gap-3 md:grid-cols-2">
                <PlanPreviewField label="Preview ID" long>
                  {plan.planId}
                </PlanPreviewField>
                <PlanPreviewField label="Version">{plan.planVersion}</PlanPreviewField>
                {plan.planRef ? (
                  <div className="md:col-span-2">
                    <PlanPreviewField label="Preview Ref" long>
                      {plan.planRef.uri}
                    </PlanPreviewField>
                  </div>
                ) : null}
                <PlanPreviewField label="Generated" mono>
                  {new Date(plan.generatedAt).toLocaleString()}
                </PlanPreviewField>
                <PlanPreviewField label="Estimated cost">
                  <span
                    className={
                      typeof plan.estimatedCost === 'number' ? 'text-green-300' : 'text-slate-300'
                    }
                  >
                    {formatPlanCost(plan.estimatedCost)}
                  </span>
                </PlanPreviewField>
              </div>
            </PlanPreviewSection>

            <PlanPreviewSection
              title="Execution target"
              caption="Runtime posture that will be used when the run starts."
            >
              <div className="grid min-w-0 gap-3 md:grid-cols-3">
                <PlanPreviewField label="Executor">
                  {previewSummary?.executor ?? 'Not reported'}
                </PlanPreviewField>
                <PlanPreviewField label="Adapter">{plan.adapter || 'Unknown'}</PlanPreviewField>
                <PlanPreviewField label="Target">
                  <Badge variant="secondary">{plan.target}</Badge>
                </PlanPreviewField>
              </div>
              {plan.capabilities.length > 0 ? (
                <div className="mt-4 flex min-w-0 flex-wrap gap-2">
                  <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                    <Zap className="size-3.5 text-yellow-300" />
                    Capabilities
                  </span>
                  {plan.capabilities.map((capability) => (
                    <Badge
                      key={capability}
                      variant="outline"
                      className="border-slate-600 bg-slate-950/50 text-slate-200"
                    >
                      {capability}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </PlanPreviewSection>

            {previewSummary ? (
              <PlanPreviewSection
                title="Persisted preview summary"
                caption="Graph size and table scope captured by the execution preview."
              >
                <div className="grid min-w-0 gap-3 md:grid-cols-2">
                  <PlanPreviewField label="Nodes">{previewSummary.nodeCount}</PlanPreviewField>
                  <PlanPreviewField label="Steps">{previewSummary.stepCount}</PlanPreviewField>
                  <PlanPreviewField label="Source tables">
                    {previewSummary.sourceTables.join(', ') || 'n/a'}
                  </PlanPreviewField>
                  <PlanPreviewField label="Sink tables">
                    {previewSummary.sinkTables.join(', ') || 'n/a'}
                  </PlanPreviewField>
                </div>
              </PlanPreviewSection>
            ) : null}

            {persistedPreview ? (
              <PlanPreviewSection
                title="Persistence evidence"
                caption="Proof that this preview is backed by a stored canonical preview."
              >
                <div className="grid min-w-0 gap-3 md:grid-cols-2">
                  <PlanPreviewField label="Preview record" long>
                    {persistedPreview.planRecordId}
                  </PlanPreviewField>
                  <PlanPreviewField label="Canonical preview SHA" long>
                    {persistedPreview.canonicalPlanSha256}
                  </PlanPreviewField>
                </div>
              </PlanPreviewSection>
            ) : null}

            {provenance ? (
              <PlanPreviewSection
                title="Provenance"
                caption="Repository artifacts used to generate the preview."
              >
                <div className="grid min-w-0 gap-3 md:grid-cols-2">
                  {provenance.graphArtifact ? (
                    <PlanPreviewField label="Graph artifact" long>
                      {provenance.graphArtifact.repo}: {provenance.graphArtifact.path}
                    </PlanPreviewField>
                  ) : null}
                  {provenance.sqlArtifact ? (
                    <PlanPreviewField label="SQL artifact" long>
                      {provenance.sqlArtifact.repo}: {provenance.sqlArtifact.path}
                    </PlanPreviewField>
                  ) : null}
                </div>
              </PlanPreviewSection>
            ) : null}

            <PlanPreviewSection
              title="Execution steps"
              caption="Step order and policy settings that will be submitted to the runtime."
            >
              <ol className="space-y-3">
                {plan.steps.map((step, index) => (
                  <li
                    key={step.id}
                    className="min-w-0 rounded-md border border-slate-800 bg-slate-950/45 p-3"
                  >
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-400">Step {index + 1}</span>
                          <span className="font-medium text-slate-50">{step.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {step.type}
                          </Badge>
                        </div>
                        <div className="mt-1 break-all font-mono text-[11px] text-slate-500">
                          {step.id}
                        </div>
                      </div>
                      <span className="text-xs text-slate-300">{step.nodes.length} nodes</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                      {step.policies.timeout ? (
                        <span className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1">
                          <Clock className="size-3" />
                          Timeout {step.policies.timeout}s
                        </span>
                      ) : null}
                      {step.policies.retries ? (
                        <span className="rounded border border-slate-700 px-2 py-1">
                          Retries {step.policies.retries}
                        </span>
                      ) : null}
                      {step.policies.concurrency ? (
                        <span className="rounded border border-slate-700 px-2 py-1">
                          Concurrency {step.policies.concurrency}
                        </span>
                      ) : null}
                      {step.policies.warehouse ? (
                        <span className="rounded border border-slate-700 px-2 py-1">
                          Warehouse {step.policies.warehouse}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </PlanPreviewSection>
          </div>
        </div>

        <DialogFooter className="min-w-0 border-t border-slate-800 bg-slate-950/95 px-4 py-4 sm:px-6">
          <Button variant="outline" onClick={onClose}>
            <Download className="size-4 mr-2" />
            Export JSON
          </Button>
          <Button
            disabled={startRunDisabled}
            onClick={() => {
              onStartRun();
            }}
          >
            Start Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmEdgeModalProps {
  open: boolean;
  onClose: () => void;
  edge: { source: string; target: string; type: string } | null;
  onConfirm: () => void;
}

export function ConfirmEdgeModal({ open, onClose, edge, onConfirm }: ConfirmEdgeModalProps) {
  if (!edge) return null;

  const getEdgeDescription = () => {
    switch (edge.type) {
      case 'ref':
        return `Add ref() dependency from ${edge.source} to ${edge.target}?`;
      case 'source':
        return `Add source() dependency from ${edge.source} to ${edge.target}?`;
      case 'test':
        return `Attach test ${edge.target} to ${edge.source}?`;
      case 'exposure':
        return `Add exposure dependency from ${edge.source} to ${edge.target}?`;
      default:
        return `Create dependency from ${edge.source} to ${edge.target}?`;
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <AlertDialogContent className="bg-slate-950 border-slate-600 text-slate-50">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Dependency</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300">
            {getEdgeDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="my-4 p-3 bg-slate-900 border border-slate-700 rounded">
          <div className="text-sm font-mono">
            <span className="text-blue-400">{edge.source}</span>
            <span className="text-slate-400 mx-2">{'->'}</span>
            <span className="text-green-400">{edge.target}</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Type:{' '}
            <Badge variant="outline" className="ml-1">
              {edge.type}
            </Badge>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface PermissionDeniedModalProps {
  open: boolean;
  onClose: () => void;
  action: string;
}

export function PermissionDeniedModal({ open, onClose, action }: PermissionDeniedModalProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <AlertDialogContent className="bg-slate-950 border-slate-600 text-slate-50">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-400">
            <XCircle className="size-5" />
            Permission Denied
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300">
            You do not have permission to {action}. Please contact your administrator.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface NetworkDegradedModalProps {
  open: boolean;
  onClose: () => void;
}

export function NetworkDegradedModal({ open, onClose }: NetworkDegradedModalProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <AlertDialogContent className="bg-slate-950 border-slate-600 text-slate-50">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle className="size-5" />
            Network Degraded
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300">
            Connection to the server is degraded. You can continue in read-only mode, or retry the
            connection.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Read-Only Mode</AlertDialogCancel>
          <AlertDialogAction onClick={onClose}>Retry</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface RePlanRequiredModalProps {
  open: boolean;
  onClose: () => void;
  onRePlan: () => void;
}

export function RePlanRequiredModal({ open, onClose, onRePlan }: RePlanRequiredModalProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <AlertDialogContent className="bg-slate-950 border-slate-600 text-slate-50">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-orange-400">
            <AlertTriangle className="size-5" />
            Execution Preview Required (409 Conflict)
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300">
            The current execution preview is outdated. The project state has changed. Preview the
            execution preview again before starting a run.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onRePlan();
              onClose();
            }}
          >
            Preview execution plan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

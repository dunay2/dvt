import {
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Zap,
  AlertTriangle,
  Download,
} from 'lucide-react';

import { ExecutionPlan, DbtEdge } from '../types/dbt';

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
import { Card } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';

interface PlanPreviewModalProps {
  open: boolean;
  onClose: () => void;
  plan: ExecutionPlan | null;
  startRunDisabled?: boolean;
  startRunMessage?: string;
  onStartRun: () => void;
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-slate-950 border-slate-600 text-slate-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-50">
            Execution Plan Preview
            <Badge variant="outline" className="ml-2">
              Read-only
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-slate-200">
            Plan is immutable. Review before starting run.
          </DialogDescription>
        </DialogHeader>

        {startRunMessage ? (
          <div className="rounded border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-200">
            {startRunMessage}
          </div>
        ) : null}

        <ScrollArea className="max-h-[500px]">
          <div className="space-y-4">
            {/* Plan Metadata */}
            <Card className="bg-slate-900 border-slate-700 p-4 text-slate-50">
              <h3 className="text-sm font-medium mb-3 text-slate-50">Plan Metadata</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-300">Plan ID:</span>
                  <code className="ml-2 text-blue-400">{plan.planId}</code>
                </div>
                <div>
                  <span className="text-slate-300">Version:</span>
                  <span className="ml-2">{plan.planVersion}</span>
                </div>
                {plan.planRef ? (
                  <div className="col-span-2">
                    <span className="text-slate-300">Plan Ref:</span>
                    <code className="ml-2 break-all text-blue-400">{plan.planRef.uri}</code>
                  </div>
                ) : null}
                <div>
                  <span className="text-slate-300">Adapter:</span>
                  <span className="ml-2">{plan.adapter}</span>
                </div>
                <div>
                  <span className="text-slate-300">Target:</span>
                  <Badge variant="secondary" className="ml-2">
                    {plan.target}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-300">Generated:</span>
                  <span className="ml-2 text-xs">
                    {new Date(plan.generatedAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-300">Est. Cost:</span>
                  <span className="ml-2 text-green-400">${plan.estimatedCost?.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {plan.preview?.summary ? (
              <Card className="bg-slate-900 border-slate-700 p-4 text-slate-50">
                <h3 className="text-sm font-medium mb-3 text-slate-50">Persisted Preview Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-300">Executor:</span>
                    <span className="ml-2">{plan.preview.summary.executor}</span>
                  </div>
                  <div>
                    <span className="text-slate-300">Nodes:</span>
                    <span className="ml-2">{plan.preview.summary.nodeCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-300">Steps:</span>
                    <span className="ml-2">{plan.preview.summary.stepCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-300">Sink tables:</span>
                    <span className="ml-2">{plan.preview.summary.sinkTables.join(', ') || 'n/a'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-300">Source tables:</span>
                    <span className="ml-2">{plan.preview.summary.sourceTables.join(', ') || 'n/a'}</span>
                  </div>
                </div>
              </Card>
            ) : null}

            {plan.preview?.persisted ? (
              <Card className="bg-slate-900 border-slate-700 p-4 text-slate-50">
                <h3 className="text-sm font-medium mb-3 text-slate-50">Persistence Evidence</h3>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <span className="text-slate-300">Plan record:</span>
                    <code className="ml-2 text-blue-400">{plan.preview.persisted.planRecordId}</code>
                  </div>
                  <div>
                    <span className="text-slate-300">Canonical SHA:</span>
                    <code className="ml-2 break-all text-green-400">
                      {plan.preview.persisted.canonicalPlanSha256}
                    </code>
                  </div>
                </div>
              </Card>
            ) : null}

            {plan.preview?.provenance ? (
              <Card className="bg-slate-900 border-slate-700 p-4 text-slate-50">
                <h3 className="text-sm font-medium mb-3 text-slate-50">Provenance</h3>
                <div className="space-y-3 text-sm">
                  {plan.preview.provenance.graphArtifact ? (
                    <div>
                      <div className="text-slate-300">Graph artifact</div>
                      <code className="text-blue-400">
                        {plan.preview.provenance.graphArtifact.repo}:{' '}
                        {plan.preview.provenance.graphArtifact.path}
                      </code>
                    </div>
                  ) : null}
                  {plan.preview.provenance.sqlArtifact ? (
                    <div>
                      <div className="text-slate-300">SQL artifact</div>
                      <code className="text-blue-400">
                        {plan.preview.provenance.sqlArtifact.repo}:{' '}
                        {plan.preview.provenance.sqlArtifact.path}
                      </code>
                    </div>
                  ) : null}
                </div>
              </Card>
            ) : null}

            {/* Capabilities */}
            <Card className="bg-slate-900 border-slate-700 p-4 text-slate-50">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-slate-50">
                <Zap className="size-4 text-yellow-400" />
                Capabilities
              </h3>
              <div className="flex flex-wrap gap-2">
                {plan.capabilities.map((cap) => (
                  <Badge key={cap} variant="outline">
                    {cap}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Steps */}
            <Card className="bg-slate-900 border-slate-700 p-4 text-slate-50">
              <h3 className="text-sm font-medium mb-3 text-slate-50">Execution Steps</h3>
              <div className="space-y-3">
                {plan.steps.map((step, idx) => (
                  <div key={step.id} className="border-l-2 border-blue-500 pl-3 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Step {idx + 1}</span>
                        <span className="font-medium text-slate-50">{step.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {step.type}
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-300">{step.nodes.length} nodes</span>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-300">
                      {step.policies.timeout && (
                        <div className="flex items-center gap-1">
                          <Clock className="size-3" />
                          Timeout: {step.policies.timeout}s
                        </div>
                      )}
                      {step.policies.retries && <div>Retries: {step.policies.retries}</div>}
                      {step.policies.concurrency && (
                        <div>Concurrency: {step.policies.concurrency}</div>
                      )}
                      {step.policies.warehouse && <div>Warehouse: {step.policies.warehouse}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <Download className="size-4 mr-2" />
            Export JSON
          </Button>
          <Button
            disabled={startRunDisabled}
            onClick={() => {
              onStartRun();
              onClose();
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
    <AlertDialog open={open} onOpenChange={onClose}>
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
    <AlertDialog open={open} onOpenChange={onClose}>
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
    <AlertDialog open={open} onOpenChange={onClose}>
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
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="bg-slate-950 border-slate-600 text-slate-50">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-orange-400">
            <AlertTriangle className="size-5" />
            Re-Plan Required (409 Conflict)
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300">
            The current execution plan is outdated. The project state has changed. Please create a
            new plan.
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
            Create New Plan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

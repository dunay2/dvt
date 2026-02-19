import { ExecutionPlan, DbtEdge } from '../types/dbt';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
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
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import {
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Zap,
  AlertTriangle,
  Download,
} from 'lucide-react';

interface PlanPreviewModalProps {
  open: boolean;
  onClose: () => void;
  plan: ExecutionPlan | null;
  onStartRun: () => void;
}

export function PlanPreviewModal({ open, onClose, plan, onStartRun }: PlanPreviewModalProps) {
  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-[#1a1d23] border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Execution Plan Preview
            <Badge variant="outline" className="ml-2">
              Read-only
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Plan is immutable. Review before starting run.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px]">
          <div className="space-y-4">
            {/* Plan Metadata */}
            <Card className="bg-[#0f1116] border-gray-800 p-4">
              <h3 className="text-sm font-medium mb-3">Plan Metadata</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Plan ID:</span>
                  <code className="ml-2 text-blue-400">{plan.planId}</code>
                </div>
                <div>
                  <span className="text-gray-400">Version:</span>
                  <span className="ml-2">{plan.planVersion}</span>
                </div>
                <div>
                  <span className="text-gray-400">Adapter:</span>
                  <span className="ml-2">{plan.adapter}</span>
                </div>
                <div>
                  <span className="text-gray-400">Target:</span>
                  <Badge variant="secondary" className="ml-2">
                    {plan.target}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-400">Generated:</span>
                  <span className="ml-2 text-xs">
                    {new Date(plan.generatedAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Est. Cost:</span>
                  <span className="ml-2 text-green-400">${plan.estimatedCost?.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {/* Capabilities */}
            <Card className="bg-[#0f1116] border-gray-800 p-4">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
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
            <Card className="bg-[#0f1116] border-gray-800 p-4">
              <h3 className="text-sm font-medium mb-3">Execution Steps</h3>
              <div className="space-y-3">
                {plan.steps.map((step, idx) => (
                  <div key={step.id} className="border-l-2 border-blue-500 pl-3 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Step {idx + 1}</span>
                        <span className="font-medium">{step.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {step.type}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-400">{step.nodes.length} nodes</span>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-400">
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
      <AlertDialogContent className="bg-[#1a1d23] border-gray-700 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Dependency</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            {getEdgeDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="my-4 p-3 bg-[#0f1116] border border-gray-800 rounded">
          <div className="text-sm font-mono">
            <span className="text-blue-400">{edge.source}</span>
            <span className="text-gray-500 mx-2">→</span>
            <span className="text-green-400">{edge.target}</span>
          </div>
          <div className="text-xs text-gray-500 mt-2">
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
      <AlertDialogContent className="bg-[#1a1d23] border-gray-700 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-400">
            <XCircle className="size-5" />
            Permission Denied
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
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
      <AlertDialogContent className="bg-[#1a1d23] border-gray-700 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle className="size-5" />
            Network Degraded
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
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
      <AlertDialogContent className="bg-[#1a1d23] border-gray-700 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-orange-400">
            <AlertTriangle className="size-5" />
            Re-Plan Required (409 Conflict)
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
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

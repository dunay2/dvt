import { AlertTriangle, XCircle } from 'lucide-react';

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

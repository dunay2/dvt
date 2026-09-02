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

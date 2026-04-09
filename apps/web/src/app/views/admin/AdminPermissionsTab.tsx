import { CheckCircle2, XCircle } from 'lucide-react';
import type { Role } from '../../types/dbt';
import { Card } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { adminViewCopy as copy } from './copy';

export function AdminPermissionsTab({ roles }: Readonly<{ roles: Role[] }>) {
  return (
    <div className="mt-6">
      <Card className="border-slate-700 bg-slate-900">
        <div className="p-5">
          <h3 className="mb-4 font-semibold">{copy.sections.permissionMatrixTitle}</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-white">{copy.labels.role}</TableHead>
                  <TableHead className="text-center text-white">Plan</TableHead>
                  <TableHead className="text-center text-white">Run</TableHead>
                  <TableHead className="text-center text-white">Edit Edges</TableHead>
                  <TableHead className="text-center text-white">Manage Plugins</TableHead>
                  <TableHead className="text-center text-white">Manage RBAC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id} className="border-slate-700">
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <PermissionCell enabled={role.permissions.canPlan} />
                    <PermissionCell enabled={role.permissions.canRun} />
                    <PermissionCell enabled={role.permissions.canEditEdges} />
                    <PermissionCell enabled={role.permissions.canManagePlugins} />
                    <PermissionCell enabled={role.permissions.canManageRBAC} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PermissionCell({ enabled }: Readonly<{ enabled: boolean }>) {
  return (
    <TableCell className="text-center">
      {enabled ? (
        <CheckCircle2 className="mx-auto size-4 text-green-400" />
      ) : (
        <XCircle className="mx-auto size-4 text-slate-400" />
      )}
    </TableCell>
  );
}

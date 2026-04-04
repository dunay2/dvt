import { CheckCircle2, Users, XCircle } from 'lucide-react';
import type { Role } from '../../types/dbt';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/ui/utils';
import { adminViewCopy as copy } from './copy';
import { getRolePermissionLabel } from './adminViewModel';

export function AdminRolesTab({ roles }: Readonly<{ roles: Role[] }>) {
  return (
    <div className="mt-6 space-y-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Users className="size-4 text-cyan-400" />
          {copy.sections.rolesSubtitle}
        </div>
        <Button variant="default">{copy.actions.createRole}</Button>
      </div>

      {roles.map((role) => (
        <Card key={role.id} className="border-slate-700 bg-slate-900 p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="mb-2 font-semibold">{role.name}</h3>
              {Object.keys(role.scope).length > 0 ? (
                <div className="flex gap-2">
                  {Object.entries(role.scope).map(([key, value]) => (
                    <Badge key={key} variant="secondary" className="text-xs">
                      {key}: {value}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
            <Button variant="outline" size="sm">
              {copy.actions.edit}
            </Button>
          </div>

          <div className="grid grid-cols-5 gap-3 text-sm">
            {Object.entries(role.permissions).map(([permissionKey, enabled]) => (
              <div
                key={permissionKey}
                className={cn(
                  'flex items-center gap-2 rounded border p-2',
                  enabled
                    ? 'border-green-800 bg-green-900/20 text-green-400'
                    : 'border-slate-700 bg-gray-900/20 text-slate-400'
                )}
              >
                {enabled ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                <span className="text-xs">
                  {getRolePermissionLabel(permissionKey as keyof Role['permissions'])}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}


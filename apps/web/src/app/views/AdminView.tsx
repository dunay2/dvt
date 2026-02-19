import { Shield, Users, FileText, CheckCircle2, XCircle, Search } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { cn } from '../components/ui/utils';
import { mockRoles, mockAuditLog } from '../data/mockDbtData';

export default function AdminView() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAuditLog = searchQuery
    ? mockAuditLog.filter(
        (entry) =>
          entry.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.resource.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : mockAuditLog;

  return (
    <div className="h-full bg-[#1a1d23] flex flex-col">
      {/* Header */}
      <div className="bg-[#0f1116] border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="size-6 text-red-400" />
            <h1 className="text-xl font-semibold">Admin & RBAC</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <Tabs defaultValue="roles" className="max-w-6xl mx-auto">
            <TabsList className="bg-[#0f1116] border border-gray-800">
              <TabsTrigger value="roles">
                <Users className="size-4 mr-2" />
                Roles
              </TabsTrigger>
              <TabsTrigger value="permissions">
                <Shield className="size-4 mr-2" />
                Permissions
              </TabsTrigger>
              <TabsTrigger value="audit">
                <FileText className="size-4 mr-2" />
                Audit Log
              </TabsTrigger>
            </TabsList>

            {/* Roles Tab */}
            <TabsContent value="roles" className="space-y-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-400">Manage user roles and permissions</p>
                <Button variant="default">Create Role</Button>
              </div>

              {mockRoles.map((role) => (
                <Card key={role.id} className="bg-[#0f1116] border-gray-800 p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold mb-2">{role.name}</h3>
                      {Object.keys(role.scope).length > 0 && (
                        <div className="flex gap-2">
                          {Object.entries(role.scope).map(([key, value]) => (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {key}: {value}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>

                  <div className="grid grid-cols-5 gap-3 text-sm">
                    {Object.entries(role.permissions).map(([perm, enabled]) => (
                      <div
                        key={perm}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded border',
                          enabled
                            ? 'bg-green-900/20 border-green-800 text-green-400'
                            : 'bg-gray-900/20 border-gray-800 text-gray-500'
                        )}
                      >
                        {enabled ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <XCircle className="size-4" />
                        )}
                        <span className="text-xs">
                          {perm
                            .replace('can', '')
                            .replace(/([A-Z])/g, ' $1')
                            .trim()}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* Permissions Matrix Tab */}
            <TabsContent value="permissions" className="mt-6">
              <Card className="bg-[#0f1116] border-gray-800">
                <div className="p-5">
                  <h3 className="font-semibold mb-4">Permission Matrix</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800">
                          <TableHead className="text-white">Role</TableHead>
                          <TableHead className="text-white text-center">Plan</TableHead>
                          <TableHead className="text-white text-center">Run</TableHead>
                          <TableHead className="text-white text-center">Edit Edges</TableHead>
                          <TableHead className="text-white text-center">Manage Plugins</TableHead>
                          <TableHead className="text-white text-center">Manage RBAC</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockRoles.map((role) => (
                          <TableRow key={role.id} className="border-gray-800">
                            <TableCell className="font-medium">{role.name}</TableCell>
                            <TableCell className="text-center">
                              {role.permissions.canPlan ? (
                                <CheckCircle2 className="size-4 text-green-400 mx-auto" />
                              ) : (
                                <XCircle className="size-4 text-gray-600 mx-auto" />
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {role.permissions.canRun ? (
                                <CheckCircle2 className="size-4 text-green-400 mx-auto" />
                              ) : (
                                <XCircle className="size-4 text-gray-600 mx-auto" />
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {role.permissions.canEditEdges ? (
                                <CheckCircle2 className="size-4 text-green-400 mx-auto" />
                              ) : (
                                <XCircle className="size-4 text-gray-600 mx-auto" />
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {role.permissions.canManagePlugins ? (
                                <CheckCircle2 className="size-4 text-green-400 mx-auto" />
                              ) : (
                                <XCircle className="size-4 text-gray-600 mx-auto" />
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {role.permissions.canManageRBAC ? (
                                <CheckCircle2 className="size-4 text-green-400 mx-auto" />
                              ) : (
                                <XCircle className="size-4 text-gray-600 mx-auto" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Audit Log Tab */}
            <TabsContent value="audit" className="mt-6">
              <div className="mb-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search audit log..."
                    className="pl-10 bg-[#1a1d23] border-gray-700"
                  />
                </div>
              </div>

              <Card className="bg-[#0f1116] border-gray-800">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-white">Timestamp</TableHead>
                      <TableHead className="text-white">User</TableHead>
                      <TableHead className="text-white">Action</TableHead>
                      <TableHead className="text-white">Resource</TableHead>
                      <TableHead className="text-white">Details</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuditLog.map((entry) => (
                      <TableRow key={entry.id} className="border-gray-800">
                        <TableCell className="text-xs font-mono text-gray-400">
                          {new Date(entry.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">{entry.user}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{entry.resource}</TableCell>
                        <TableCell className="text-sm text-gray-400 max-w-md truncate">
                          {entry.details}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              entry.status === 'success' && 'bg-green-600',
                              entry.status === 'failed' && 'bg-red-600'
                            )}
                          >
                            {entry.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}

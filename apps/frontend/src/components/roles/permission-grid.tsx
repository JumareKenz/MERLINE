'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { PermissionGroup } from '@/types/role';

interface PermissionGridProps {
  groups: PermissionGroup[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function PermissionGrid({ groups, selectedIds, onChange }: PermissionGridProps) {
  const handleToggle = useCallback(
    (permissionId: string) => {
      const newIds = selectedIds.includes(permissionId)
        ? selectedIds.filter((id) => id !== permissionId)
        : [...selectedIds, permissionId];
      onChange(newIds);
    },
    [selectedIds, onChange]
  );

  const handleSelectAllInGroup = useCallback(
    (group: PermissionGroup, checked: boolean) => {
      const groupIds = group.permissions.map((p) => p.id);
      const newIds = checked
        ? [...new Set([...selectedIds, ...groupIds])]
        : selectedIds.filter((id) => !groupIds.includes(id));
      onChange(newIds);
    },
    [selectedIds, onChange]
  );

  const isGroupFullySelected = (group: PermissionGroup) =>
    group.permissions.every((p) => selectedIds.includes(p.id));

  const isGroupPartiallySelected = (group: PermissionGroup) =>
    group.permissions.some((p) => selectedIds.includes(p.id)) && !isGroupFullySelected(group);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Card key={group.module}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{group.label}</CardTitle>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`select-all-${group.module}`}
                  checked={isGroupFullySelected(group)}
                  aria-checked={isGroupPartiallySelected(group) ? 'mixed' : isGroupFullySelected(group)}
                  data-indeterminate={isGroupPartiallySelected(group) ? '' : undefined}
                  onCheckedChange={(checked) =>
                    handleSelectAllInGroup(group, checked === true)
                  }
                />
                <Label htmlFor={`select-all-${group.module}`} className="text-sm font-normal cursor-pointer">
                  Select All
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.permissions.map((permission) => (
                <div key={permission.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`perm-${permission.id}`}
                    checked={selectedIds.includes(permission.id)}
                    onCheckedChange={() => handleToggle(permission.id)}
                  />
                  <Label
                    htmlFor={`perm-${permission.id}`}
                    className="text-sm font-normal cursor-pointer leading-tight"
                  >
                    {permission.name}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

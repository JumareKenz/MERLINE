'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Role } from '@/types/role';
import type { Member } from '@/types/user';

interface UserRoleSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Member | null;
  roles: Role[];
  onSave: (userId: string, roleId: string) => Promise<void>;
}

export function UserRoleSelector({ open, onOpenChange, user, roles, onSave }: UserRoleSelectorProps) {
  const [selectedRoleId, setSelectedRoleId] = useState(user?.role?.id || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!user || !selectedRoleId) return;
    setIsLoading(true);
    try {
      await onSave(user.user_id, selectedRoleId);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change User Role</DialogTitle>
          <DialogDescription>
            Update role for {user?.user?.firstName} {user?.user?.lastName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <Label>New Role</Label>
          <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={isLoading} disabled={!selectedRoleId}>
            Update Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

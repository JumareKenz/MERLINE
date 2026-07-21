'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type { UpdateOrganizationDto } from '@/types/organization';
import type { CreateUserDto, UserFilterParams } from '@/types/user';

export function useOrganization() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: () => API.organizations.get(),
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrganizationDto }) =>
      API.organizations.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Organization updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update organization');
    },
  });
}

export function useOrganizationMembers(params?: UserFilterParams) {
  return useQuery({
    queryKey: ['organization', 'members', params],
    queryFn: () => API.organizations.members.list('', params),
    enabled: false,
  });
}

export function useAddMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateUserDto }) =>
      API.organizations.members.create(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'members'] });
      toast.success('Member added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add member');
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, userId }: { orgId: string; userId: string }) =>
      API.organizations.members.remove(orgId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'members'] });
      toast.success('Member removed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove member');
    },
  });
}

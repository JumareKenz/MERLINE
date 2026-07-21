'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type { CreateUserDto, UpdateUserDto, UserFilterParams } from '@/types/user';

export function useUsers(params?: UserFilterParams) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => API.organizations.members.list('', params),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateUserDto }) =>
      API.organizations.members.create(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create user');
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, userId, data }: { orgId: string; userId: string; data: UpdateUserDto }) =>
      API.organizations.members.updateRole(orgId, userId, { role_id: data.role_id ?? '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update user');
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, userId }: { orgId: string; userId: string }) =>
      API.organizations.members.remove(orgId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User removed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove user');
    },
  });
}

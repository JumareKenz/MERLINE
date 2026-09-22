'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type { CreateUserDto, UpdateUserDto, UserFilterParams } from '@/types/user';

/**
 * PHASE 2 — real bug fixed here: this always called
 * `API.organizations.members.list('', params)` — orgId was never a
 * parameter at all, only a hardcoded empty string, which 404'd on every
 * request (confirmed against a live server: `/organizations//members`).
 * `orgId` is now required and must come from `useCurrentOrganizationId()`.
 */
export function useUsers(orgId: string | undefined, params?: UserFilterParams) {
  return useQuery({
    queryKey: ['admin', 'users', orgId, params],
    queryFn: () => API.organizations.members.list(orgId as string, params),
    enabled: !!orgId,
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

export function useGenerateFieldAccessCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => API.users.generateFieldAccessCode(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate access code');
    },
  });
}

export function useRevokeFieldAccessCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => API.users.revokeFieldAccessCode(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Access code revoked');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to revoke access code');
    },
  });
}

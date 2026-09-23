'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type { Organization, UpdateOrganizationDto } from '@/types/organization';
import type { CreateUserDto, UserFilterParams } from '@/types/user';

/**
 * The caller's own organization. GET /organizations returns an array (now
 * only ever the caller's own organization); this unwraps it.
 */
export function useOrganization() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const body = (await API.organizations.get()).data.data as unknown;
      return (Array.isArray(body) ? body[0] : body) as Organization | undefined;
    },
  });
}

/**
 * PHASE 2 — real bug fixed here: every caller of `API.organizations.members.*`
 * passed `orgId: ''`, producing `/organizations//members` — a guaranteed
 * 404, confirmed against a live server. The org id was never fetched from
 * anywhere. `/auth/me` already returns it (`organization.id`); this is the
 * one place that resolves it, so every list/create/role-change/remove call
 * can share it instead of re-deriving it.
 */
export function useCurrentOrganizationId() {
  return useQuery({
    queryKey: ['auth', 'me', 'organizationId'],
    queryFn: async () => {
      const response = await API.auth.me();
      return response.data.data.organization?.id ?? null;
    },
    staleTime: 5 * 60 * 1000,
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

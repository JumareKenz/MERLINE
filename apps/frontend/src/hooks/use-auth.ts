'use client';

import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { API } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto } from '@/types/auth';

export function useLogin() {
  const { login } = useAuth();
  return useMutation({
    mutationFn: (data: LoginDto) => login(data.email, data.password, data.remember),
  });
}

export function useRegister() {
  const { register } = useAuth();
  return useMutation({
    mutationFn: (data: RegisterDto) =>
      register({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        password: data.password,
        organization_name: data.orgName,
        organization_type: '',
        country: '',
      }),
  });
}

export function useLogout() {
  const { logout } = useAuth();
  return useMutation({
    mutationFn: () => logout(),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: ForgotPasswordDto) => API.auth.forgotPassword(data),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: ResetPasswordDto) => API.auth.resetPassword(data),
  });
}

export function useUpdateProfile() {
  const { refreshUser } = useAuth();
  return useMutation({
    mutationFn: (data: Parameters<typeof API.auth.updateProfile>[0]) => API.auth.updateProfile(data),
    onSuccess: () => refreshUser(),
  });
}

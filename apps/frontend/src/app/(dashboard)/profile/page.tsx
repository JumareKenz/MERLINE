'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { User, Mail, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <div className="text-center py-16 text-foreground-secondary">Loading profile...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
        <p className="text-foreground-secondary mt-1">View and manage your profile information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary text-xl font-bold">
              {user.first_name.charAt(0)}{user.last_name.charAt(0)}
            </div>
            <div>
              <p className="text-lg font-semibold">{user.first_name} {user.last_name}</p>
              <p className="text-sm text-foreground-secondary">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-4 pt-4 border-t border-border">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-foreground-tertiary" />
              <div>
                <p className="text-sm text-foreground-secondary">Name</p>
                <p className="font-medium">{user.first_name} {user.last_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-foreground-tertiary" />
              <div>
                <p className="text-sm text-foreground-secondary">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-foreground-tertiary" />
              <div>
                <p className="text-sm text-foreground-secondary">Member Since</p>
                <p className="font-medium">{formatDate(user.created_at)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

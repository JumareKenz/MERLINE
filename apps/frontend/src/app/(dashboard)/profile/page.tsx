'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth-store';
import { useUpdateProfile } from '@/hooks/use-auth';
import { formatDate } from '@/lib/utils';
import { Loader2, Mail, Calendar, User, Shield } from 'lucide-react';

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useUpdateProfile();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      setPhone((user as any).phone ?? '');
    }
  }, [user?.id]);

  if (!user) {
    return <div className="text-center py-16 text-foreground-secondary text-sm">Loading profile…</div>;
  }

  const initials = `${(user.firstName ?? '').charAt(0)}${(user.lastName ?? '').charAt(0)}`.toUpperCase();

  const handleSave = () => {
    updateProfile.mutate(
      { firstName, lastName, phone } as any,
      { onSuccess: () => setEditing(false) },
    );
  };

  const handleCancel = () => {
    setFirstName(user.firstName ?? '');
    setLastName(user.lastName ?? '');
    setPhone((user as any).phone ?? '');
    setEditing(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="type-title">My Profile</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-foreground-secondary">Manage your account information</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-[22px] font-semibold shrink-0 select-none">
              {initials || <User className="h-7 w-7" />}
            </div>
            <div>
              <p className="text-[15px] font-semibold">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[13px] text-foreground-tertiary">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="type-section">Personal Information</CardTitle>
            {!editing && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[12px]" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-[13px]">First Name</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-8 text-[13px]" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-[13px]">Last Name</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-8 text-[13px]" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Email</Label>
                <Input value={user.email} disabled className="h-8 text-[13px] bg-muted" />
                <p className="text-[11px] text-foreground-tertiary">Contact your administrator to change your email.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-[13px]">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" className="h-8 text-[13px]" />
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button size="sm" className="h-8 text-[13px]" disabled={updateProfile.isPending} onClick={handleSave}>
                  {updateProfile.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Save Changes
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-[13px]" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="divide-y divide-border">
              {[
                { icon: <User className="h-4 w-4" />, label: 'Full Name', value: `${user.firstName} ${user.lastName}` },
                { icon: <Mail className="h-4 w-4" />, label: 'Email', value: user.email },
                { icon: <Shield className="h-4 w-4" />, label: 'Phone', value: (user as any).phone || '—' },
                { icon: <Calendar className="h-4 w-4" />, label: 'Member Since', value: formatDate((user as any).created_at ?? '') },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 py-3">
                  <span className="text-foreground-tertiary shrink-0">{icon}</span>
                  <div className="flex-1">
                    <p className="text-[13px] text-foreground-tertiary">{label}</p>
                    <p className="text-[13px] font-medium mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="type-section">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            <div className="py-3">
              <p className="text-[13px] text-foreground-tertiary">Account Status</p>
              <p className="text-[13px] font-medium mt-0.5 text-success">Active</p>
            </div>
            <div className="py-3">
              <p className="text-[13px] text-foreground-tertiary">Email Verified</p>
              <p className="text-[13px] font-medium mt-0.5">
                {(user as any).email_verified_at
                  ? `Verified ${formatDate((user as any).email_verified_at)}`
                  : 'Not verified'}
              </p>
            </div>
            <div className="py-3">
              <p className="text-[13px] text-foreground-tertiary">Last Login</p>
              <p className="text-[13px] font-medium mt-0.5">
                {(user as any).last_login_at ? formatDate((user as any).last_login_at) : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Globe, Shield, Bell, Loader2 } from 'lucide-react';
import { useOrganization, useUpdateOrganization } from '@/hooks/use-organizations';

export default function AdminSettingsPage() {
  const { data, isLoading } = useOrganization();
  const updateOrg = useUpdateOrganization();

  const org = data?.data?.data;

  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [locale, setLocale] = useState('en');
  const [timezone, setTimezone] = useState('Africa/Nairobi');
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [allowPublicReg, setAllowPublicReg] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);

  useEffect(() => {
    if (org) {
      setOrgName(org.name ?? '');
      setOrgSlug(org.slug ?? '');
      const settings = (org.settings ?? {}) as Record<string, unknown>;
      setLocale(typeof settings.locale === 'string' ? settings.locale : 'en');
      setTimezone(typeof settings.timezone === 'string' ? settings.timezone : 'Africa/Nairobi');
      setTwoFactorRequired(typeof settings.twoFactorRequired === 'boolean' ? settings.twoFactorRequired : false);
      setAllowPublicReg(typeof settings.allowPublicRegistration === 'boolean' ? settings.allowPublicRegistration : false);
      setEmailNotifications(typeof settings.emailNotifications === 'boolean' ? settings.emailNotifications : true);
    }
  }, [org?.id]);

  const handleSave = () => {
    if (!org) return;
    updateOrg.mutate({
      id: org.id,
      data: {
        name: orgName,
        settings: {
          locale,
          timezone,
          twoFactorRequired,
          allowPublicRegistration: allowPublicReg,
          emailNotifications,
        },
      },
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Organization Settings</h1>
        <p className="text-[13px] text-foreground-tertiary mt-0.5">
          Manage organization profile and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-[15px] w-[15px] text-primary" strokeWidth={1.75} />
            <CardTitle className="text-sm font-medium">Organization Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="orgName" className="text-[13px]">Organization Name</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g., Ministry of Health"
                className="h-8 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orgSlug" className="text-[13px]">Slug</Label>
              <Input
                id="orgSlug"
                value={orgSlug}
                disabled
                className="h-8 text-[13px] bg-muted"
              />
              <p className="text-[11px] text-foreground-tertiary">Slug cannot be changed after creation.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-[15px] w-[15px] text-primary" strokeWidth={1.75} />
            <CardTitle className="text-sm font-medium">Localization</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="locale" className="text-[13px]">Default Language</Label>
              <select
                id="locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-[13px]"
              >
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
                <option value="sw">Swahili</option>
                <option value="ar">Arabic</option>
                <option value="ha">Hausa</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone" className="text-[13px]">Timezone</Label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-[13px]"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern (US)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Africa/Nairobi">Nairobi (EAT)</option>
                <option value="Africa/Lagos">Lagos (WAT)</option>
                <option value="Africa/Accra">Accra (GMT)</option>
                <option value="Asia/Kolkata">India (IST)</option>
                <option value="Asia/Dhaka">Dhaka (BST)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-[15px] w-[15px] text-primary" strokeWidth={1.75} />
            <CardTitle className="text-sm font-medium">Security</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium">Require Two-Factor Authentication</p>
              <p className="text-[12px] text-foreground-secondary mt-0.5">
                Enforce 2FA for all organization members
              </p>
            </div>
            <Switch checked={twoFactorRequired} onCheckedChange={setTwoFactorRequired} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium">Allow Public Registration</p>
              <p className="text-[12px] text-foreground-secondary mt-0.5">
                Allow anyone to self-register with this organization
              </p>
            </div>
            <Switch checked={allowPublicReg} onCheckedChange={setAllowPublicReg} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-[15px] w-[15px] text-primary" strokeWidth={1.75} />
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium">Email Notifications</p>
              <p className="text-[12px] text-foreground-secondary mt-0.5">
                Receive email notifications for important events
              </p>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end border-t border-border pt-4">
        <Button
          size="sm"
          className="h-8 px-4 text-[13px]"
          onClick={handleSave}
          disabled={updateOrg.isPending}
        >
          {updateOrg.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}

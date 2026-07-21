'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Settings, Building2, Globe, Shield, Bell } from 'lucide-react';

export default function AdminSettingsPage() {
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [locale, setLocale] = useState('en');
  const [timezone, setTimezone] = useState('UTC');
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [allPublicRegistration, setAllPublicRegistration] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Organization Settings</h1>
        <p className="text-foreground-secondary mt-1">Manage organization profile, branding, and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Organization Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g., Ministry of Health" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgSlug">Slug</Label>
              <Input id="orgSlug" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} placeholder="e.g., ministry-of-health" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgDescription">Description</Label>
            <Textarea id="orgDescription" value={orgDescription} onChange={(e) => setOrgDescription(e.target.value)} placeholder="Brief description of your organization" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>Localization</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="locale">Default Language</Label>
              <select id="locale" value={locale} onChange={(e) => setLocale(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
                <option value="sw">Swahili</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern (US)</option>
                <option value="Europe/London">London</option>
                <option value="Africa/Nairobi">Nairobi (EAT)</option>
                <option value="Asia/Kolkata">India (IST)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Security</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Require Two-Factor Authentication</Label>
              <p className="text-sm text-foreground-secondary">Enforce 2FA for all organization members</p>
            </div>
            <Switch checked={twoFactorRequired} onCheckedChange={setTwoFactorRequired} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Allow Public Registration</Label>
              <p className="text-sm text-foreground-secondary">Allow anyone to register with this organization</p>
            </div>
            <Switch checked={allPublicRegistration} onCheckedChange={setAllPublicRegistration} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notifications</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Email Notifications</Label>
              <p className="text-sm text-foreground-secondary">Receive email notifications for important events</p>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={isSaving} size="lg">Save Settings</Button>
      </div>
    </div>
  );
}

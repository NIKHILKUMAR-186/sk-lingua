import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Bell, Lock, Globe, Eye } from "lucide-react";
import { useNotificationPreferences } from "@/hooks/use-notifications";
import { NotificationPreferencesForm } from "@/modules/subscriptions/components/notification-preferences-form";

export const Route = createFileRoute("/_authenticated/student/student-settings")({
  component: StudentSettingsPage,
});

function StudentSettingsPage() {
  const { data: auth } = useAuth();
  const userId = auth?.user?.id;
  const { data: notificationPrefs, isLoading: prefsLoading } = useNotificationPreferences(
    userId ?? null
  );

  if (!auth?.user) {
    return (
      <AppShell variant="student">
        <div>Loading...</div>
      </AppShell>
    );
  }

  return (
    <AppShell variant="student">
      <div className="mx-auto max-w-4xl space-y-6 py-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and privacy.</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
              {prefsLoading ? (
                <div className="text-center text-muted-foreground">Loading preferences...</div>
              ) : (
                <NotificationPreferencesForm
                  preferences={notificationPrefs}
                  userId={userId!}
                  loading={prefsLoading}
                />
              )}
            </div>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-4">
            <div className="rounded-lg border border-border p-6 text-center text-muted-foreground">
              <p>Privacy settings coming soon</p>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <div className="rounded-lg border border-border p-6 text-center text-muted-foreground">
              <p>Security settings coming soon</p>
            </div>
          </TabsContent>

          {/* Language & Preferences Tab */}
          <TabsContent value="language" className="space-y-4">
            <div className="rounded-lg border border-border p-6 text-center text-muted-foreground">
              <p>Language and timezone preferences coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

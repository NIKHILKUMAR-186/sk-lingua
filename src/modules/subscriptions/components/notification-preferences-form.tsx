import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useUpdateNotificationPreferences } from "@/hooks/use-notifications";
import { Bell, Mail, MessageSquare, Smartphone, Speaker } from "lucide-react";
import type { NotificationPreferences } from "@/hooks/use-notifications";

interface NotificationPreferencesFormProps {
  preferences: NotificationPreferences | null;
  userId: string;
  loading?: boolean;
}

export function NotificationPreferencesForm({
  preferences,
  userId,
  loading: parentLoading,
}: NotificationPreferencesFormProps) {
  const [values, setValues] = useState(preferences || {});
  const [hasChanges, setHasChanges] = useState(false);
  const update = useUpdateNotificationPreferences();

  useEffect(() => {
    if (preferences) {
      setValues(preferences);
      setHasChanges(false);
    }
  }, [preferences]);

  function handleToggle(key: keyof typeof values) {
    setValues((v) => ({
      ...v,
      [key]: !v[key as keyof typeof v],
    }));
    setHasChanges(true);
  }

  async function handleSave() {
    await update.mutateAsync({
      userId,
      updates: values,
    });
    setHasChanges(false);
  }

  const categories = [
    {
      title: "Emails",
      icon: Mail,
      items: [
        {
          key: "email_notifications",
          label: "Email Notifications",
          description: "Receive important updates via email",
        },
        {
          key: "account_updates",
          label: "Account Updates",
          description: "Changes to your account and security",
        },
        {
          key: "subscription_updates",
          label: "Subscription Updates",
          description: "Renewals, upgrades, and billing",
        },
      ],
    },
    {
      title: "Learning",
      icon: Bell,
      items: [
        {
          key: "demo_updates",
          label: "Demo Session Updates",
          description: "Confirmations and reminders for demo sessions",
        },
        {
          key: "system_announcements",
          label: "System Announcements",
          description: "Important platform updates and features",
        },
      ],
    },
    {
      title: "Marketing",
      icon: Speaker,
      items: [
        {
          key: "marketing_emails",
          label: "Marketing Emails",
          description: "Promotions, offers, and newsletters",
        },
      ],
    },
    {
      title: "Communication",
      icon: MessageSquare,
      items: [
        {
          key: "push_notifications",
          label: "Push Notifications",
          description: "Instant notifications on your device",
        },
        {
          key: "sms_notifications",
          label: "SMS Notifications",
          description: "Text messages for urgent updates",
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const Icon = category.icon;
        return (
          <Card key={category.title}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                <CardTitle className="text-lg">{category.title}</CardTitle>
              </div>
              <CardDescription>Manage {category.title.toLowerCase()} preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {category.items.map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium cursor-pointer">
                      {item.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  </div>
                  <Switch
                    checked={values[item.key as keyof typeof values] || false}
                    onCheckedChange={() => handleToggle(item.key as keyof typeof values)}
                    disabled={parentLoading || update.isPending}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Save button */}
      {hasChanges && (
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={update.isPending || parentLoading}
          >
            {update.isPending ? "Saving..." : "Save Preferences"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setValues(preferences || {});
              setHasChanges(false);
            }}
            disabled={update.isPending || parentLoading}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

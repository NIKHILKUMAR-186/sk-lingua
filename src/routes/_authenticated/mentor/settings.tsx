import { createFileRoute, Link } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Bell, BookOpen, Clock, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mentor/settings")({
  component: MentorSettingsHub,
});

function MentorSettingsHub() {
  return (
    <MentorLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-display">Settings</h1>
          <p className="text-muted-foreground">Manage your mentor profile and teaching preferences.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage your public profile, bio, certifications, and teaching experience.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/mentor/profile">Edit Profile</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Teaching
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage languages taught, teaching style, and hourly rate.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/mentor/profile">Teaching Settings</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Availability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set your availability preferences and schedule.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/mentor/availability">Manage Availability</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure notifications for bookings, demos, and session reminders.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/mentor/notifications">Notification Preferences</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage your account security and sign-out preferences.
              </p>
              <Button variant="outline" className="w-full" disabled>
                Security Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MentorLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { PageHeader } from "@/components/mentor/page-header";
import { SectionCard } from "@/components/mentor/section-card";
import { Button } from "@/components/ui/button";
import { User, BookOpen, Clock, Bell, Shield, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mentor/settings")({
  component: MentorSettingsHub,
});

function MentorSettingsHub() {
  return (
    <MentorLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title="Settings"
          description="Manage your mentor profile and teaching preferences."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SectionCard
            title="Profile"
            description="Manage your public profile, bio, certifications, and teaching experience."
            action={
              <Button asChild variant="outline" className="w-full">
                <Link to="/mentor/profile">Edit Profile</Link>
              </Button>
            }
          >
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <User className="h-5 w-5 text-muted-foreground" />
              <span>Profile photo, bio, headline, and personal details.</span>
            </div>
          </SectionCard>

          <SectionCard
            title="Teaching"
            description="Manage languages taught, teaching style, and hourly rate."
            action={
              <Button asChild variant="outline" className="w-full">
                <Link to="/mentor/profile">Teaching Settings</Link>
              </Button>
            }
          >
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <span>Languages, certifications, and teaching preferences.</span>
            </div>
          </SectionCard>

          <SectionCard
            title="Availability"
            description="Set your availability preferences and schedule."
            action={
              <Button asChild variant="outline" className="w-full">
                <Link to="/mentor/availability">Manage Availability</Link>
              </Button>
            }
          >
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span>Weekly schedule and time slot management.</span>
            </div>
          </SectionCard>

          <SectionCard
            title="Notifications"
            description="Configure notifications for bookings, demos, and session reminders."
            action={
              <Button asChild variant="outline" className="w-full">
                <Link to="/mentor/notifications">Notification Preferences</Link>
              </Button>
            }
          >
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span>Email and in-app notification preferences.</span>
            </div>
          </SectionCard>

          <SectionCard
            title="Account"
            description="Manage your account security and sign-out preferences."
          >
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <span>Password, email, and account security.</span>
            </div>
          </SectionCard>
        </div>
      </div>
    </MentorLayout>
  );
}

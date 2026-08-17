import { createFileRoute, Link } from "@tanstack/react-router";
import { MentorLayout } from "@/components/layouts";
import { PageHeader } from "@/components/mentor/page-header";
import { SectionCard } from "@/components/mentor/section-card";
import { Button } from "@/components/ui/button";
import { User, BookOpen, Clock, Bell, Shield } from "lucide-react";

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

        <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/60">
          <SettingsRow
            icon={<User className="h-4 w-4 text-muted-foreground" />}
            title="Profile"
            description="Profile photo, bio, headline, and personal details."
            href="/mentor/profile"
          />
          <SettingsRow
            icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
            title="Teaching"
            description="Languages taught, certifications, and teaching preferences."
            href="/mentor/profile"
          />
          <SettingsRow
            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            title="Availability"
            description="Weekly schedule and time slot management."
            href="/mentor/availability"
          />
          <SettingsRow
            icon={<Bell className="h-4 w-4 text-muted-foreground" />}
            title="Notifications"
            description="Email and in-app notification preferences."
            href="/mentor/notifications"
          />
          <SettingsRow
            icon={<Shield className="h-4 w-4 text-muted-foreground" />}
            title="Account"
            description="Password, email, and account security."
            href="#"
          />
        </div>
      </div>
    </MentorLayout>
  );
}

function SettingsRow({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-accent/10 transition-colors"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="shrink-0 h-8 text-xs">
        Open
      </Button>
    </Link>
  );
}

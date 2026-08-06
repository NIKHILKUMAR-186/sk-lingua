import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import React from "react";
import { ApplicationTimeline } from "@/components/application-timeline";

export const Route = createFileRoute("/_authenticated/admin/mentor-applications/$id")({
  component: MentorApplicationDetail,
});

function MentorApplicationDetail() {
  const id = Route.useParams().id as string;
  const { data: app } = useQuery({
    queryKey: ["admin-application", id],
    enabled: !!id,
    queryFn: async () =>
      (await supabase.from("mentor_applications").select("*").eq("id", id).maybeSingle()).data,
  });

  if (!app) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;

  return (
    <AppShell variant="mentor">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-semibold">{app.full_name}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">Contact</h3>
              <p className="text-sm">{app.email}</p>
              <p className="text-sm">{app.phone_number}</p>
            </div>
            {app.admin_notes ? (
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Admin notes</h3>
                <pre className="text-sm whitespace-pre-wrap">{app.admin_notes}</pre>
              </div>
            ) : null}
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">Application</h3>
              <p className="text-sm">{app.experience}</p>
            </div>
          </div>
          <div className="space-y-4">
            <ApplicationTimeline applicationId={id} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

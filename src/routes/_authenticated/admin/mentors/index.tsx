import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AdminLayout } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, User, Users, ShieldCheck, ShieldOff } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/mentors/")({
  component: AdminMentors,
});

interface MentorRow {
  user_id: string;
  headline: string | null;
  bio: string | null;
  rating_avg: number | null;
  total_reviews: number | null;
  total_students: number | null;
  total_sessions: number | null;
  years_experience: number | null;
  is_verified: boolean | null;
  is_active: boolean | null;
  user: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

function AdminMentors() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");

  const { data: mentors = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin-mentors", query],
    queryFn: async () => {
      const q = query.trim();
      let profileQuery = supabase
        .from("profiles")
        .select(
          "id, full_name, email, avatar_url, country",
        )
        .order("full_name", { ascending: true })
        .limit(200);

      if (q) {
        profileQuery = profileQuery.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
      }

      const { data: profiles, error: profilesError } = await profileQuery;
      if (profilesError) throw profilesError;

      const userIds = (profiles ?? []).map((p) => p.id);

      let mentorRows: any[] = [];
      if (userIds.length > 0) {
        const { data: mRows, error: mError } = await supabase
          .from("mentor_profiles")
          .select("*")
          .in("user_id", userIds);
        if (mError) throw mError;
        mentorRows = mRows ?? [];
      }

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const mentorMap = new Map((mentorRows ?? []).map((m) => [m.user_id, m]));

      const data: MentorRow[] = (profiles ?? [])
        .filter((p) => mentorMap.has(p.id))
        .map((p) => {
          const m = mentorMap.get(p.id)!;
          return {
            user_id: p.id,
            headline: m.headline,
            bio: m.bio,
            rating_avg: m.rating_avg,
            total_reviews: m.total_reviews,
            total_students: m.total_students,
            total_sessions: m.total_sessions,
            years_experience: m.years_experience,
            is_verified: m.is_verified,
            is_active: m.is_active,
            user: {
              full_name: p.full_name,
              email: p.email,
              avatar_url: p.avatar_url,
            },
          };
        });

      return data;
    },
    staleTime: 1000 * 30,
  });

  async function toggleMentorStatus(mentorId: string, currentStatus: boolean | null) {
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from("mentor_profiles")
        .update({ is_active: newStatus })
        .eq("user_id", mentorId);

      if (error) throw error;
      toast.success(newStatus ? "Mentor activated" : "Mentor deactivated");
      qc.invalidateQueries({ queryKey: ["admin-mentors"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update mentor status");
    }
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="space-y-6 py-6">
          <div>
            <h1 className="text-3xl font-display">Mentors</h1>
            <p className="mt-1 text-muted-foreground">Manage mentor accounts and status.</p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center text-destructive">
              <p>Unable to load mentors.</p>
              <p className="text-sm opacity-80">{error.message}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Refresh
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 py-6">
        <div>
          <h1 className="text-3xl font-display">Mentors</h1>
          <p className="mt-1 text-muted-foreground">Manage mentor accounts and status.</p>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {!isLoading && mentors.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {mentors.length} mentor{mentors.length !== 1 ? "s" : ""} found
          </p>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> All Mentors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading mentors...
              </div>
            ) : mentors.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
                <Users className="h-8 w-8" />
                <p>No mentors found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mentor</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mentors.map((m) => (
                      <TableRow key={m.user_id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {m.user?.avatar_url ? (
                              <img
                                src={m.user.avatar_url}
                                alt={m.user.full_name ?? "Mentor"}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                <User className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{m.user?.full_name || "Unnamed"}</div>
                              <div className="text-sm text-muted-foreground">{m.headline || "Mentor"}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{m.user?.email || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{m.years_experience ?? 0} years</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{Number(m.rating_avg ?? 0).toFixed(1)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{m.total_sessions ?? 0}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={m.is_active ? "default" : "secondary"}>
                            {m.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                navigate({
                                  to: "/admin/mentors/$mentorId",
                                  params: { mentorId: m.user_id },
                                })
                              }
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant={m.is_active ? "destructive" : "default"}
                              onClick={() => toggleMentorStatus(m.user_id, m.is_active)}
                            >
                              {m.is_active ? (
                                <>
                                  <ShieldOff className="mr-1 h-4 w-4" /> Deactivate
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="mr-1 h-4 w-4" /> Activate
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

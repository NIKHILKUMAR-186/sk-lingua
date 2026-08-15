import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AdminLayout } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Save, ShieldCheck, ShieldOff, ArrowLeft } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/mentors/$mentorId")({
  component: AdminMentorDetail,
});

interface MentorDetail {
  user_id: string;
  headline: string | null;
  bio: string | null;
  years_experience: number | null;
  teaching_style: string | null;
  availability_preview: string | null;
  is_verified: boolean | null;
  is_active: boolean | null;
  rating_avg: number | null;
  total_reviews: number | null;
  total_students: number | null;
  total_sessions: number | null;
  user: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    country: string | null;
    created_at: string | null;
  } | null;
}

function AdminMentorDetail() {
  const { mentorId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const { data: mentor, isLoading, refetch } = useQuery({
    queryKey: ["admin-mentor-detail", mentorId],
    queryFn: async () => {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, country, created_at")
        .eq("id", mentorId)
        .single();

      if (profileError || !profile) throw new Error("Mentor not found");

      const { data: mentorProfile, error: mentorError } = await supabase
        .from("mentor_profiles")
        .select("*")
        .eq("user_id", mentorId)
        .single();

      if (mentorError || !mentorProfile) throw new Error("Mentor profile not found");

      return {
        user_id: profile.id,
        headline: mentorProfile.headline,
        bio: mentorProfile.bio,
        years_experience: mentorProfile.years_experience,
        teaching_style: mentorProfile.teaching_style,
        availability_preview: mentorProfile.availability_preview,
        is_verified: mentorProfile.is_verified,
        is_active: mentorProfile.is_active,
        rating_avg: mentorProfile.rating_avg,
        total_reviews: mentorProfile.total_reviews,
        total_students: mentorProfile.total_students,
        total_sessions: mentorProfile.total_sessions,
        user: {
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          country: profile.country,
          created_at: profile.created_at,
        },
      } as MentorDetail;
    },
    staleTime: 1000 * 30,
  });

  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [teachingStyle, setTeachingStyle] = useState("");
  const [availabilityPreview, setAvailabilityPreview] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isActive, setIsActive] = useState(false);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading mentor…
        </div>
      </AdminLayout>
    );
  }

  if (!mentor) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
          <User className="h-8 w-8" />
          <p>Mentor not found.</p>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/mentors" })}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Mentors
          </Button>
        </div>
      </AdminLayout>
    );
  }

  // Initialize state when mentor loads
  if (!headline && mentor.headline !== undefined) {
    setHeadline(mentor.headline || "");
    setBio(mentor.bio || "");
    setYearsExperience(String(mentor.years_experience ?? 0));
    setTeachingStyle(mentor.teaching_style || "");
    setAvailabilityPreview(mentor.availability_preview || "");
    setIsVerified(mentor.is_verified || false);
    setIsActive(mentor.is_active || false);
  }

  async function saveProfile() {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("mentor_profiles")
        .update({
          headline,
          bio,
          years_experience: Number(yearsExperience) || 0,
          teaching_style: teachingStyle,
          availability_preview: availabilityPreview,
          is_verified: isVerified,
          is_active: isActive,
        })
        .eq("user_id", mentorId);

      if (error) throw error;
      toast.success("Mentor updated successfully");
      qc.invalidateQueries({ queryKey: ["admin-mentors"] });
      qc.invalidateQueries({ queryKey: ["admin-mentor-detail", mentorId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update mentor");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus() {
    try {
      const { error } = await supabase
        .from("mentor_profiles")
        .update({ is_active: !isActive })
        .eq("user_id", mentorId);

      if (error) throw error;
      setIsActive(!isActive);
      toast.success(isActive ? "Mentor deactivated" : "Mentor activated");
      qc.invalidateQueries({ queryKey: ["admin-mentors"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl space-y-6 py-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/mentors" })}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Mentors
          </Button>
          <div>
            <h1 className="text-2xl font-display">{mentor.user?.full_name || "Mentor"}</h1>
            <p className="text-sm text-muted-foreground">
              {mentor.user?.email}
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mentor Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="headline">Headline</Label>
                <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="years_experience">Years of Experience</Label>
                <Input
                  id="years_experience"
                  type="number"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="teaching_style">Teaching Style</Label>
                <Textarea
                  id="teaching_style"
                  value={teachingStyle}
                  onChange={(e) => setTeachingStyle(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="availability_preview">Availability Preview</Label>
                <Textarea
                  id="availability_preview"
                  value={availabilityPreview}
                  onChange={(e) => setAvailabilityPreview(e.target.value)}
                  rows={2}
                  placeholder="e.g. Mon-Fri, 7-10 PM"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" onClick={saveProfile} disabled={isSaving}>
                {(isSaving) && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                <Save className="mr-1.5 h-4 w-4" />
                Save Profile
              </Button>
              <Button size="sm" variant={isActive ? "destructive" : "default"} onClick={toggleStatus}>
                {isActive ? (
                  <>
                    <ShieldOff className="mr-1.5 h-4 w-4" /> Deactivate
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-1.5 h-4 w-4" /> Activate
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mentor Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-md bg-muted px-3 py-3 text-center">
                <div className="text-sm text-muted-foreground">Rating</div>
                <div className="font-medium">{Number(mentor.rating_avg ?? 0).toFixed(1)}</div>
              </div>
              <div className="rounded-md bg-muted px-3 py-3 text-center">
                <div className="text-sm text-muted-foreground">Reviews</div>
                <div className="font-medium">{mentor.total_reviews ?? 0}</div>
              </div>
              <div className="rounded-md bg-muted px-3 py-3 text-center">
                <div className="text-sm text-muted-foreground">Students</div>
                <div className="font-medium">{mentor.total_students ?? 0}</div>
              </div>
              <div className="rounded-md bg-muted px-3 py-3 text-center">
                <div className="text-sm text-muted-foreground">Sessions</div>
                <div className="font-medium">{mentor.total_sessions ?? 0}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant={mentor.is_verified ? "default" : "secondary"}>
                {mentor.is_verified ? "Verified" : "Unverified"}
              </Badge>
              <Badge variant={mentor.is_active ? "default" : "secondary"}>
                {mentor.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

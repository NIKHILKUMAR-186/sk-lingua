import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Star,
  CheckCircle2,
  Video,
  GraduationCap,
  Award,
  Briefcase,
  BookOpen,
  Users,
  Clock,
  MessageSquare,
  TrendingUp,
  Shield,
} from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type MentorProfile = Tables<"mentor_profiles">;
type Profile = Tables<"profiles">;
type Gig = Tables<"gigs">;

interface MentorPublicProfileProps {
  mentor: MentorProfile;
  profile: Profile | null;
  gigs: Gig[];
  onSelectGig: (id: string) => void;
  selectedGigId: string | null;
}

export function MentorPublicProfile({
  mentor,
  profile,
  gigs,
  onSelectGig,
  selectedGigId,
}: MentorPublicProfileProps) {
  const joinedDate = mentor.joined_date
    ? new Date(mentor.joined_date)
    : profile?.created_at
      ? new Date(profile.created_at)
      : null;

  const stats = [
    { icon: Users, label: "Students", value: mentor.total_students?.toString() || "0" },
    { icon: TrendingUp, label: "Sessions", value: mentor.total_sessions?.toString() || "0" },
    { icon: Clock, label: "Response", value: `${mentor.response_rate || 100}%` },
    { icon: CheckCircle2, label: "Completion", value: `${mentor.completion_rate || 100}%` },
    { icon: Star, label: "Rating", value: `${Number(mentor.rating_avg || 0).toFixed(1)}` },
    { icon: BookOpen, label: "Reviews", value: `${mentor.total_reviews || 0}` },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Hero Banner */}
      <Card className="overflow-hidden">
        <div className="relative h-48 sm:h-64 bg-gradient-to-br from-primary/20 via-primary/10 to-muted">
          {mentor.cover_url && (
            <img src={mentor.cover_url} alt="" className="h-full w-full object-cover" />
          )}
          {mentor.is_verified && (
            <div className="absolute right-4 top-4 rounded-full bg-primary/90 backdrop-blur-sm px-3 py-1 text-xs font-medium text-primary-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" /> Verified
            </div>
          )}
        </div>
        <CardContent className="relative px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16 sm:-mt-20">
            <Avatar className="h-28 w-28 sm:h-32 sm:w-32 ring-4 ring-background rounded-2xl">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || ""} />
              <AvatarFallback className="rounded-2xl text-3xl bg-primary/10 text-primary">
                {profile?.full_name?.charAt(0) || "M"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 pt-2 sm:pt-0 sm:pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-display">
                  {profile?.full_name || "Mentor"}
                </h1>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  <span className="text-sm font-semibold">
                    {Number(mentor.rating_avg || 0).toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({mentor.total_reviews || 0})
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{mentor.headline}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {profile?.state && <span>{profile.state}</span>}
                {joinedDate && (
                  <>
                    <span>•</span>
                    <span>Joined {format(joinedDate, "MMM yyyy")}</span>
                  </>
                )}
                <span>•</span>
                <span>{mentor.years_experience || 0} years exp.</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-display font-bold text-primary">
                ${Number(mentor.hourly_rate || 0).toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">per hour</div>
            </div>
          </div>

          {/* Languages */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {mentor.languages_taught?.map((code) => {
              const l = LANGUAGES.find((x) => x.code === code);
              return (
                <Badge key={code} variant="secondary">
                  {l?.emoji} {l?.name || code}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3 text-center">
              <stat.icon className="mx-auto h-4 w-4 text-muted-foreground" />
              <div className="mt-1 text-lg font-semibold">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bio & About */}
      {(mentor.about || mentor.bio) && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-lg font-semibold mb-2">About</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {mentor.about || mentor.bio}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Experience & Education side by side */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Experience */}
        {mentor.years_experience > 0 && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Experience</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {mentor.years_experience} years of teaching experience
              </p>
              {mentor.teaching_style && (
                <div className="mt-3">
                  <div className="text-sm font-medium">Teaching style</div>
                  <p className="text-sm text-muted-foreground mt-1">{mentor.teaching_style}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Education */}
        {mentor.education && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Education</h2>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {mentor.education}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Certifications */}
      {mentor.certifications && mentor.certifications.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Certifications</h2>
            </div>
            <div className="space-y-2">
              {mentor.certifications.map((cert, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-success shrink-0" />
                  <span className="text-muted-foreground">{cert}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo lesson / Intro video */}
      {(mentor.demo_lesson_url || mentor.intro_video_url) && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" /> Demo lesson
            </h2>
            <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
              {mentor.demo_lesson_url ? (
                <iframe
                  src={mentor.demo_lesson_url}
                  className="h-full w-full rounded-lg"
                  allowFullScreen
                  title="Demo lesson"
                />
              ) : mentor.intro_video_url ? (
                <iframe
                  src={mentor.intro_video_url}
                  className="h-full w-full rounded-lg"
                  allowFullScreen
                  title="Intro video"
                />
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Social Links */}
      {(mentor.linkedin_url || mentor.website_url || mentor.youtube_url) && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-lg font-semibold mb-3">Connect</h2>
            <div className="flex flex-wrap gap-2">
              {mentor.linkedin_url && (
                <a
                  href={mentor.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-accent"
                >
                  LinkedIn
                </a>
              )}
              {mentor.website_url && (
                <a
                  href={mentor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-accent"
                >
                  Website
                </a>
              )}
              {mentor.youtube_url && (
                <a
                  href={mentor.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-accent"
                >
                  YouTube
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Gigs */}
      <Card>
        <CardContent className="p-5">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Available services
          </h2>
          {gigs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No gigs available yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {gigs.map((gig) => (
                <button
                  key={gig.id}
                  onClick={() => onSelectGig(gig.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    selectedGigId === gig.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50 hover:shadow-soft"
                  }`}
                >
                  {gig.cover_image && (
                    <div className="h-24 w-full overflow-hidden rounded-lg mb-3 bg-muted">
                      <img src={gig.cover_image} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm">{gig.title}</div>
                    <div className="text-lg font-bold text-primary shrink-0">
                      ${Number(gig.price).toFixed(0)}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{gig.duration_mins} min</span>
                    {gig.level && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{gig.level}</span>
                      </>
                    )}
                  </div>
                  {gig.description && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {gig.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {gig.homework_included && (
                      <Badge variant="outline" className="text-[10px]">
                        Homework
                      </Badge>
                    )}
                    {gig.recording_included && (
                      <Badge variant="outline" className="text-[10px]">
                        Recording
                      </Badge>
                    )}
                    {gig.certificate_included && (
                      <Badge variant="outline" className="text-[10px]">
                        Certificate
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

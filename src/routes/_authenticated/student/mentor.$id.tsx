import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LANGUAGES } from "@/lib/languages";
import { Star, Video, ArrowLeft, Clock, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { DAY_KEYS } from "@/lib/booking";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/student/mentor/$id")({
  component: MentorProfile,
});

function MentorProfile() {
  const { id } = Route.useParams();
  const { data: auth } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: mentor } = useQuery({
    queryKey: ["mentor", id],
    queryFn: async () => {
      const [{ data: mp }, { data: profile }, { data: gigs }, { data: reviews }] = await Promise.all([
        supabase.from("mentor_profiles").select("*").eq("user_id", id).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("gigs").select("*").eq("mentor_id", id).eq("is_active", true),
        supabase.from("reviews").select("*").eq("mentor_id", id).order("created_at", { ascending: false }).limit(5),
      ]);
      return { mp, profile, gigs: gigs ?? [], reviews: reviews ?? [] };
    },
  });

  const [selectedGig, setSelectedGig] = useState<string | null>(null);
  const [when, setWhen] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [slotOptions, setSlotOptions] = useState<Array<{ value: string; label: string; disabled: boolean }>>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ data: avail = [] }, { data: sessions = [] }] = await Promise.all([
          supabase.from("availability_slots").select("*").eq("mentor_id", id),
          supabase.from("sessions").select("*").eq("mentor_id", id),
        ]);

        const dateObj = new Date(selectedDate);
        const dayKey = DAY_KEYS[(dateObj.getDay() + 6) % 7];
        const candidates = (avail ?? []).filter((a: any) => a.day === dayKey);
        const opts = (candidates ?? []).flatMap((slot: any) => {
          if (slot.is_blocked) return [];
          const [sh, sm] = (slot.start_time ?? "00:00").split(":").map(Number);
          const [eh, em] = (slot.end_time ?? "00:00").split(":").map(Number);
          const start = new Date(selectedDate);
          start.setHours(sh, sm, 0, 0);
          const end = new Date(selectedDate);
          end.setHours(eh, em, 0, 0);
          const duration = (selectedGig ? (mentor?.gigs.find((g) => g.id === selectedGig)?.duration_mins ?? 30) : 30);
          if (end.getTime() - start.getTime() < duration * 60_000) return [];
          const startIso = start.toISOString();
          const conflict = (sessions ?? []).some((s: any) => {
            if (["rejected", "cancelled"].includes(s.status)) return false;
            const es = new Date(s.scheduled_time).getTime();
            const ee = es + s.duration_mins * 60_000;
            const ps = new Date(startIso).getTime();
            const pe = ps + duration * 60_000;
            return ps < ee && pe > es;
          });
          return [{ value: startIso, label: `${slot.start_time} – ${slot.end_time}`, disabled: conflict }];
        });
        if (!cancelled) setSlotOptions(opts);
      } catch (e) {
        // ignore for now
      }
    })();
    return () => { cancelled = true; };
  }, [selectedDate, selectedGig, id, mentor]);

  async function book() {
    if (!auth?.user || !selectedGig || !when) return;
    setBooking(true);
    const gig = mentor?.gigs.find((g) => g.id === selectedGig);
    try {
      const scheduled = selectedSlot ?? new Date(when).toISOString();
      const { error } = await supabase.from("sessions").insert({
        student_id: auth.user.id, mentor_id: id, gig_id: selectedGig,
        scheduled_time: scheduled, duration_mins: gig?.duration_mins ?? 30,
        student_message: msg,
      });
      if (error) throw error;
      await qc.invalidateQueries();
      toast.success("Booking request sent!");
      navigate({ to: "/student/sessions" });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Booking failed"); }
    finally { setBooking(false); }
  }

  if (!mentor?.mp) return <AppShell variant="student"><div className="p-8 text-muted-foreground">Loading…</div></AppShell>;

  return (
    <AppShell variant="student">
      <div className="mx-auto max-w-5xl space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/student/explore" })}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>

        <Card><CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-muted">
              {mentor.profile?.avatar_url ? <img src={mentor.profile.avatar_url} className="h-full w-full object-cover" alt="" /> : null}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-display">{mentor.profile?.full_name}</h1>
              <p className="text-muted-foreground">{mentor.mp.headline}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-warning text-warning" />{Number(mentor.mp.rating_avg).toFixed(1)} ({mentor.mp.total_reviews})</span>
                <span className="text-muted-foreground">•</span>
                <span>{mentor.profile?.country}</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-semibold">${Number(mentor.mp.hourly_rate).toFixed(0)}/hr</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {mentor.mp.languages_taught?.map((c) => {
                  const l = LANGUAGES.find((x) => x.code === c);
                  return <Badge key={c} variant="secondary">{l?.emoji} {l?.name ?? c}</Badge>;
                })}
              </div>
            </div>
          </div>
          {mentor.mp.bio && <p className="mt-6 text-sm leading-relaxed">{mentor.mp.bio}</p>}
        </CardContent></Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Available gigs</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {mentor.gigs.length === 0 && <p className="text-sm text-muted-foreground">No gigs yet.</p>}
              {mentor.gigs.map((g) => (
                <button key={g.id} onClick={() => setSelectedGig(g.id)}
                  className={`w-full rounded-lg border p-4 text-left transition ${selectedGig === g.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                  <div className="flex items-center justify-between"><div className="font-medium">{g.title}</div><div className="font-semibold">${Number(g.price).toFixed(0)}</div></div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground"><span><Clock className="mr-1 inline h-3 w-3" />{g.duration_mins} min</span></div>
                  {g.description && <p className="mt-2 text-sm text-muted-foreground">{g.description}</p>}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Book a session</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Available slots</label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={selectedSlot ?? ""} onChange={(e) => setSelectedSlot(e.target.value)}>
                  <option value="">Choose a slot</option>
                  {slotOptions.map((o) => (
                    <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}{o.disabled ? ' (unavailable)' : ''}</option>
                  ))}
                </select>
              </div>
              <div><label className="text-sm font-medium">Message (optional)</label><Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Tell your mentor what you'd like to focus on…" /></div>
              <Button className="w-full" disabled={!selectedGig || !selectedSlot || booking} onClick={book}>
                {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Video className="mr-2 h-4 w-4" />Request session</>}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Reviews</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {mentor.reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
            {mentor.reviews.map((r) => (
              <div key={r.id} className="rounded-lg border p-3">
                <div className="flex items-center gap-1 text-sm">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />)}</div>
                {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

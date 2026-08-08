import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, GraduationCap, ShieldCheck, Globe2, ArrowRight, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).default("signup").catch("signup"),
});

type MentorAuthMode = "login" | "signup";

export const Route = createFileRoute("/mentor-signup")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Mentor Signup — Lingua" },
      {
        name: "description",
        content: "Create your Lingua mentor account and start teaching languages.",
      },
      { property: "og:title", content: "Mentor Signup — Lingua" },
      { property: "og:description", content: "Create your Lingua mentor account." },
    ],
  }),
  component: MentorAuthPage,
});

function MentorAuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formMode, setFormMode] = useState<MentorAuthMode>(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  async function goToMentorDashboard(userId: string) {
    await qc.invalidateQueries();
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const fetchedRoles = (roles ?? []).map((r) => r.role as string);
    if (fetchedRoles.includes("mentor")) {
      navigate({ to: "/mentor/dashboard" });
    } else {
      navigate({ to: "/mentor/pending" });
    }
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Enter your email and password to continue.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Login succeeded, but no user session was returned.");

      // Verify this is a mentor account (mentor or mentor_pending)
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      const fetchedRoles = (roles ?? []).map((r) => r.role as string);
      const isMentorAccount = fetchedRoles.includes("mentor") || fetchedRoles.includes("mentor_pending");

      if (!isMentorAccount) {
        toast.error("This account is not a mentor account. Please use the student login.");
        await supabase.auth.signOut();
        return;
      }

      toast.success("Welcome back!");
      await goToMentorDashboard(data.user.id);
    } catch (error) {
      console.error("Mentor login failed", error);
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function waitForSession(maxWaitMs: number = 1000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      if (session?.access_token) return true;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return false;
  }


  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fullName.trim() || !email || !password) {
      toast.error("Fill in your name, email, and password to continue.");
      return;
    }

    if (password.length < 6) {
      toast.error("Choose a stronger password with at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const emailRedirectTo = `${window.location.origin}/mentor/pending`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: { full_name: fullName, intended_role: "mentor" },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Signup completed without returning a user.");

      // If no session, this is an email-confirmation flow
      if (!data.session) {
        toast.success("Check your inbox to confirm your account.");
        return;
      }

      const hasSession = await waitForSession();
      if (!hasSession) {
        toast.success("Check your inbox to confirm your account.");
        navigate({ to: "/mentor/pending" });
        return;
      }

      // Insert mentor_pending role - NOT student
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert(
          [{ user_id: data.user.id, role: "mentor_pending" }],
          { onConflict: "user_id,role" }
        );
      if (roleError) throw roleError;

      // Create mentor profile (not student profile)
      const { error: mentorProfileError } = await supabase
        .from("mentor_profiles")
        .upsert({
          user_id: data.user.id,
          headline: "",
          bio: "",
          languages_taught: [],
          certifications: [],
          hourly_rate: 0,
          years_experience: 0,
          is_active: false,
        });
      if (mentorProfileError) {
        console.error("Mentor profile creation failed", mentorProfileError);
      }

      // Send welcome notification
      try {
        await (supabase as any).rpc("insert_notification", {
          p_user_id: data.user.id,
          p_title: "Welcome to Lingua Mentors 🎉",
          p_body: "Your mentor account is pending verification. Complete your application to get started.",
          p_category: "general",
          p_kind: "mentor_application",
          p_related_id: null,
          p_link: "/mentor/pending",
        });
      } catch (notifErr) {
        console.error("Welcome notification failed", notifErr);
      }

      toast.success("Mentor account created!");
      navigate({ to: "/mentor/pending" });
    } catch (error) {
      console.error("Mentor signup failed", error);
      toast.error(getSignupErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-hero-gradient/10 px-4 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-[2rem] bg-hero-gradient from-slate-950 via-slate-900 to-slate-800 p-12 text-white shadow-2xl shadow-slate-950/20">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 h-11 w-18 rounded-full text-m uppercase tracking-[0.24em] text-white/80">
              <img src="/logo.png" alt="LINGUA" className="h-15 w-20" />
              <p className="bg-gradient">LINGUA</p>
            </div>
            <h1 className="text-5xl font-display tracking-tight text-white">
              Teach your language. Grow your income.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-slate-300">
              Create your Lingua mentor account and join our vetted marketplace of language
              educators.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-900">Verified</p>
                <p className="mt-3 text-base text-slate-100">
                  Every mentor is reviewed by our team before going live.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-900">Earn 90%</p>
                <p className="mt-3 text-base text-slate-100">
                  Keep up to 90% of every session you teach.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-18 items-center justify-center rounded-2xl text-gradient text-white">
                  <img src="/logo.png" alt="LINGUA" className="h-15 w-20" />
                </div>
                <div>
                  <CardTitle>Mentor Portal</CardTitle>
                  <CardDescription>
                    {formMode === "login"
                      ? "Log in to your mentor account."
                      : "Create your mentor account."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={formMode === "login" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setFormMode("login")}
                >
                  Log in
                </Button>
                <Button
                  variant={formMode === "signup" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setFormMode("signup")}
                >
                  Sign up
                </Button>
              </div>

              {formMode === "login" ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="mentor-login-email">Email</Label>
                    <Input
                      id="mentor-login-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mentor-login-password">Password</Label>
                    <Input
                      id="mentor-login-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="rounded-3xl border border-border bg-background p-4 text-sm text-muted-foreground">
                    Create a Mentor account. Your application will be reviewed by our team.
                  </div>
                  <div>
                    <Label htmlFor="mentor-signup-name">Full name</Label>
                    <Input
                      id="mentor-signup-name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mentor-signup-email">Email</Label>
                    <Input
                      id="mentor-signup-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mentor-signup-password">Password</Label>
                    <Input
                      id="mentor-signup-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create mentor account"}
                  </Button>
                </form>
              )}

              <div className="pt-2 text-center">
                <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
                  Are you a student? Log in here
                </Link>
              </div>
            </CardContent>
          </Card>
          <div className="rounded-3xl border border-border bg-background p-6 shadow-sm shadow-slate-900/5">
            <h2 className="text-base font-semibold">Why become a Lingua mentor?</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> Set your own rates
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> Keep 90% of earnings
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> Teach students worldwide
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function getSignupErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "We could not create your account. Please try again.";
  const value = error as Record<string, unknown>;
  const code = String(value.code ?? "").toLowerCase();
  const message = String(value.message ?? "").toLowerCase();

  if (code.includes("user_already_exists") || message.includes("already registered"))
    return "An account with this email already exists.";
  if (code.includes("invalid_email") || message.includes("invalid email"))
    return "Enter a valid email address.";
  if (code.includes("weak_password") || message.includes("password"))
    return "Choose a stronger password with at least 6 characters.";
  if (message.includes("email confirmation") || message.includes("confirm your email"))
    return "Check your email to confirm your account.";
  if (code === "42501" || message.includes("row-level security") || message.includes("permission denied"))
    return "Your account was created, but permission to finish your profile was denied.";
  if (message.includes("rate limit") || message.includes("too many requests") || code.includes("429"))
    return "Too many attempts. Please wait a few minutes and try again.";
  if (message.includes("network") || message.includes("failed to fetch"))
    return "We could not connect to the server. Check your connection and try again.";
  return "We could not create your account. Please try again.";
}

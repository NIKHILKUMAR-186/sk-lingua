import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, GraduationCap, Briefcase, ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getDashboardRoute,
  getActiveRole,
  waitForSessionRestored,
  type AppRole,
} from "@/lib/auth";
import { GoogleButton } from "@/components/auth/google-button";
import { signInWithGoogle } from "@/lib/google-auth";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).default("login").catch("login"),
});

type AuthMode = "login" | "signup";

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const user = await waitForSessionRestored(4000, 250);
    if (!user) return;

    const [{ data: roles }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);

    const fetchedRoles = (roles ?? []).map((roleRow) => roleRow.role as AppRole);
    const destination = getDashboardRoute(getActiveRole(fetchedRoles));

    throw redirect({ to: destination });
  },
  head: () => ({
    meta: [
      { title: "Sign in — Lingua" },
      {
        name: "description",
        content: "Log in or create your Lingua account to start learning or teaching.",
      },
      { property: "og:title", content: "Sign in — Lingua" },
      { property: "og:description", content: "Log in or create your Lingua account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formMode, setFormMode] = useState<AuthMode>(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  async function goToDashboardFor(userId: string) {
    await qc.invalidateQueries();
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (rolesError) {
      console.error("Redirect lookup failed", rolesError);
    }

    const fetchedRoles = (roles ?? []).map((r) => r.role as AppRole);
    const destination = getDashboardRoute(getActiveRole(fetchedRoles));

    navigate({ to: destination });
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
      toast.success("Welcome back!");
      await goToDashboardFor(data.user.id);
    } catch (error) {
      console.error("Login failed", error);
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function waitForSession(maxWaitMs = 8000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      if (session?.access_token) return true;
      await new Promise((resolve) => setTimeout(resolve, 200));
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
      const emailRedirectTo = `${window.location.origin}/student/demo-session`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: { full_name: fullName, intended_role: "student" },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Signup completed without returning a user.");

      if (!data.session) {
        toast.success("Check your inbox to confirm your account.");
        return;
      }

      const hasSession = await waitForSession();
      if (!hasSession) {
        toast.success("Check your inbox to confirm your account.");
        navigate({ to: "/student/demo-session" });
        return;
      }

      const roleRows: { user_id: string; role: "student" }[] = [
        { user_id: data.user.id, role: "student" },
      ];

      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert(roleRows, { onConflict: "user_id,role" });
      if (roleError) throw roleError;

      toast.success("Account created!");
      navigate({ to: "/student/demo-session" });
    } catch (error) {
      console.error("Signup failed", error);
      toast.error(getSignupErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-hero-gradient/10 px-4 py-10 ">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-[2rem] bg-hero-gradient from-slate-950 via-slate-900 to-slate-800 p-12 text-white shadow-2xl shadow-slate-950/20">
          <div className="max-w-xl ">
            <div className="mb-6 inline-flex items-center gap-2 h-11 w-18 rounded-full text-m uppercase tracking-[0.24em] text-white/80">
              <img src="/logo.png" alt="LINGUA" className="h-15 w-20" />
              <p className="bg-gradient">LINGUA</p>
            </div>
            <h1 className="text-5xl font-display tracking-tight text-white">
              Learn, teach, and grow in one elegant language platform.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-slate-300">
              Choose your path — learn a new language or share your expertise as a mentor.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-900">For learners</p>
                <p className="mt-3 text-base text-slate-100">
                  Book 1-on-1 sessions with verified native mentors.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-900">For mentors</p>
                <p className="mt-3 text-base text-slate-100">
                  Teach your language and earn up to 90% per session.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          {/* ── Two clearly separated options ── */}
          <div className="grid gap-4">
            {/* <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">I want to Learn</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Create a student account and start learning with verified mentors.
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm" className="shrink-0">
                    <Link to="/auth" search={{ mode: "signup" } as never}>
                      Student Signup
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card> */}

            <Card className="border-electric/30 bg-electric/5 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-electric text-white">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">I want to Teach</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Create a mentor account and join our vetted marketplace.
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm" className="shrink-0">
                    <Link to="/mentor-signup">Mentor Signup</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-2xl">
            <CardHeader className="space-y-2 ">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-18 items-center justify-center rounded-2xl text-gradient text-white">
                  <img src="/logo.png" alt="LINGUA" className="h-15 w-20" />
                </div>
                <div>
                  <CardTitle>Student Login</CardTitle>
                  <CardDescription>
                    Log in to your student account to continue learning.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
                  {/* <div className="rounded-3xl border border-border bg-background p-4 text-sm text-muted-foreground">
                    Create a Student account and start learning with verified mentors.
                  </div> */}
            <CardContent className="space-y-4">
              <GoogleButton onClick={() => signInWithGoogle()} loading={loading} />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              <Tabs value={formMode} onValueChange={(value) => setFormMode(value as AuthMode)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Log in</TabsTrigger>
                  <TabsTrigger value="signup">Sign up</TabsTrigger>
                </TabsList>
                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="Enter your Email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="login-password" aria-placeholder="password">
                        Password
                      </Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter your password"
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
                      {/* <GoogleButton onClick={() => signInWithGoogle("student")} loading={loading} /> */}
                </TabsContent>
                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                      <Label htmlFor="signup-name">Full name</Label>
                      <Input
                        id="signup-name"
                        placeholder = "Enter your Name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        placeholder = "Enter your Email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder = "Create New password"
                        autoComplete="new-password"
                        minLength={6}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    {/* group relative w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-[15px] font-medium text-slate-800 shadow-xl transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none disabled:active:scale-100 */}
                    <Button type="submit" className="w-full shadow-sm order border-slate-200 hover:border-slate-100 hover:bg-mentor/30 hover:text-slate-900 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                    </Button>
                  </form>
                  <div className="relative">
                    {/* <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div> */}
                    {/* <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div> */}
                  </div>
                </TabsContent>
              </Tabs>
              <CardDescription className="text-center text-xs">
                By continuing you agree to our terms.
              </CardDescription>
            </CardContent>
          </Card>
          <div className="rounded-3xl border border-border bg-background p-6 shadow-xl shadow-slate-900/5">
            <h2 className="text-base font-semibold">Why Lingua?</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>• Smooth session booking and mentor discovery.</li>
              <li>• Separate student and mentor accounts.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function getSignupErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object")
    return "We could not create your account. Please try again.";
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
  if (
    code === "42501" ||
    message.includes("row-level security") ||
    message.includes("permission denied")
  )
    return "Your account was created, but permission to finish your profile was denied.";
  if (message.includes("network") || message.includes("failed to fetch"))
    return "We could not connect to the server. Check your connection and try again.";
  return "We could not create your account. Please try again.";
}

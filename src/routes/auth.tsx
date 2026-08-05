import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getActiveRole, getDashboardRoute, getOnboardingRoute, shouldRedirectToOnboarding, type AppRole } from "@/lib/auth";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).default("login").catch("login"),
});

type AuthMode = "login" | "signup";

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Lingua" },
      { name: "description", content: "Log in or create your Lingua account to start learning or teaching." },
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
    const [{ data: roles, error: rolesError }, { data: profile, error: profileError }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("onboarded").eq("id", userId).maybeSingle(),
    ]);

    if (rolesError || profileError) {
      console.error("Redirect lookup failed", { rolesError, profileError });
    }

    const fetchedRoles = (roles ?? []).map((r) => r.role as AppRole);
    const onboarded = Boolean(profile?.onboarded);

    if (shouldRedirectToOnboarding(fetchedRoles, onboarded)) {
      navigate({ to: getOnboardingRoute() });
      return;
    }

    const activeRole = getActiveRole(fetchedRoles);
    navigate({ to: getDashboardRoute(activeRole) });
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
      const { data: { session }, error } = await supabase.auth.getSession();
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
      const emailRedirectTo = `${window.location.origin}/onboarding`;
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

      // ── BUG FIX: Wait for the authenticated session to exist before writing roles ──
      // After signUp, the JWT session may not be established client-side yet.
      // Inserting into user_roles before the session exists triggers RLS rejection
      // because the anon key is used instead of the user's JWT.
      if (!data.session) {
        toast.success("Check your inbox to confirm your account.");
        return;
      }

      const hasSession = await waitForSession();
      if (!hasSession) {
        // If no session after waiting, this is an email-confirmation flow.
        // Redirect to onboarding — the callback handler will pick it up.
        toast.success("Check your inbox to confirm your account.");
        navigate({ to: "/onboarding" });
        return;
      }

      // Now the JWT session exists — insert role with authenticated credentials
      const roleRows: { user_id: string; role: "student" | "mentor" }[] = [
        { user_id: data.user.id, role: "student" },
      ];

      const { error: roleError } = await supabase.from("user_roles").upsert(roleRows, { onConflict: "user_id,role" });
      if (roleError) throw roleError;

      toast.success("Account created!");
      navigate({ to: "/onboarding" });
    } catch (error) {
      console.error("Signup failed", error);
      toast.error(getSignupErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data?.url) {
        throw new Error("Google sign-in did not return a redirect URL.");
      }
      window.location.assign(data.url);
    } catch (error) {
      console.error("Google sign-in failed", error);
      toast.error(error instanceof Error ? error.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-hero-gradient/10 px-4 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-[2rem] bg-hero-gradient from-slate-950  via-slate-900 to-slate-800 p-12 text-white shadow-2xl shadow-slate-950/20">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 h-11 w-18 rounded-full text-m uppercase tracking-[0.24em] text-white/80">
             <img src="/logo.png" alt="LINGUA" className="h-15 w-20" /> 
             <p className="bg-gradient" >LINGUA </p>
            </div>
                {/* <div className="flex h-11 w-18 items-center justify-center rounded-2xl bg-gradient text-white"><img src="/logo.png" alt="LINGUA" className="h-15 w-20" /></div> */}
            <h1 className="text-5xl font-display tracking-tight text-white">Learn, teach, and grow in one elegant language platform.</h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-slate-300">
              Create your Lingua student account and start your path to fluency with verified mentors.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm uppercase  tracking-[0.2em]  text-slate-900">Fast start</p>
                <p className="mt-3 text-base text-slate-100">Complete the setup and start using LINGUA in minutes.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-900">Smart onboarding</p>
                <p className="mt-3 text-base text-slate-100">Start as a student and let our team manage mentor applications separately.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-3">
                {/* <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-hero-gradient text-white"><img src="/logo.png" alt="LINGUA" className="h-6 w-6" /></div> */}
                <div className="flex h-11 w-18 items-center justify-center rounded-2xl text-gradient text-white"><img src="/logo.png" alt="LINGUA" className="h-15 w-20" /></div>
                <div>
                  <CardTitle>Welcome back</CardTitle>
                  <CardDescription>Login or create an account to continue your Lingua journey.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* <Button variant="secondary" className="w-full" onClick={handleGoogle} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                Continue with Google
              </Button> */}
              {/* <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <span className="relative flex justify-center text-xs uppercase text-muted-foreground"><span className="bg-card px-2">or</span></span>
              </div> */}
              <Tabs value={formMode} onValueChange={(value) => setFormMode(value as AuthMode)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Log in</TabsTrigger>
                  <TabsTrigger value="signup">Sign up</TabsTrigger>
                </TabsList>
                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email">Email</Label>
                      <Input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="login-password">Password</Label>
                      <Input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup" className="space-y-4">
                  <div className="rounded-3xl border border-border bg-background p-6 text-sm text-muted-foreground">
                    Create a Student account and start learning with verified mentors. Mentor accounts are now managed through a dedicated application process.
                  </div>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                      <Label htmlFor="signup-name">Full name</Label>
                      <Input id="signup-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
              <CardDescription className="text-center text-xs">By continuing you agree to our terms.</CardDescription>
            </CardContent>
          </Card>
          <div className="rounded-3xl border border-border bg-background p-6 shadow-sm shadow-slate-900/5">
            <h2 className="text-base font-semibold">Why Lingua?</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>• Personalized onboarding for learners and mentors.</li>
              <li>• Smooth session booking and mentor discovery.</li>
              <li>• One account for learning, teaching, or both.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function getSupabaseErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") return error;
  const value = error as Record<string, unknown>;
  return {
    status: value.status,
    code: value.code,
    message: value.message,
    details: value.details,
    hint: value.hint,
    responseJson: value,
    stack: value.stack,
  };
}

function getSignupErrorMessage(error: unknown): string {
  const details = getSupabaseErrorDetails(error) as Record<string, unknown> | null;
  const code = String(details?.code ?? "").toLowerCase();
  const message = String(details?.message ?? "").toLowerCase();
  const status = Number(details?.status);

  if (code.includes("user_already_exists") || message.includes("already registered")) return "An account with this email already exists.";
  if (code.includes("invalid_email") || message.includes("invalid email")) return "Enter a valid email address.";
  if (code.includes("weak_password") || message.includes("password")) return "Choose a stronger password with at least 6 characters.";
  if (message.includes("email confirmation") || message.includes("confirm your email")) return "Check your email to confirm your account.";
  if (code === "42501" || message.includes("row-level security") || message.includes("permission denied")) return "Your account was created, but permission to finish your profile was denied.";
  if (message.includes("profile")) return "Your account was created, but profile creation failed. Please try again.";
  if (status === 0 || message.includes("network") || message.includes("failed to fetch")) return "We could not connect to the server. Check your connection and try again.";
  if (status >= 500) return "The authentication server encountered an error. Please try again shortly.";
  return "We could not create your account. Please try again.";
}

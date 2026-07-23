import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Languages, GraduationCap, Users, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).default("login").catch("login"),
  role: z.enum(["student", "mentor"]).default("student").catch("student"),
});

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
  const { mode, role: initialRole } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"student" | "mentor">(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  async function goToDashboardFor(userId: string) {
    console.group("Redirect");
    console.log("Resolving destination", { userId });
    await qc.invalidateQueries();
    const [{ data: roles, error: rolesError }, { data: profile, error: profileError }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("onboarded").eq("id", userId).maybeSingle(),
    ]);
    console.log("Session lookup", { roles, profile, rolesError, profileError });
    if (rolesError || profileError) console.error("Redirect lookup failed", { rolesError, profileError });
    const hasRole = (roles?.length ?? 0) > 0;
    if (!hasRole || !profile?.onboarded) {
      console.log("Redirecting to onboarding", { hasRole, onboarded: profile?.onboarded });
      console.groupEnd();
      navigate({ to: "/onboarding" });
      return;
    }
    const r = roles?.[0]?.role;
    console.log("Redirecting to dashboard", { role: r });
    console.groupEnd();
    navigate({ to: r === "mentor" ? "/mentor/dashboard" : "/student/dashboard" });
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      console.group("Login");
      console.log("email", email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log("Login response", { data, error: error ? getSupabaseErrorDetails(error) : null });
      if (error) console.error("Login error", error);
      console.groupEnd();
      if (error) throw error;
      toast.success("Welcome back!");
      if (data.user) await goToDashboardFor(data.user.id);
    } catch (err) {
      console.error("Login failed", err);
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally { setLoading(false); }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const signupContext = { email, role };
    try {
      const emailRedirectTo = `${window.location.origin}/onboarding`;
      console.group("Signup Debug");
      console.log("email", email);
      console.log("role", role);
      console.log("emailRedirectTo", emailRedirectTo);
      console.groupEnd();

      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo, data: { full_name: fullName, intended_role: role } },
      });
      console.group("Authentication");
      console.log("Signup response", { data, error: error ? getSupabaseErrorDetails(error) : null });
      console.log("returned user", data.user);
      console.log("returned session", data.session);
      if (error) console.error("Signup error", error);
      console.groupEnd();

      if (error) throw error;
      if (!data.user) throw new Error("Signup completed without returning a user.");

      if (!data.session) {
        console.log("Signup requires email confirmation", { email, userId: data.user.id });
        toast.success("Check your email to confirm your account.");
        return;
      }

      const { error: roleError } = await supabase.from("user_roles").insert({ user_id: data.user.id, role });
      console.group("Profile");
      console.log("role insertion", { userId: data.user.id, role, error: roleError ? getSupabaseErrorDetails(roleError) : null });
      if (roleError) console.error("Role insertion failed", roleError);
      console.groupEnd();
      if (roleError) throw roleError;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();
      console.group("Profile");
      console.log("profile verification", { profile, error: profileError ? getSupabaseErrorDetails(profileError) : null });
      if (profileError) console.error("Profile verification failed", profileError);
      console.groupEnd();
      if (profileError) throw profileError;
      if (!profile) throw new Error("Account was created, but the profile could not be created.");

      toast.success("Account created!");
      navigate({ to: "/onboarding" });
    } catch (err) {
      console.group("Signup Debug");
      console.error("Signup failed", { ...signupContext, error: getSupabaseErrorDetails(err) });
      if (err instanceof Error) console.error("stack", err.stack);
      console.groupEnd();
      toast.error(getSignupErrorMessage(err));
    } finally { setLoading(false); }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      console.group("Google OAuth");
      console.log("OAuth started", { provider: "google", redirectTo });
      console.groupEnd();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      console.log("Google OAuth response", { data, error });
      if (error) throw error;
      if (data?.url) {
        console.log("OAuth redirected to provider", { redirectTo, url: data.url });
        window.location.assign(data.url);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      console.log("OAuth user fetched after provider return", { user });
      if (user) await goToDashboardFor(user.id);
    } catch (err) {
      console.error("Google sign-in failed", err);
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-hero-gradient/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-hero-gradient">
            <Languages className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-display">Lingua</span>
        </Link>
        <Card>
          <Tabs defaultValue={mode}>
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Log in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                Continue with Google
              </Button>
              <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <span className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></span>
              </div>

              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-3">
                  <div><Label htmlFor="e">Email</Label><Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div><Label htmlFor="p">Password</Label><Input id="p" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}</Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <CardTitle className="text-base">I want to…</CardTitle>
                <RadioGroup value={role} onValueChange={(v) => setRole(v as "student" | "mentor")} className="grid grid-cols-2 gap-3">
                  <label htmlFor="r-s" className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 ${role === "student" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <RadioGroupItem value="student" id="r-s" className="sr-only" />
                    <GraduationCap className="h-6 w-6" /><span className="font-medium">Learn</span>
                  </label>
                  <label htmlFor="r-m" className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 ${role === "mentor" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <RadioGroupItem value="mentor" id="r-m" className="sr-only" />
                    <Users className="h-6 w-6" /><span className="font-medium">Teach</span>
                  </label>
                </RadioGroup>
                <form onSubmit={handleSignup} className="space-y-3">
                  <div><Label htmlFor="n">Full name</Label><Input id="n" required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                  <div><Label htmlFor="e2">Email</Label><Input id="e2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div><Label htmlFor="p2">Password</Label><Input id="p2" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}</Button>
                </form>
              </TabsContent>
              <CardDescription className="text-center text-xs">By continuing you agree to our terms.</CardDescription>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (<svg className={className} viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>);
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

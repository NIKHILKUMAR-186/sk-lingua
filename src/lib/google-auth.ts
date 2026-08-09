import { supabase } from "@/integrations/supabase/client";

export type IntendedRole = "student" | "mentor";

const OAUTH_STATE_KEY = "lingua_oauth_state";
const INTENDED_ROLE_KEY = "lingua_intended_role";

/**
 * Generates a random state parameter for OAuth security
 */
function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Stores the intended role before OAuth redirect
 * This persists through the OAuth flow
 */
export function setIntendedRole(role: IntendedRole): void {
  try {
    localStorage.setItem(INTENDED_ROLE_KEY, role);
  } catch (error) {
    console.error("Failed to store intended role:", error);
  }
}

/**
 * Retrieves the intended role after OAuth redirect
 */
export function getIntendedRole(): IntendedRole | null {
  try {
    const role = localStorage.getItem(INTENDED_ROLE_KEY);
    if (role === "student" || role === "mentor") {
      return role;
    }
    return null;
  } catch (error) {
    console.error("Failed to retrieve intended role:", error);
    return null;
  }
}

/**
 * Clears the intended role after OAuth completion
 */
export function clearIntendedRole(): void {
  try {
    localStorage.removeItem(INTENDED_ROLE_KEY);
  } catch (error) {
    console.error("Failed to clear intended role:", error);
  }
}

/**
 * Initiates Google OAuth flow with Supabase
 */
export async function signInWithGoogle(role?: IntendedRole): Promise<void> {
  try {
    // Store intended role if provided
    if (role) {
      setIntendedRole(role);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) throw error;
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
}

/**
 * Signs out the current user
 */
export async function signOut(): Promise<void> {
  try {
    clearIntendedRole();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
}
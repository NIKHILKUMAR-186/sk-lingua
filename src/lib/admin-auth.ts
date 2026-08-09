import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ValidationException } from "./validation";

/**
 * Admin authorization middleware for server functions
 * Verifies that the requesting user has admin role
 */

export interface AdminAuthResult {
  success: boolean;
  error?: string;
  userId?: string;
}

/**
 * Verifies admin authorization from request headers
 * Returns the user ID if authorized, or an error response
 */
export async function requireAdminAuth(request: Request): Promise<AdminAuthResult> {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return { success: false, error: "Unauthorized - No token provided" };
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return { success: false, error: "Unauthorized - Invalid token format" };
    }

    // Verify token and get user
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return { success: false, error: "Unauthorized - Invalid or expired token" };
    }

    // Check if user has admin role
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (rolesError || !roles || roles.length === 0) {
      return { success: false, error: "Forbidden - Admin access required" };
    }

    return { success: true, userId: user.id };
  } catch (error) {
    return { success: false, error: "Authentication failed" };
  }
}

/**
 * Wrapper to require admin auth and return error response if not authorized
 */
export function createAdminAuthResponse(authResult: AdminAuthResult): Response | null {
  if (!authResult.success) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: authResult.error,
        code: authResult.error?.includes("Forbidden") ? "FORBIDDEN" : "UNAUTHORIZED"
      }),
      {
        status: authResult.error?.includes("Forbidden") ? 403 : 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  return null;
}
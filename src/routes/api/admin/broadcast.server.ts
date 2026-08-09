import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/notifications/broadcast
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { title, message, targetRoles, targetUserIds } = body;

    // Validate input
    if (!title || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: title, message" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (typeof title !== 'string' || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: "Title and message must be strings" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (title.length > 200) {
      return new Response(
        JSON.stringify({ success: false, error: "Title must be less than 200 characters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (message.length > 2000) {
      return new Response(
        JSON.stringify({ success: false, error: "Message must be less than 2000 characters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const admin = supabaseAdmin as any;

    // Determine target users
    let targetUsers: string[] = [];

    if (targetUserIds && Array.isArray(targetUserIds)) {
      // Specific users
      targetUsers = targetUserIds;
    } else if (targetRoles && Array.isArray(targetRoles)) {
      // All users with specified roles
      const { data: users, error: usersError } = await admin
        .from("user_roles")
        .select("user_id")
        .in("role", targetRoles);

      if (usersError) throw usersError;
      targetUsers = users?.map((u: any) => u.user_id) || [];
    } else {
      // All users
      const { data: profiles, error: profilesError } = await admin
        .from("profiles")
        .select("id");

      if (profilesError) throw profilesError;
      targetUsers = profiles?.map((p: any) => p.id) || [];
    }

    // Create notifications for each target user
    const notifications = targetUsers.map((userId: string) => ({
      user_id: userId,
      title: title.trim(),
      message: message.trim(),
      type: "broadcast",
      created_at: new Date().toISOString(),
    }));

    if (notifications.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No users to notify" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const { error: insertError } = await admin
      .from("notifications")
      .insert(notifications);

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notification sent to ${notifications.length} users`,
        count: notifications.length
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Broadcast notification error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
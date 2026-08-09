import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// GET /api/admin/support-tickets
export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const admin = supabaseAdmin as any;

    // Get all support tickets with user info
    const { data: tickets, error } = await admin
      .from("support_tickets")
      .select("id, user_id, subject, status, priority, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get user profiles for tickets
    const userIds = [...new Set(tickets?.map((t: any) => t.user_id) || [])];
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    if (profilesError) throw profilesError;

    // Create user map
    const userMap: Record<string, any> = {};
    profiles?.forEach((p: any) => {
      userMap[p.id] = p;
    });

    // Combine data
    const ticketsWithUsers = tickets?.map((ticket: any) => ({
      ...ticket,
      user: userMap[ticket.user_id] || { full_name: "Unknown", email: "unknown" },
    })) || [];

    return new Response(
      JSON.stringify({
        success: true,
        data: ticketsWithUsers,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Support tickets error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// POST /api/admin/support-tickets/reply
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { ticketId, message, status } = body;

    // Validate input
    if (!ticketId || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: ticketId, message" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (typeof message !== 'string' || message.length > 5000) {
      return new Response(
        JSON.stringify({ success: false, error: "Message must be a string less than 5000 characters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const admin = supabaseAdmin as any;

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await admin
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ success: false, error: "Ticket not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Add reply to ticket
    const { error: updateError } = await admin
      .from("support_tickets")
      .update({
        last_message: message.trim(),
        status: status || ticket.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (updateError) throw updateError;

    // Create notification for user
    const { error: notifError } = await admin
      .from("notifications")
      .insert({
        user_id: ticket.user_id,
        title: "Support Ticket Update",
        message: `Your support ticket "${ticket.subject}" has been updated.`,
        type: "support_reply",
        created_at: new Date().toISOString(),
      });

    if (notifError) console.error("Failed to create notification:", notifError);

    return new Response(
      JSON.stringify({ success: true, message: "Reply sent successfully" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Support ticket reply error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/admin/demo/assign-mentor
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { bookingId, mentorId } = body;

    if (!bookingId || !mentorId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: bookingId, mentorId" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const admin = supabaseAdmin as any;

    // Fetch booking
    const { data: booking, error: bookingError } = await admin
      .from("demo_session_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ success: false, error: "Demo booking not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // Only allow assignment from unassigned or rejected states
    if (!["unassigned", "needs_reassignment"].includes(booking.assignment_status || "")) {
      return new Response(
        JSON.stringify({ success: false, error: "This demo is already assigned." }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    // Verify mentor exists and is active
    const { data: mentorProfile, error: mentorError } = await admin
      .from("mentor_profiles")
      .select("user_id, is_active")
      .eq("user_id", mentorId)
      .eq("is_active", true)
      .single();

    if (mentorError || !mentorProfile) {
      return new Response(
        JSON.stringify({ success: false, error: "Mentor not found or not active" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // Verify mentor role
    const { data: mentorRoles, error: mentorRoleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", mentorId);

    const hasMentorRole = (mentorRoles ?? []).some((r: any) => r.role === "mentor");
    if (!hasMentorRole) {
      return new Response(
        JSON.stringify({ success: false, error: "User is not a mentor" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Atomic update: only succeed if currently unassigned
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await admin
      .from("demo_session_bookings")
      .update({
        mentor_id: mentorId,
        assignment_status: "pending_mentor",
        assigned_at: now,
        booking_status: "pending_admin_confirmation",
        updated_at: now,
      })
      .eq("id", bookingId)
      .eq("assignment_status", booking.assignment_status || "unassigned")
      .select("*")
      .single();

    if (updateError || !updated) {
      return new Response(
        JSON.stringify({ success: false, error: "Unable to assign mentor. The demo may have been assigned by another admin." }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    // Record assignment history
    await admin.from("demo_assignment_history").insert({
      booking_id: bookingId,
      mentor_id: mentorId,
      action: "assigned",
      performed_by: authResult.userId,
      created_at: now,
    });

    // Notify mentor
    try {
      const { data: student } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", booking.user_id)
        .maybeSingle();

      await admin.from("notifications").insert({
        user_id: mentorId,
        category: "demo_booking",
        kind: "demo_assignment",
        title: "New Demo Session Request",
        body: `You have been assigned a demo session with ${student?.full_name || "a student"} on ${new Date(booking.booking_date).toDateString()} at ${booking.booking_time_start}. Please accept or reject.`,
        related_id: bookingId,
        link: "/mentor/demo-requests",
        metadata: { booking_id: bookingId, type: "demo_assigned", student_name: student?.full_name },
        read: false,
      });
    } catch (notifyErr) {
      console.error("Failed to notify mentor (demo assigned)", notifyErr);
    }

    return new Response(
      JSON.stringify({ success: true, data: updated }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Assign demo mentor error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Unable to assign mentor. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

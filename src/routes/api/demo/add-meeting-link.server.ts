import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { validateMeetingLink } from "@/lib/demo-bookings";

// POST /api/demo/add-meeting-link
// Mentor or Admin adds a Google Meet / meeting link to a demo session.
// After a valid link is added, the session becomes joinable by the student.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, meetingLink, userId, isMentor } = body;

    if (!bookingId || !meetingLink) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: bookingId, meetingLink",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!validateMeetingLink(meetingLink)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid meeting link. Must be a valid HTTPS URL.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const admin = supabaseAdmin as any;

    // Authenticate: try admin first, then mentor
    const authHeader = request.headers.get("Authorization");
    const bearerToken = authHeader?.replace("Bearer ", "");
    let isAdmin = false;
    let isMentorAuth = false;
    let actorId: string | null = null;

    if (bearerToken) {
      const {
        data: { user },
        error: authErr,
      } = await supabaseAdmin.auth.getUser(bearerToken);
      if (!authErr && user) {
        const { data: roles } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        const userRoles = roles?.map((r: any) => r.role) || [];
        if (userRoles.includes("admin")) {
          isAdmin = true;
          actorId = user.id;
        }
        if (userRoles.includes("mentor")) {
          isMentorAuth = true;
          if (!actorId) actorId = user.id;
        }
      }
    }

    // Fallback to body-based auth (if token auth failed)
    if (!isAdmin && !isMentorAuth) {
      if (userId && isMentor) {
        isMentorAuth = true;
        actorId = userId;
      }
    }

    if (!isAdmin && !isMentorAuth) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Use the race-safe PostgreSQL function
    const { data: result, error: fnError } = await admin.rpc("add_demo_meeting_link", {
      p_booking_id: bookingId,
      p_user_id: actorId,
      p_meeting_link: meetingLink,
      p_is_admin: isAdmin,
    });

    if (fnError) {
      console.error("add_demo_meeting_link error:", fnError);
      return new Response(JSON.stringify({ success: false, error: "Database function failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fnResult = result?.[0];
    if (!fnResult?.success) {
      const statusCode = fnResult?.error?.includes("authorized") ? 403 : 409;
      return new Response(
        JSON.stringify({ success: false, error: fnResult?.error || "Unable to add meeting link" }),
        { status: statusCode, headers: { "Content-Type": "application/json" } },
      );
    }

    // Fetch the booking for student notification
    const { data: booking } = await admin
      .from("demo_session_bookings")
      .select("user_id, mentor_id, student:profiles!user_id(full_name, email)")
      .eq("id", bookingId)
      .single();

    // Notify student: session is ready with meeting link
    if (booking?.user_id) {
      try {
        const roleLabel = isAdmin ? "the admin" : "your mentor";
        await admin.from("notifications").insert({
          user_id: booking.user_id,
          category: "demo_ready",
          kind: "demo_ready",
          title: "Your Demo is Ready!",
          body: `Your demo session is ready. ${roleLabel === "the admin" ? "The meeting link has been added." : "A meeting link has been added."} Click to join.`,
          related_id: bookingId,
          link: "/student/sessions",
          metadata: {
            booking_id: bookingId,
            type: "demo_ready",
            meeting_link: meetingLink,
            added_by: roleLabel,
          },
          read: false,
        });
      } catch (notifyErr) {
        console.error("Failed to notify student (meeting link added):", notifyErr);
      }
    }

    // Notify admins if a mentor added the link
    if (!isAdmin && booking?.mentor_id) {
      try {
        const { data: admins } = await admin
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        for (const a of admins ?? []) {
          await admin.from("notifications").insert({
            user_id: a.user_id,
            category: "demo_ready",
            kind: "mentor_added_meeting_link",
            title: "Mentor Added Meeting Link",
            body: "A mentor has added a meeting link. The demo is now ready for the student.",
            related_id: bookingId,
            link: "/admin/demo-queue",
            metadata: {
              booking_id: bookingId,
              type: "mentor_added_link",
              mentor_id: actorId,
            },
            read: false,
          });
        }
      } catch (notifyErr) {
        console.error("Failed to notify admins (mentor added link):", notifyErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking_status: fnResult?.booking_status,
        assignment_status: fnResult?.assignment_status,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Add meeting link error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

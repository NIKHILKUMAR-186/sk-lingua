import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// POST /api/mentor/respond-demo-assignment
// Mentor accepts or rejects a demo assignment
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, mentorId, action, clientVersion, rejectionReason } = body;

    if (!bookingId || !action) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: bookingId, action" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (action !== "accept" && action !== "reject") {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid action. Must be 'accept' or 'reject'." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const admin = supabaseAdmin as any;

    // Authenticate: check if admin is overriding (using admin token)
    const authResult = await requireAdminAuth(request);
    const isAdmin = authResult.success;
    const adminId = authResult.userId;

    // Determine the acting mentor ID:
    // - If admin is overriding, allow specifying mentorId in body
    // - Otherwise, use Bearer token auth to identify mentor
    let actingMentorId: string | null = null;

    if (!isAdmin) {
      const authHeader = request.headers.get("Authorization");
      const bearerToken = authHeader?.replace("Bearer ", "");

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
          if (userRoles.includes("mentor")) {
            actingMentorId = user.id;
          }
        }
      }
    }

    // Fallback to body mentorId (for client-side auth pattern)
    if (!actingMentorId && !isAdmin) {
      actingMentorId = mentorId;
    }

    const mentorIdToUse = actingMentorId || (isAdmin ? mentorId : null);

    if (!mentorIdToUse) {
      return new Response(
        JSON.stringify({ success: false, error: "Not authenticated as mentor" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    // Fetch booking for version + deadline check
    const { data: booking, error: bookingError } = await admin
      .from("demo_session_bookings")
      .select("id, assignment_status, assignment_version, acceptance_deadline, mentor_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ success: false, error: "Demo booking not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify mentor is the assigned one
    if (!isAdmin && booking.mentor_id !== mentorIdToUse) {
      return new Response(JSON.stringify({ success: false, error: "Not assigned to this demo" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Version check (optimistic concurrency)
    if (clientVersion !== undefined && clientVersion !== booking.assignment_version) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Assignment has been modified. Please refresh.",
          code: "VERSION_MISMATCH",
          currentVersion: booking.assignment_version,
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    if (action === "accept") {
      const { data: result, error: fnError } = await admin.rpc("accept_demo_assignment", {
        p_booking_id: bookingId,
        p_mentor_id: mentorIdToUse,
        p_client_version: clientVersion ?? booking.assignment_version,
      });

      if (fnError) {
        console.error("accept_demo_assignment error:", fnError);
        return new Response(JSON.stringify({ success: false, error: "Database function failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      const fnResult = result?.[0];
      if (!fnResult?.success) {
        const statusCode = fnResult?.error?.includes("authorized") ? 403 : 409;
        return new Response(
          JSON.stringify({
            success: false,
            error: fnResult?.error || "Unable to accept assignment",
          }),
          { status: statusCode, headers: { "Content-Type": "application/json" } },
        );
      }

      // Notify student: mentor accepted
      try {
        const { data: bookingInfo } = await admin
          .from("demo_session_bookings")
          .select("user_id, student:profiles!user_id(full_name)")
          .eq("id", bookingId)
          .single();

        if (bookingInfo?.user_id) {
          const { data: mentor } = await admin
            .from("profiles")
            .select("full_name")
            .eq("id", mentorIdToUse)
            .single();

          await admin.from("notifications").insert({
            user_id: bookingInfo.user_id,
            category: "demo_confirmed",
            kind: "mentor_accepted",
            title: "Mentor Assigned",
            body: `Your demo is confirmed with ${mentor?.full_name || "a mentor"}. A meeting link will be provided shortly.`,
            related_id: bookingId,
            link: "/student/sessions",
            metadata: {
              booking_id: bookingId,
              mentor_id: mentorIdToUse,
              mentor_name: mentor?.full_name,
            },
            read: false,
          });
        }
      } catch (notifyErr) {
        console.error("Failed to notify student (mentor accepted):", notifyErr);
      }

      // Notify admins
      try {
        const { data: admins } = await admin
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        for (const a of admins ?? []) {
          await admin.from("notifications").insert({
            user_id: a.user_id,
            category: "demo_confirmed",
            kind: "mentor_accepted",
            title: "Mentor Accepted Demo",
            body: `A mentor has accepted a demo assignment.`,
            related_id: bookingId,
            link: "/admin/demo-queue",
            metadata: { booking_id: bookingId, mentor_id: mentorIdToUse },
            read: false,
          });
        }
      } catch (notifyErr) {
        console.error("Failed to notify admins (mentor accepted):", notifyErr);
      }

      return new Response(JSON.stringify({ success: true, assignment_status: "accepted" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Reject
    const { data: result, error: fnError } = await admin.rpc("reject_demo_assignment", {
      p_booking_id: bookingId,
      p_mentor_id: mentorIdToUse,
      p_rejection_reason: rejectionReason ?? "No reason provided",
      p_client_version: clientVersion ?? booking.assignment_version,
    });

    if (fnError) {
      console.error("reject_demo_assignment error:", fnError);
      return new Response(JSON.stringify({ success: false, error: "Database function failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fnResult = result?.[0];
    if (!fnResult?.success) {
      const statusCode = fnResult?.error?.includes("authorized") ? 403 : 409;
      return new Response(
        JSON.stringify({ success: false, error: fnResult?.error || "Unable to reject assignment" }),
        { status: statusCode, headers: { "Content-Type": "application/json" } },
      );
    }

    // Notify student: mentor rejected, need to reassign
    try {
      const { data: bookingInfo } = await admin
        .from("demo_session_bookings")
        .select("user_id")
        .eq("id", bookingId)
        .single();

      if (bookingInfo?.user_id) {
        await admin.from("notifications").insert({
          user_id: bookingInfo.user_id,
          category: "demo_reassigned",
          kind: "mentor_rejected",
          title: "Demo Reassigned",
          body: "We're finding a new mentor for your session.",
          related_id: bookingId,
          link: "/student/sessions",
          metadata: { booking_id: bookingId, mentor_id: mentorIdToUse },
          read: false,
        });
      }
    } catch (notifyErr) {
      console.error("Failed to notify student (mentor rejected):", notifyErr);
    }

    // Notify admins to reassign
    try {
      const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");

      for (const a of admins ?? []) {
        await admin.from("notifications").insert({
          user_id: a.user_id,
          category: "demo_reassigned",
          kind: "mentor_rejected",
          title: "Mentor Rejected Demo",
          body: "A mentor declined a demo assignment. Please reassign.",
          related_id: bookingId,
          link: "/admin/demo-queue",
          metadata: { booking_id: bookingId, mentor_id: mentorIdToUse, reason: rejectionReason },
          read: false,
        });
      }
    } catch (notifyErr) {
      console.error("Failed to notify admins (mentor rejected):", notifyErr);
    }

    return new Response(
      JSON.stringify({ success: true, assignment_status: "needs_reassignment" }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Respond to demo assignment error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

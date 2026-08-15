import { supabase } from "@/integrations/supabase/client";

// POST /api/mentor/respond-demo-assignment
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, mentorId, action } = body; // action: 'accept' | 'reject'

    if (!bookingId || !mentorId || !action) {
      return new Response("missing params", { status: 400 });
    }

    if (!["accept", "reject"].includes(action)) {
      return new Response("invalid action", { status: 400 });
    }

    const admin = supabase as any;

    // Fetch the demo booking
    const { data: booking, error: bookingErr } = await admin
      .from("demo_session_bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr) throw bookingErr;
    if (!booking) {
      return new Response(JSON.stringify({ error: "Demo booking not found" }), { status: 404 });
    }

    // Verify this mentor is the assigned mentor
    if (booking.mentor_id !== mentorId) {
      return new Response(JSON.stringify({ error: "Not assigned to this mentor" }), { status: 403 });
    }

    // Verify booking is in pending_mentor state
    if (booking.assignment_status !== "pending_mentor") {
      return new Response(JSON.stringify({ error: "This demo is not awaiting your response" }), { status: 409 });
    }

    const now = new Date().toISOString();

    if (action === "accept") {
      // Update booking to confirmed
      const { error: updateErr } = await admin
        .from("demo_session_bookings")
        .update({
          assignment_status: "confirmed",
          booking_status: "confirmed",
          confirmed_at: now,
          updated_at: now,
        })
        .eq("id", bookingId);

      if (updateErr) throw updateErr;

      // Record history
      await admin.from("demo_assignment_history").insert({
        booking_id: bookingId,
        mentor_id: mentorId,
        action: "accepted",
        performed_by: mentorId,
        created_at: now,
      });

      // Create demo workspace
      try {
        const { data: workspace, error: wsErr } = await admin
          .from("demo_session_workspaces")
          .insert({
            booking_id: bookingId,
            mentor_id: mentorId,
            student_id: booking.user_id,
            status: "active",
          })
          .select("*")
          .single();

        if (!wsErr && workspace) {
          await admin
            .from("demo_session_bookings")
            .update({ demo_workspace_id: (workspace as any).id })
            .eq("id", bookingId);
        }
      } catch (wsError) {
        console.error("Failed to create demo workspace", wsError);
      }

      // Notify student
      try {
        const { data: student } = await admin
          .from("profiles")
          .select("full_name")
          .eq("id", booking.user_id)
          .maybeSingle();

        const { data: mentorProfile } = await admin
          .from("profiles")
          .select("full_name")
          .eq("id", mentorId)
          .maybeSingle();

        await admin.from("notifications").insert({
          user_id: booking.user_id,
          category: "demo_confirmation",
          kind: "demo_confirmation",
          title: "Demo Session Confirmed",
          body: `Your demo session has been confirmed with ${mentorProfile?.full_name || "a mentor"}. You will receive the meeting link shortly.`,
          related_id: bookingId,
          metadata: { booking_id: bookingId, type: "demo_confirmed_mentor", mentor_id: mentorId },
          read: false,
        });
      } catch (notifyErr) {
        console.error("Failed to notify student (mentor accepted)", notifyErr);
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
            category: "demo_booking",
            kind: "demo_mentor_accepted",
            title: "Mentor Accepted Demo",
            body: `A mentor has accepted the demo session request.`,
            related_id: bookingId,
            link: "/admin/demo-queue",
            metadata: { booking_id: bookingId, type: "demo_mentor_accepted", mentor_id: mentorId },
            read: false,
          });
        }
      } catch (notifyErr) {
        console.error("Failed to notify admins (mentor accepted)", notifyErr);
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (action === "reject") {
      // Update booking back to needs_reassignment
      const { error: updateErr } = await admin
        .from("demo_session_bookings")
        .update({
          assignment_status: "needs_reassignment",
          mentor_id: null,
          assigned_at: null,
          updated_at: now,
        })
        .eq("id", bookingId);

      if (updateErr) throw updateErr;

      // Record history
      await admin.from("demo_assignment_history").insert({
        booking_id: bookingId,
        mentor_id: mentorId,
        action: "rejected",
        performed_by: mentorId,
        created_at: now,
      });

      // Notify admins
      try {
        const { data: admins } = await admin
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        for (const a of admins ?? []) {
          await admin.from("notifications").insert({
            user_id: a.user_id,
            category: "demo_booking",
            kind: "demo_mentor_rejected",
            title: "Mentor Rejected Demo",
            body: `A mentor rejected a demo session request. It needs reassignment.`,
            related_id: bookingId,
            link: "/admin/demo-queue",
            metadata: { booking_id: bookingId, type: "demo_mentor_rejected", mentor_id: mentorId },
            read: false,
          });
        }
      } catch (notifyErr) {
        console.error("Failed to notify admins (mentor rejected)", notifyErr);
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    return new Response("invalid action", { status: 400 });
  } catch (err: any) {
    console.error("Mentor respond demo assignment error:", err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}

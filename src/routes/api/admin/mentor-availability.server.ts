import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// GET /api/admin/mentor-availability?mentorId=<uuid>
// Admin endpoint to fetch any mentor's availability slots.
export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const url = new URL(request.url);
    const mentorId = url.searchParams.get("mentorId");

    if (!mentorId) {
      return new Response(JSON.stringify({ success: false, error: "Missing mentorId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const admin = supabaseAdmin as any;
    const { data: slots, error } = await admin
      .from("availability_slots")
      .select("*")
      .eq("mentor_id", mentorId)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data: slots ?? [] }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Admin get mentor availability error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// POST /api/admin/mentor-availability
// Admin creates a new availability slot for any mentor.
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { mentorId, day_of_week, start_time, end_time, label, timezone } = body;

    if (!mentorId || !day_of_week || !start_time || !end_time) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: mentorId, day_of_week, start_time, end_time",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const validDays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    if (!validDays.includes(day_of_week)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid day_of_week. Must be one of: ${validDays.join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (start_time >= end_time) {
      return new Response(
        JSON.stringify({ success: false, error: "start_time must be before end_time" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (timezone && !/^[a-zA-Z]+\/[a-zA-Z_]+$/.test(timezone)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid timezone format. Expected IANA format like 'Asia/Kolkata'.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const admin = supabaseAdmin as any;

    const { data: overlapOk } = await admin.rpc("check_availability_overlap", {
      p_mentor_id: mentorId,
      p_day_of_week: day_of_week,
      p_start_time: start_time,
      p_end_time: end_time,
      p_exclude_id: null,
    });

    if (!overlapOk) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This time range overlaps with an existing availability slot for the same day.",
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    const { data: slot, error } = await admin
      .from("availability_slots")
      .insert({
        mentor_id: mentorId,
        day_of_week,
        start_time,
        end_time,
        label: label ?? null,
        timezone: timezone ?? null,
        is_available: true,
      })
      .select("*")
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data: slot }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Admin create availability slot error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// PUT /api/admin/mentor-availability/:id
export async function PUT(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const slotId = segments[segments.length - 1];

    if (!slotId) {
      return new Response(JSON.stringify({ success: false, error: "Missing slot id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { day_of_week, start_time, end_time, label, is_available, timezone } = body;

    if (start_time !== undefined && end_time !== undefined && start_time >= end_time) {
      return new Response(
        JSON.stringify({ success: false, error: "start_time must be before end_time" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (timezone !== undefined && timezone && !/^[a-zA-Z]+\/[a-zA-Z_]+$/.test(timezone)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid timezone format. Expected IANA format like 'Asia/Kolkata'.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const admin = supabaseAdmin as any;

    const { data: existing } = await admin
      .from("availability_slots")
      .select("mentor_id, day_of_week, start_time, end_time")
      .eq("id", slotId)
      .maybeSingle();

    if (!existing) {
      return new Response(JSON.stringify({ success: false, error: "Slot not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const finalDay = day_of_week ?? existing.day_of_week;
    const finalStart = start_time ?? existing.start_time;
    const finalEnd = end_time ?? existing.end_time;

    if (finalStart >= finalEnd) {
      return new Response(
        JSON.stringify({ success: false, error: "start_time must be before end_time" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { data: overlapOk } = await admin.rpc("check_availability_overlap", {
      p_mentor_id: existing.mentor_id,
      p_day_of_week: finalDay,
      p_start_time: finalStart,
      p_end_time: finalEnd,
      p_exclude_id: slotId,
    });

    if (!overlapOk) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This time range overlaps with an existing availability slot for the same day.",
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    const patch: Record<string, unknown> = {};
    if (day_of_week !== undefined) patch.day_of_week = day_of_week;
    if (start_time !== undefined) patch.start_time = start_time;
    if (end_time !== undefined) patch.end_time = end_time;
    if (label !== undefined) patch.label = label ?? null;
    if (is_available !== undefined) patch.is_available = is_available;
    if (timezone !== undefined) patch.timezone = timezone ?? null;

    const { data: slot, error } = await admin
      .from("availability_slots")
      .update(patch)
      .eq("id", slotId)
      .select("*")
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data: slot }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Admin update availability slot error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// DELETE /api/admin/mentor-availability/:id
export async function DELETE(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const slotId = segments[segments.length - 1];

    if (!slotId) {
      return new Response(JSON.stringify({ success: false, error: "Missing slot id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const admin = supabaseAdmin as any;
    const { error } = await admin.from("availability_slots").delete().eq("id", slotId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Admin delete availability slot error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

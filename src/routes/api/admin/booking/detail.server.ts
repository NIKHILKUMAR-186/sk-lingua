import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

// GET /api/admin/booking/detail
export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const url = new URL(request.url);
    const bookingId = url.searchParams.get("bookingId");

    if (!bookingId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing bookingId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const admin = supabaseAdmin as any;

    const { data: booking, error: bookingError } = await admin
      .from("session_requests")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ success: false, error: "Booking not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: timeline } = await admin
      .from("booking_timeline")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });

    const { data: mentorRequests } = await admin
      .from("mentor_session_requests")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });

    return new Response(
      JSON.stringify({
        success: true,
        booking,
        timeline: timeline ?? [],
        mentorRequests: mentorRequests ?? [],
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Booking detail error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" } },
    );
  }
}
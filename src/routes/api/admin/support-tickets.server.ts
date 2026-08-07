import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function GET({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const assigned_to = url.searchParams.get("assigned_to");
    const search = url.searchParams.get("search");

    const admin = supabaseAdmin as any;
    let query = admin.from("support_tickets").select("*", { count: "exact" });

    if (status) query = query.eq("status", status);
    if (assigned_to) query = query.eq("assigned_to", assigned_to);
    if (search) {
      query = query.or(`ticket_number.ilike.%${search}%,subject.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error, count } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    return new Response(JSON.stringify({ data, count }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 });
  }
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { subject, description, category, priority, created_by, assigned_to } = body;

    if (!subject || !description || !created_by) {
      return new Response(JSON.stringify({ error: "missing required fields" }), { status: 400 });
    }

    const admin = supabaseAdmin as any;
    const { data: ticket, error } = await admin
      .from("support_tickets")
      .insert([
        {
          subject,
          description,
          category: category || "other",
          priority: priority || "medium",
          created_by,
          assigned_to,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await admin.from("audit_logs").insert([
      {
        actor_id: created_by,
        scope: "support_tickets",
        action: "create",
        target_entity: "support_ticket",
        target_id: ticket.id,
        description: `Ticket ${ticket.ticket_number} created: ${subject}`,
      },
    ]);

    return new Response(JSON.stringify(ticket), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 });
  }
}
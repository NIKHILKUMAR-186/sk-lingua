import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, createAdminAuthResponse } from "@/lib/admin-auth";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    const authError = createAdminAuthResponse(authResult);
    if (authError) return authError;

    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const noteId = segments[segments.length - 1];

    if (!noteId) {
      return json({ success: false, error: "Missing note id" }, 400);
    }

    const admin = supabaseAdmin as any;
    const { error } = await admin
      .from("admin_notes")
      .delete()
      .eq("id", noteId);

    if (error) throw error;

    return json({ success: true });
  } catch (err: any) {
    console.error("[admin/notes/delete] error:", err);
    return json({ success: false, error: err.message || "Failed to delete note." }, 500);
  }
}

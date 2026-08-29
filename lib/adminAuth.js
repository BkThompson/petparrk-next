// lib/adminAuth.js
//
// Central admin auth check for API routes that use the service role key.
// Every route that touches production data or uses paid external APIs
// (Google Places, Anthropic, etc.) should call this before doing anything.
//
// Usage in a route:
//   import { requireAdmin } from "@/lib/adminAuth";
//
//   export async function POST(request) {
//     const auth = await requireAdmin(request, "approve_vets");
//     if (!auth.ok) return auth.response;
//     const { user, supabaseAdmin } = auth;
//     // ... your existing route logic, using supabaseAdmin
//   }

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Maps permission string to admin_users column name.
// Keep in sync with the is_admin_with() SQL function used by RLS policies.
const PERMISSION_COLUMNS = {
  view_call_sheet: "can_view_call_sheet",
  edit_prices: "can_edit_prices",
  approve_vets: "can_approve_vets",
  manage_users: "can_manage_users",
  manage_team: "can_manage_team",
  any: null, // any active admin, no specific flag required
};

export async function requireAdmin(request, requiredPermission) {
  // 1. Auth header must be present
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const accessToken = authHeader.replace("Bearer ", "");

  // 2. Validate JWT against Supabase auth (using anon key + user's token)
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser(accessToken);

  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid session" },
        { status: 401 },
      ),
    };
  }

  // 3. Validate permission string
  const permCol = PERMISSION_COLUMNS[requiredPermission];
  if (permCol === undefined) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Invalid permission: ${requiredPermission}` },
        { status: 500 },
      ),
    };
  }

  // 4. Look up user in admin_users using service role (bypasses RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const selectCols = permCol ? `${permCol}, status` : "status";
  const { data: adminRow, error: adminError } = await supabaseAdmin
    .from("admin_users")
    .select(selectCols)
    .eq("email", user.email)
    .eq("status", "active")
    .maybeSingle();

  if (adminError) {
    console.error("requireAdmin: admin_users lookup failed", adminError);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Admin check failed" },
        { status: 500 },
      ),
    };
  }

  if (!adminRow) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      ),
    };
  }

  if (permCol && !adminRow[permCol]) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Insufficient permission: ${requiredPermission}` },
        { status: 403 },
      ),
    };
  }

  // 5. All checks passed
  return {
    ok: true,
    user,
    supabaseAdmin,
  };
}

// app/api/admin/user-emails/route.js
//
// Returns { [userId]: email } for a set of profile IDs.
// Email lives in auth.users, which the anon client can't read — so this
// route uses the service-role key (server-only) to look them up.
//
// Security: verifies the caller's bearer token belongs to a row in
// admin_users before returning any emails. Non-admins get 403.

import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function POST(req) {
  try {
    // 1. Verify the caller is signed in.
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Confirm the caller is an admin (present in admin_users, active).
    const callerEmail = (userData.user.email || "").toLowerCase();
    const { data: adminRow } = await admin
      .from("admin_users")
      .select("id, status")
      .eq("email", callerEmail)
      .maybeSingle();
    if (!adminRow || adminRow.status !== "active") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Read the requested ids.
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.slice(0, 2000) : [];
    if (ids.length === 0) {
      return Response.json({ emails: {} });
    }

    // 4. Look up emails from auth.users via the admin API (paginated).
    const wanted = new Set(ids);
    const emails = {};
    let page = 1;
    const perPage = 1000;
    for (let i = 0; i < 50; i++) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) break;
      const users = data?.users || [];
      for (const u of users) {
        if (wanted.has(u.id)) emails[u.id] = u.email || null;
      }
      if (users.length < perPage) break;
      page += 1;
    }

    return Response.json({ emails });
  } catch (err) {
    return Response.json(
      { error: err?.message || "Server error" },
      { status: 500 },
    );
  }
}

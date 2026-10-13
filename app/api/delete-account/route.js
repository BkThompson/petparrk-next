import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Buckets whose objects are keyed on the user's id:
//   avatars -> `${userId}/avatar.ext`
//   pets    -> `${userId}/${petId}.ext`
const USER_BUCKETS = ["avatars", "pets"];

// Storage has no foreign keys, so deleting the auth user doesn't touch
// uploaded files — the pet photos and avatar would outlive the account.
//
// Best effort on purpose. By the time this runs the account is already gone,
// and a leftover image shouldn't turn a successful deletion into an error the
// person sees. Whatever is left is returned in storageWarning and logged, so
// it shows up somewhere instead of vanishing.
async function removeUserFiles(admin, userId) {
  const leftover = [];
  for (const bucket of USER_BUCKETS) {
    try {
      const { data: files, error: listError } = await admin.storage
        .from(bucket)
        .list(userId);
      if (listError) {
        leftover.push(`${bucket}: ${listError.message}`);
        continue;
      }
      if (!files || files.length === 0) continue;
      const paths = files.map((f) => `${userId}/${f.name}`);
      const { error: removeError } = await admin.storage
        .from(bucket)
        .remove(paths);
      if (removeError) leftover.push(`${bucket}: ${removeError.message}`);
    } catch (err) {
      leftover.push(`${bucket}: ${err.message}`);
    }
  }
  return leftover;
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessToken = authHeader.replace("Bearer ", "");

    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // The id comes from the verified token and never from the request body,
    // so a caller can only ever delete themselves.
    //
    // Order matters. The account goes first: if this fails, nothing has been
    // removed and the page can honestly say so. Files are cleaned up after,
    // because a leftover image is a far smaller problem than a half-deleted
    // account that can still sign in.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      user.id,
    );

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // The database rows are already gone by cascade — profiles.id cascades
    // from auth.users, and pets, saved_vets, symptom_checks, pet_care_entries,
    // hero_stat_presets and all seven copilot_* tables cascade from one or the
    // other. Storage is the only thing left to do by hand.
    const leftover = await removeUserFiles(supabaseAdmin, user.id);
    if (leftover.length > 0) {
      console.error("delete-account: files left behind for", user.id, leftover);
      return NextResponse.json({ success: true, storageWarning: leftover });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

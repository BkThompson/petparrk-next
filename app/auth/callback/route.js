import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  if (code || tokenHash) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );

    // Establish the session from whichever flow the link used:
    // - PKCE / OAuth: ?code=...
    // - Email OTP links: ?token_hash=...&type=...
    let authError = null;
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      authError = error;
    } else {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      });
      authError = error;
    }

    if (!authError) {
      // Password recovery flow → reset password page.
      if (otpType === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      // First-authenticated-load onboarding gate.
      // This callback is the single chokepoint for both email-confirmation
      // signup and OAuth, so it is the one place guaranteed to run once when
      // a brand-new user first lands authenticated. If their profile has not
      // yet seen the welcome intro, flag the destination URL with ?welcome=1
      // and let the client-side WelcomeModal take over (and clear the flag).
      const destination = new URL(next, origin);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("has_seen_welcome")
            .eq("id", user.id)
            .single();
          if (profile && profile.has_seen_welcome === false) {
            destination.searchParams.set("welcome", "1");
          }
        }
      } catch (e) {
        // Non-fatal: if the lookup fails, fall through to a normal redirect.
        console.error("Welcome-gate lookup failed:", e?.message ?? e);
      }
      return NextResponse.redirect(destination.toString());
    }

    console.error("Auth callback error:", authError.message);
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_callback_error`);
}

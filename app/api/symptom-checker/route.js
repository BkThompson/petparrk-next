// app/api/symptom-checker/route.js
// Guests get a limited number of checks; signed-in users are unlimited. The
// limit is enforced HERE, not in the browser — the localStorage flag on the
// client is only a fast path so the UI can respond without a round trip.
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Anonymous allowance. Deliberately not 1: households, offices, campuses and
// mobile carriers share one address, so a limit of 1 tells the second person on
// a network they've used a check they never ran.
const GUEST_LIMIT = 3;
const WINDOW_HOURS = 24;
// Follow-up turns inside one conversation are free, which left the cost of a
// single guest conversation unbounded. These cap it.
const GUEST_MAX_TURNS = 12;
const MAX_MESSAGES = 40;
const MAX_CHARS = 12000;

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
}

// Raw IPs are never stored — hashed with a server-side salt, so the table holds
// an opaque key that cannot be reversed into an address.
function hashIp(req) {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0].trim() || "unknown";
  return crypto
    .createHash("sha256")
    .update(ip + (process.env.GUEST_LIMIT_SALT || ""))
    .digest("hex");
}

// Cloudflare siteverify. Only called for a guest starting a NEW check, so a
// follow-up turn never needs a fresh token.
async function verifyTurnstile(token, req) {
  // Two widgets, two secrets. The symptom checker uses an invisible widget so
  // a challenge never interrupts triage; sign-in keeps the managed one, where
  // a visible check is reassuring rather than obstructive. A token is only
  // valid against the secret belonging to the widget that issued it, so this
  // route verifies with the invisible secret and falls back to the managed one
  // if that isn't configured.
  const secret =
    process.env.TURNSTILE_SECRET_KEY_INVISIBLE ||
    process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured — skip
  if (!token) {
    console.error("[captcha] no token sent with a new guest check");
    return false;
  }
  try {
    const fwd = req.headers.get("x-forwarded-for") || "";
    const body = new URLSearchParams({
      secret,
      response: token,
    });
    const ip = fwd.split(",")[0].trim();
    if (ip) body.append("remoteip", ip);
    const r = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body },
    );
    const json = await r.json();
    if (json.success !== true) {
      // Cloudflare names the reason: timeout-or-duplicate means the token was
      // already used or has expired, which is the likely case here — the token
      // is issued on the landing page, then sits through three guided steps
      // before the first message, and is reused on a second check.
      console.error(
        "[captcha] siteverify rejected:",
        JSON.stringify(json["error-codes"] || json),
      );
    }
    return json.success === true;
  } catch (e) {
    // Cloudflare unreachable. Fail open, same reasoning as the usage counter:
    // an outage at their end must not block triage guidance.
    return true;
  }
}

async function getUser(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const { data, error } = await sb.auth.getUser(token);
  return error ? null : (data?.user ?? null);
}

// Only NEW conversations count. Follow-up turns inside a check the guest has
// already started are free, or the limit would fire mid-conversation.
async function allowGuest(req, isNewCheck) {
  if (!isNewCheck) return { ok: true };
  const db = admin();
  const ip_hash = hashIp(req);
  const since = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000).toISOString();

  // Counts on ip_hash, not id: the table is (ip_hash, created_at) with no id
  // column, and selecting a column that doesn't exist returns an error — which
  // the fail-open below then turns into unlimited free checks. That was the
  // bug: the limiter looked correct and silently never fired.
  const { count, error } = await db
    .from("guest_check_usage")
    .select("ip_hash", { count: "exact", head: true })
    .eq("ip_hash", ip_hash)
    .gte("created_at", since);

  // Fail open on an infrastructure error: a database blip must never stand
  // between a worried owner and triage guidance. But log it — failing open
  // silently is how this limiter ran for weeks without enforcing anything and
  // without leaving a single row behind.
  if (error) {
    console.error("[guest-limit] count failed, failing open:", error.message);
    return { ok: true };
  }
  if ((count ?? 0) >= GUEST_LIMIT) return { ok: false };

  const { error: insertError } = await db
    .from("guest_check_usage")
    .insert({ ip_hash });
  if (insertError) {
    console.error("[guest-limit] insert failed:", insertError.message);
  }
  return { ok: true };
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Lets the symptom checker ask, before it asks anyone three questions, whether
// a guest has any free checks left. Walling someone at the end of the flow is a
// worse experience than telling them at the start. Read-only: it counts, it
// never inserts, so calling it does not consume an allowance.
export async function GET(req) {
  const user = await getUser(req);
  if (user) return Response.json({ guest: false, remaining: null });

  try {
    const db = admin();
    const since = new Date(
      Date.now() - WINDOW_HOURS * 3600 * 1000,
    ).toISOString();
    const { count, error } = await db
      .from("guest_check_usage")
      .select("ip_hash", { count: "exact", head: true })
      .eq("ip_hash", hashIp(req))
      .gte("created_at", since);

    // Fail open, consistent with allowGuest: if we can't count, don't block.
    if (error) {
      console.error("[guest-limit] status count failed:", error.message);
      return Response.json({ guest: true, remaining: GUEST_LIMIT });
    }
    const used = count ?? 0;
    return Response.json({
      guest: true,
      remaining: Math.max(0, GUEST_LIMIT - used),
      limit: GUEST_LIMIT,
    });
  } catch (e) {
    return Response.json({ guest: true, remaining: GUEST_LIMIT });
  }
}

export async function POST(req) {
  try {
    const { messages, pet, followUpContext, captchaToken } = await req.json();

    // Size limits apply to everyone: a signed-in account is free to create, so
    // "authenticated" is not a trust boundary against cost abuse.
    if (!Array.isArray(messages) || messages.length > MAX_MESSAGES) {
      return Response.json({ error: "too_many_messages" }, { status: 400 });
    }
    const totalChars = messages.reduce(
      (n, m) => n + String(m?.content ?? "").length,
      0,
    );
    if (totalChars > MAX_CHARS) {
      return Response.json({ error: "message_too_long" }, { status: 400 });
    }

    const user = await getUser(req);
    if (!user) {
      const turns = messages.filter((m) => m.role === "assistant").length;
      const isNewCheck = turns === 0;
      if (turns >= GUEST_MAX_TURNS) {
        return Response.json(
          {
            error: "guest_limit_reached",
            message:
              "That's as far as a free check goes. Create a free account to keep going.",
          },
          { status: 401 },
        );
      }
      if (isNewCheck && !(await verifyTurnstile(captchaToken, req))) {
        return Response.json(
          {
            error: "captcha_failed",
            message: "We couldn't verify that request. Please try again.",
          },
          { status: 403 },
        );
      }
      const gate = await allowGuest(req, isNewCheck);
      if (!gate.ok) {
        return Response.json(
          {
            error: "guest_limit_reached",
            message:
              "You've used your free checks. Create a free account to keep going.",
          },
          { status: 401 },
        );
      }
    }

    const assistantTurns = messages.filter(
      (m) => m.role === "assistant",
    ).length;

    const systemPrompt = `You are PetParrk's veterinary triage assistant — a warm, knowledgeable companion helping pet owners understand when their pet needs care.


${
  pet
    ? `You are checking on ${pet.name}, a ${pet.species || "pet"}${
        pet.breed ? ` (${pet.breed})` : ""
      }${pet.sex ? `, ${pet.sex.toLowerCase()}` : ""}${
        pet.birthday ? `, born ${pet.birthday}` : ""
      }${
        pet.weight_lbs ? `, weighing ${pet.weight_lbs} lbs` : ""
      }.${pet.allergies ? ` Known allergies: ${pet.allergies}.` : ""}${
        pet.medications ? ` Current medications: ${pet.medications}.` : ""
      }`
    : "You are helping a pet owner who has not logged in. Ask for the pet's species, breed, and age before beginning."
}


YOUR ROLE:
- You triage symptoms — you do NOT diagnose or prescribe
- Gather information through natural conversation before reaching a conclusion
- Use the pet's name naturally throughout — it makes owners feel heard
- Be warm and caring — this owner loves their pet and is worried
- Reference what they've already told you — never make them repeat themselves
- End every triage result with something personal and encouraging


FORMATTING — MANDATORY MARKDOWN STRUCTURE:

Your responses MUST be formatted with proper markdown. This is NOT optional.

Paragraph rules:
- Separate paragraphs with a BLANK LINE (press Enter TWICE between paragraphs).
- A new thought or topic shift requires a new paragraph.
- Never write multiple sentences as a single wall of text.
- NEVER use markdown headings (#, ##, ###) — this is a chat conversation, not an article. Use **bold** to emphasize section labels instead.

Question rules — these are STRICT:
- ONE question = plain prose, no list.
- TWO OR MORE questions = MUST use bullet list or numbered list. NEVER prose.
- NEVER join two questions with the word "and" in a single sentence.

How to ask multiple questions — use this exact pattern:

For 2 parallel questions (bullets):
	A couple things would help:
	- Is the issue with his eyes, ears, or both?
	- What does it look like — redness, discharge, swelling?

For 3+ questions (numbered):
	A few things would help me understand better:
	1. When did the symptom start?
	2. Has he eaten today?
	3. Has he been around any new food or plants?

EXAMPLES OF WHAT NOT TO DO (these violate the rules above):

❌ BAD: "Can you tell me if the issue is with his eyes or ears? And what does it look like?"
✅ GOOD: 
	A couple things would help:
	- Is the issue with his eyes or ears?
	- What does it look like — redness, discharge, swelling?

❌ BAD: "How long has this been going on and has he been eating normally?"
✅ GOOD:
	Two quick things:
	- How long has this been going on?
	- Has he been eating normally?

❌ BAD: "Tell me more about the symptoms. When did they start, what do they look like, and is he eating?"
✅ GOOD:
	A few things would help:
	1. When did the symptoms start?
	2. What do they look like?
	3. Is he eating normally?

Other formatting:
- Use bullet points (lines starting with "- ") for any list of items, symptoms, or steps.
- Use **bold** to highlight critical words or warnings within a sentence.
- Keep formatting natural — only use lists for genuine 2+ item content.


HOW TO RESPOND — THIS IS CRITICAL:
- Ask only 1-2 focused questions per response. Never list 5 questions at once.
- Write in short, plain sentences. No clinical language. No numbered lists unless essential.
- One short paragraph per response during the question phase. Keep it conversational.
- Each question should feel like it naturally follows from what they just said.
- If they volunteer extra information, absorb it and adjust your next question accordingly.


FOLLOW-UP LIMIT:
- You have already responded ${assistantTurns} time(s) in this conversation.
- Use your first 3-4 responses to gather information through 1-2 questions each.
- By your FIFTH response (when assistantTurns >= 4), you MUST issue a triage result.
- If assistantTurns >= 4 and you still feel uncertain, make your best clinical judgment and issue the result anyway — do not ask more questions.
- NEVER ask more than 4 rounds of follow-up questions under any circumstances.


WHAT TO ASK ABOUT (spread across turns, not all at once):
- The specific symptom and when it started
- Eating, drinking, and energy level
- Any other symptoms alongside the main one
- Recent changes (new food, environment, medications, exposures)
- Breed-specific risks when relevant (e.g. bloat for deep-chested breeds, breathing issues for brachycephalic breeds)


KNOWLEDGE SOURCES:
- Base all advice strictly on established veterinary medicine
- Follow AVMA (American Veterinary Medical Association) guidelines
- Reference peer-reviewed veterinary knowledge only
- Do NOT speculate or pull from unverified sources
- When uncertain, always recommend professional veterinary evaluation


TRIAGE LEVELS — when you have enough information (or by your 5th response), provide one of these:


🔴 EMERGENCY — Needs immediate emergency vet care (life-threatening symptoms: difficulty breathing, seizures, collapse, severe bleeding, suspected poisoning, inability to urinate, pale/white gums, bloated abdomen, loss of consciousness)


🟡 SEE A VET SOON — Schedule within 24-48 hours (limping, vomiting more than twice, diarrhea lasting over 24 hours, not eating for 24+ hours, eye discharge, ear scratching, lethargy without other symptoms)


🟢 MONITOR AT HOME — Watch carefully for 24 hours (single vomit with no other symptoms, mild lethargy, minor scrape, slight change in appetite)


NO EMOJI:
Do not use emoji anywhere in your replies. They arrive at random — a yellow
heart one time, a blue one the next — which implies a meaning that isn't there,
and an owner reading about a sick animal can read a cheerful symbol as the
wrong signal entirely. Urgency is carried by the triage card, which has its own
colour. Warmth belongs in the words.

USE THE PET'S NAME AND BREED, AND NEVER ALTER THEM:
Referring to the pet by name and breed is what makes this feel like care rather
than a form, so use them — but reproduce them character for character as the
owner gave them. Never substitute a different word: an owner who typed "Yorkee"
was once answered about a "Torkie", which is neither what they wrote nor a real
breed, and it undermines trust in everything else in the reply.

If a breed is unfamiliar or looks misspelled, do not guess at what was meant and
do not silently fix it. Either use their exact spelling or fall back to the
species — "your dog" is always safe. Both are better than a word they did not
write.

TRIAGE RESULT FORMAT:
Emit the tags on EVERY response that gives guidance about what to do or what
to watch for — not only when you consider the conversation finished. If your
reply tells the owner to watch for warning signs, to call a vet, or to monitor
at home, that IS a result and it must carry the tags. Leaving them off means
the owner sees advice with no urgency level attached, which is worse than no
advice. Only omit them while you are still asking clarifying questions and
have given no guidance at all.

Your response MUST include ALL of the following tags at the very top, before any other text:


[TRIAGE_RESULT: EMERGENCY | SEE_VET | MONITOR]
[DIFFERENTIALS: Condition 1, Condition 2, Condition 3]


Rules for DIFFERENTIALS:
- Always include 2-4 possible conditions, never more
- Use plain English names a pet owner would understand (e.g. "Ear infection" not "Otitis externa")
- Be specific where breed or age context applies (e.g. "Hip dysplasia (common in Boxers)")
- If only one condition is likely, still list 1-2 alternatives so the owner understands the range
- Never leave this tag out when issuing a triage result


Then write your warm, specific explanation followed by:
- For 🔴: Exact signs that mean go immediately, what to do right now
- For 🟡: What to watch for, what to tell the vet, home comfort steps
- For 🟢: Specific home care instructions (not generic), exact warning signs to watch for that would upgrade to 🟡 or 🔴, check-in reminder


DISCLAIMER — always include at the end of your triage result, formatted as a blockquote (prefix every line with "> "):
"> ⚕️ Important: PetParrk provides triage guidance only and is not a substitute for professional veterinary care. We are not veterinarians or medical professionals. Always consult a licensed veterinarian for your pet's health decisions. When in doubt, call your vet."


CRITICAL FORMAT REMINDER — READ BEFORE RESPONDING:
This is non-negotiable. Before sending your response, verify:
1. Did I use a BLANK LINE between paragraphs? (Required)
2. If I have 2+ questions, did I format them as a list? (Required — NEVER use "and" to join questions)
3. Did I avoid wall-of-text prose? (Required)

If you wrote two questions in one sentence joined by "and," STOP. Rewrite as a list before responding. This is the most common mistake to avoid.


PERSONALITY:
- Warm but not overly casual
- Specific and actionable — never vague
- Uses the pet's name often
- Never dismissive of the owner's concern
- Ends with encouragement: "${pet?.name || "your pet"} is lucky to have someone paying such close attention."`;

    // ── FOLLOW-UP CONTEXT ──
    // When the user started this check as a follow-up to an earlier one, the
    // prior check is appended as BACKGROUND. It is deliberately framed so the
    // model treats it as history to weigh, never as a confirmed diagnosis —
    // the owner may have seen a vet since, or the issue may be unrelated.
    const finalSystemPrompt = followUpContext
      ? `${systemPrompt}\n\n---\n\n${followUpContext}`
      : systemPrompt;

    // ── STREAMING ──
    // Returns a streaming text response so the UI can display words as they arrive
    const stream = await client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      system: finalSystemPrompt,
      messages: messages,
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(new TextEncoder().encode(chunk.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Symptom checker API error:", error);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

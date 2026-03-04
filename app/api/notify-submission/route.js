// app/api/notify-submission/route.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const body = await request.json();
    const { vet_name, service_name, price_paid, visit_date, submitter_note } =
      body;

    const { data, error } = await resend.emails.send({
      from: "PetParrk <onboarding@resend.dev>",
      to: ["bkalthompson@gmail.com"],
      subject: `💰 New price submission: ${vet_name} — ${service_name}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #2d6a4f; margin: 0 0 16px 0;">🐾 New Price Submission</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #888; font-size: 13px; width: 40%;">Vet</td>
              <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #111;">${vet_name}</td>
            </tr>
            <tr style="border-top: 1px solid #f0f0f0;">
              <td style="padding: 8px 0; color: #888; font-size: 13px;">Service</td>
              <td style="padding: 8px 0; font-size: 13px; color: #111;">${service_name}</td>
            </tr>
            <tr style="border-top: 1px solid #f0f0f0;">
              <td style="padding: 8px 0; color: #888; font-size: 13px;">Price Paid</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; color: #2d6a4f;">$${Number(
                price_paid
              ).toLocaleString()}</td>
            </tr>
            ${
              visit_date
                ? `
            <tr style="border-top: 1px solid #f0f0f0;">
              <td style="padding: 8px 0; color: #888; font-size: 13px;">Visit Date</td>
              <td style="padding: 8px 0; font-size: 13px; color: #111;">${visit_date}</td>
            </tr>`
                : ""
            }
            ${
              submitter_note
                ? `
            <tr style="border-top: 1px solid #f0f0f0;">
              <td style="padding: 8px 0; color: #888; font-size: 13px;">Note</td>
              <td style="padding: 8px 0; font-size: 13px; color: #555; font-style: italic;">"${submitter_note}"</td>
            </tr>`
                : ""
            }
          </table>

          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #eee;">
            <a href="https://petparrk.com/admin" 
               style="display: inline-block; padding: 10px 20px; background: #2d6a4f; color: #fff; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600;">
              Review in Admin →
            </a>
          </div>

          <p style="margin-top: 16px; font-size: 11px; color: #aaa;">
            Submitted via PetParrk price submission form
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, id: data.id });
  } catch (err) {
    console.error("notify-submission error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

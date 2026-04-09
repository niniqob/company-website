import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  name: string;
  phone: string;
  subject: string;
  message: string;
}

// Production email configuration
// FROM: Must match verified Resend domain (autocenter.ge)
// TO: Support inbox for receiving contact form messages
const FROM_EMAIL = "support@autocenter.ge";
const TO_EMAIL = "carpartsspprt@gmail.com";
const EMAIL_SUBJECT = "New Contact Message";

function formatTimestamp(): string {
  return new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tbilisi",
  });
}

// Escape HTML entities to prevent XSS
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

function buildContactEmail(data: ContactEmailRequest): string {
  const timestamp = formatTimestamp();
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>New Contact Form Submission</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a1a1a, #2d2d2d); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📬 New Contact Form Message</h1>
          <p style="margin: 5px 0 0; opacity: 0.9;">Received: ${escapeHtml(timestamp)}</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <h2 style="color: #c41e3a; margin-top: 0;">Customer Information</h2>
          <table style="width: 100%;">
            <tr>
              <td style="padding: 8px 0; width: 100px;"><strong>Name:</strong></td>
              <td>${escapeHtml(data.name)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Phone:</strong></td>
              <td><a href="tel:${escapeHtml(data.phone)}" style="color: #c41e3a;">${escapeHtml(data.phone)}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Subject:</strong></td>
              <td>${escapeHtml(data.subject)}</td>
            </tr>
          </table>

          <h2 style="color: #c41e3a;">Message</h2>
          <div style="background: #fff; padding: 15px; border-left: 4px solid #c41e3a; border-radius: 0 4px 4px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(data.message)}</p>
          </div>
        </div>
        
        <div style="background: #1a1a1a; color: #999; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">This message was sent via the Auto Center contact form</p>
          <p style="margin: 5px 0 0; font-size: 11px;">Date: ${escapeHtml(timestamp)}</p>
        </div>
      </body>
    </html>
  `;
}

const getResendUserFacingErrorMessage = (rawMessage: string): string => {
  const msg = String(rawMessage || "").trim();

  // Make domain verification problems actionable (this should surface in the UI toast)
  if (/domain\s+is\s+not\s+verified/i.test(msg)) {
    return "Resend domain not verified. Verify autocenter.ge in Resend and set sender support@autocenter.ge.";
  }

  return msg || "Unknown error";
};

const jsonResponse = (status: number, body: unknown): Response => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
};

const handler = async (req: Request): Promise<Response> => {
  console.log("=== send-contact-email: received request ===");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  console.log(`RESEND_API_KEY present: ${Boolean(resendApiKey)}`);

  if (!resendApiKey) {
    console.error("RESEND_API_KEY is not configured");
    return jsonResponse(500, {
      error: "Missing RESEND_API_KEY in edge function environment.",
    });
  }

  try {
    const payload: ContactEmailRequest = await req.json();
    const { name, phone, subject, message } = payload;

    console.log(`=== send-contact-email: processing from ${name} ===`);

    // Validate required fields (phone is required)
    if (!name || !phone || !subject || !message) {
      console.log("=== send-contact-email: validation failed - missing fields ===");
      console.log(`Missing: name=${!name}, phone=${!phone}, subject=${!subject}, message=${!message}`);
      return jsonResponse(400, { error: "გთხოვთ, შეავსოთ ყველა აუცილებელი ველი." });
    }

    console.log("=== send-contact-email: preparing email ===");
    console.log(`From: Auto Center <${FROM_EMAIL}>`);
    console.log(`To: ${TO_EMAIL}`);
    console.log(`Subject: ${EMAIL_SUBJECT}`);

    const resend = new Resend(resendApiKey);
    const html = buildContactEmail({ name, phone, subject, message });

    console.log("=== send-contact-email: calling Resend API ===");

    const emailResponse = await resend.emails.send({
      from: `Auto Center <${FROM_EMAIL}>`,
      to: [TO_EMAIL],
      subject: EMAIL_SUBJECT,
      html,
    });

    if ((emailResponse as any)?.error) {
      const err = (emailResponse as any).error;
      console.error("=== send-contact-email: Resend returned error ===");
      console.error(JSON.stringify(err, null, 2));

      return jsonResponse(500, {
        error: getResendUserFacingErrorMessage(err?.message),
      });
    }

    console.log("=== send-contact-email: SUCCESS ===");
    console.log(`Resend id: ${(emailResponse as any)?.data?.id ?? "(no id)"}`);

    return jsonResponse(200, { success: true });
  } catch (error: any) {
    const message = getResendUserFacingErrorMessage(error?.message ?? String(error));
    console.error("=== send-contact-email: EXCEPTION ===");
    console.error(message);

    return jsonResponse(500, { error: message });
  }
};

serve(handler);

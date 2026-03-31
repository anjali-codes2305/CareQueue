import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { receipt } = await req.json();
    const email = receipt?.email;
    
    if (!email) {
      throw new Error("No email address provided in receipt data");
    }

    const smtpEmail = Deno.env.get("SMTP_EMAIL");
    const smtpPassword = Deno.env.get("SMTP_APP_PASSWORD");

    if (!smtpEmail || !smtpPassword) {
      throw new Error("SMTP credentials are not configured in edge function environment variables");
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: smtpEmail,
          password: smtpPassword,
        },
      },
    });

    await client.send({
      from: smtpEmail,
      to: email,
      subject: `CareQueue: Patient Registration Receipt - Token #${receipt.token_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #ffffff;">
          <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 8px;">Appointment Confirmed, ${receipt.name}!</h1>
          <p style="color: #64748b; font-size: 15px; line-height: 1.6;">
            Your appointment has been successfully registered. Please find your receipt and token details below.
          </p>
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px 0; color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Receipt Details</p>
            <p style="margin: 0 0 8px 0; color: #0f172a; font-size: 15px;"><strong>Doctor:</strong> ${receipt.doctor_name}</p>
            <p style="margin: 0 0 8px 0; color: #0f172a; font-size: 15px;"><strong>Purpose:</strong> ${receipt.purpose}</p>
            <p style="margin: 0 0 8px 0; color: #0f172a; font-size: 15px;"><strong>Token Number:</strong> <span style="font-size: 18px; font-weight: bold; color: #0ea5e9;">#${receipt.token_number}</span></p>
            <p style="margin: 0 0 8px 0; color: #0f172a; font-size: 15px;"><strong>Queue Position:</strong> ${receipt.queue_position}</p>
            <p style="margin: 0; color: #0f172a; font-size: 15px;"><strong>Estimated Wait:</strong> ${receipt.estimated_wait_minutes} mins</p>
          </div>
          ${receipt.temp_username ? `
          <div style="background: #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px 0; color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Login Credentials</p>
            <p style="margin: 0 0 8px 0; color: #0f172a; font-size: 15px;"><strong>Username:</strong> ${receipt.temp_username}</p>
            <p style="margin: 0; color: #0f172a; font-size: 15px;"><strong>Password:</strong> <code style="background: #cbd5e1; padding: 2px 8px; border-radius: 4px; font-size: 14px;">${receipt.temp_password}</code></p>
          </div>
          ` : ''}
          <p style="color: #64748b; font-size: 14px; margin-top: 24px;">Thank you for choosing CareQueue!</p>
        </div>
      `,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true, message: "Receipt emailed successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending email:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

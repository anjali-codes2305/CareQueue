import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !callerUser) throw new Error("Unauthorized");
    const callerId = callerUser.id;

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Only admins can create employees");

    const body = await req.json();
    const { full_name, emp_id, designation, department_id, email, phone, role } = body;

    if (!full_name || !emp_id || !designation || !email || !role) {
      throw new Error("Missing required fields: full_name, emp_id, designation, email, role");
    }

    // Validate role
    const validRoles = ["doctor", "nurse", "receptionist"];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(", ")}`);
    }

    // Generate password
    const password = `CQ-${emp_id}-${Math.random().toString(36).slice(-6).toUpperCase()}`;

    let userId: string;
    let generatedPassword = password;

    // Try to create auth user, or reuse existing one
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError) {
      if (authError.message?.includes("already been registered")) {
        // Find the existing user by email
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        const existingUser = existingUsers.users.find((u: any) => u.email === email);
        if (!existingUser) throw new Error("User exists but could not be found");

        // Check if already an employee
        const { data: existingEmp } = await supabase
          .from("employees")
          .select("id")
          .eq("user_id", existingUser.id)
          .maybeSingle();
        if (existingEmp) throw new Error("This user is already registered as an employee");

        userId = existingUser.id;
        // Reset their password so admin gets fresh credentials
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { password });
        if (updateError) throw updateError;
      } else {
        throw authError;
      }
    } else {
      userId = authData.user.id;
    }

    // Insert profile, role, employee record
    const [profileRes, roleRes, empRes] = await Promise.all([
      supabase.from("profiles").upsert({ user_id: userId, full_name }, { onConflict: "user_id" }),
      supabase.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" }),
      supabase.from("employees").insert({
        user_id: userId,
        emp_id,
        full_name,
        designation,
        department_id: department_id || null,
        email,
        phone: phone || null,
        created_by: callerId,
      }),
    ]);

    // Check for errors
    if (profileRes.error) console.error("Profile insert error:", profileRes.error);
    if (roleRes.error) console.error("Role insert error:", roleRes.error);
    if (empRes.error) console.error("Employee insert error:", empRes.error);

    // Send welcome email with credentials via Gmail SMTP
    const smtpEmail = Deno.env.get("SMTP_EMAIL");
    const smtpPassword = Deno.env.get("SMTP_APP_PASSWORD");
    let emailSent = false;
    if (smtpEmail && smtpPassword) {
      try {
        const client = new SMTPClient({
          connection: {
            hostname: "smtp.gmail.com",
            port: 465,
            tls: true,
            auth: { username: smtpEmail, password: smtpPassword },
          },
        });

        await client.send({
          from: smtpEmail,
          to: email,
          subject: `Welcome to CareQueue — Your Login Credentials`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #ffffff;">
              <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 8px;">Welcome to CareQueue, ${full_name}!</h1>
              <p style="color: #64748b; font-size: 15px; line-height: 1.6;">
                Your account has been created as <strong>${role.charAt(0).toUpperCase() + role.slice(1)}</strong> — ${designation}.
              </p>
              <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 12px 0; color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your Login Credentials</p>
                <p style="margin: 0 0 8px 0; color: #0f172a; font-size: 15px;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 0; color: #0f172a; font-size: 15px;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 14px;">${password}</code></p>
              </div>
              <p style="color: #ef4444; font-size: 14px; font-weight: 600;">⚠️ You will be required to change your password on first login.</p>
              <p style="color: #64748b; font-size: 14px; margin-top: 24px;">If you did not expect this email, please contact your administrator.</p>
            </div>
          `,
        });

        await client.close();
        emailSent = true;
      } catch (emailErr: any) {
        console.error("SMTP email send failed:", emailErr.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        employee: { full_name, emp_id, email, role, designation },
        credentials: { email, password },
        emailSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
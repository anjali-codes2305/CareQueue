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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is receptionist or admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !callerUser) throw new Error("Unauthorized");
    const callerId = callerUser.id;

    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const roles = callerRoles?.map((r: any) => r.role) || [];
    if (!roles.includes("receptionist") && !roles.includes("admin")) {
      throw new Error("Only receptionists or admins can create patient accounts");
    }

    const body = await req.json();
    const { patient_id, patient_name, phone, purpose, appointment_date, doctor_id, doctor_name, department_id } = body;

    if (!patient_name || !phone || !purpose || !appointment_date || !doctor_id) {
      throw new Error("Missing required fields");
    }

    // department_id is required for tokens table - fetch from doctor's employee record if not provided
    let resolvedDeptId = department_id;
    if (!resolvedDeptId) {
      const { data: docEmployee } = await supabase
        .from("employees")
        .select("department_id")
        .eq("user_id", doctor_id)
        .maybeSingle();
      resolvedDeptId = docEmployee?.department_id;
    }
    if (!resolvedDeptId) {
      // Fallback: get first department
      const { data: depts } = await supabase.from("departments").select("id").limit(1);
      if (depts && depts.length > 0) resolvedDeptId = depts[0].id;
    }
    if (!resolvedDeptId) {
      throw new Error("No department found. Please add at least one department first.");
    }

    // Generate temp credentials
    const tempUsername = `P${Date.now().toString(36).toUpperCase()}`;
    const tempEmail = `${tempUsername.toLowerCase()}@patient.carequeue.local`;
    const tempPassword = `CQ${Math.random().toString(36).slice(-8).toUpperCase()}`;

    let patientUserId = patient_id;

    if (patientUserId) {
      // Update existing user credentials
      const { error: updateError } = await supabase.auth.admin.updateUserById(patientUserId, {
        email: tempEmail,
        password: tempPassword,
        email_confirm: true,
      });
      if (updateError) throw updateError;
    } else {
      // Create auth user for patient
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: tempEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: patient_name },
      });
      if (authError) throw authError;

      patientUserId = authData.user.id;

      // Create profile and role
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").insert({ user_id: patientUserId, full_name: patient_name }),
        supabase.from("user_roles").insert({ user_id: patientUserId, role: "patient" }),
      ]);
      if (profileRes.error) console.error("Profile error:", profileRes.error);
      if (roleRes.error) console.error("Role error:", roleRes.error);
    }

    // Create token with resolved department_id (NOT NULL)
    const { data: tokenData, error: tokenError } = await supabase
      .from("tokens")
      .insert({
        patient_id: patientUserId,
        department_id: resolvedDeptId,
        doctor_id,
        queue_type: "normal",
        status: "waiting",
      })
      .select()
      .single();
    if (tokenError) throw tokenError;

    // Get queue position
    const { data: waitingTokens } = await supabase
      .from("tokens")
      .select("id")
      .eq("doctor_id", doctor_id)
      .eq("status", "waiting")
      .order("arrival_time", { ascending: true });

    const queuePosition = waitingTokens?.findIndex((t: any) => t.id === tokenData.id) ?? 0;
    const estimatedWait = (queuePosition) * 12; // 12 min avg

    // Insert patient record
    const { data: record, error: recordError } = await supabase
      .from("patient_records")
      .insert({
        patient_name,
        phone,
        purpose,
        appointment_date,
        doctor_id,
        doctor_name: doctor_name || null,
        department_id: resolvedDeptId,
        token_id: tokenData.id,
        token_number: tokenData.token_number,
        queue_position: queuePosition + 1,
        estimated_wait_minutes: estimatedWait,
        temp_username: tempUsername,
        temp_password: tempPassword,
        created_by: callerId,
      })
      .select()
      .single();
    if (recordError) throw recordError;

    // Create notification for patient
    await supabase.from("notifications").insert({
      user_id: patientUserId,
      type: "token_created",
      title: "Welcome to CareQueue",
      message: `Your token #${tokenData.token_number} has been created. Doctor: ${doctor_name || "Assigned"}. Est. wait: ${estimatedWait} min.`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        patient: {
          name: patient_name,
          phone,
          purpose,
          doctor_name,
          token_number: tokenData.token_number,
          queue_position: queuePosition + 1,
          estimated_wait_minutes: estimatedWait,
          temp_username: tempUsername,
          temp_password: tempPassword,
        },
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
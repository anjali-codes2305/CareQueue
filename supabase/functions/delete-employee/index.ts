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

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !callerUser) throw new Error("Unauthorized");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Only admins can delete employees");

    const { employee_id } = await req.json();
    if (!employee_id) throw new Error("Missing employee_id");

    // Get the employee record to find user_id
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("user_id, full_name")
      .eq("id", employee_id)
      .single();
    if (empError || !employee) throw new Error("Employee not found");

    const employeeUserId = employee.user_id;

    // Delete employee record, user_role, profile, then auth user
    const { error: delEmpError } = await supabase
      .from("employees")
      .delete()
      .eq("id", employee_id);
    if (delEmpError) console.error("Delete employee error:", delEmpError);

    const { error: delRoleError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", employeeUserId);
    if (delRoleError) console.error("Delete role error:", delRoleError);

    const { error: delProfileError } = await supabase
      .from("profiles")
      .delete()
      .eq("user_id", employeeUserId);
    if (delProfileError) console.error("Delete profile error:", delProfileError);

    // Delete auth user
    const { error: delAuthError } = await supabase.auth.admin.deleteUser(employeeUserId);
    if (delAuthError) console.error("Delete auth user error:", delAuthError);

    return new Response(
      JSON.stringify({ success: true, message: `Employee ${employee.full_name} removed successfully` }),
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

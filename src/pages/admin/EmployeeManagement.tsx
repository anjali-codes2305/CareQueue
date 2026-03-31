import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { PageTransition, StaggerItem } from "@/components/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/EmptyState";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Users, Copy, CheckCircle, Stethoscope, Shield, ClipboardList, KeyRound, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type EmployeeRole = "doctor" | "nurse" | "receptionist";

const roleOptions: { value: EmployeeRole; label: string; icon: typeof Stethoscope }[] = [
  { value: "doctor", label: "Doctor", icon: Stethoscope },
  { value: "nurse", label: "Nurse", icon: Shield },
  { value: "receptionist", label: "Receptionist", icon: ClipboardList },
];

export default function EmployeeManagement() {
  const { session } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [credentialsDialog, setCredentialsDialog] = useState<{ email: string; password: string; name: string } | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [empId, setEmpId] = useState("");
  const [designation, setDesignation] = useState("");
  const [role, setRole] = useState<EmployeeRole>("doctor");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      return data || [];
    },
  });

  const { data: employees, refetch: refetchEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("*, departments(name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: resetTickets, refetch: refetchTickets } = useQuery({
    queryKey: ["reset-tickets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("password_reset_tickets")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  const handleRefresh = useCallback(() => { refetchEmployees(); }, [refetchEmployees]);
  useRealtimeSubscription("tokens", handleRefresh);

  const resetForm = () => {
    setFullName(""); setEmpId(""); setDesignation(""); setRole("doctor");
    setEmail(""); setPhone(""); setDepartmentId("");
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsDept && !departmentId) {
      toast.error("Please select a department for this role");
      return;
    }
    if (!session?.access_token) return;
    setLoading(true);
    try {
      let result;
      try {
        const res = await supabase.functions.invoke("create-employee", {
          body: {
            full_name: fullName,
            emp_id: empId,
            designation,
            role,
            email,
            phone: phone || undefined,
            department_id: departmentId || undefined,
          },
        });

        if (res.error) throw new Error(res.error.message || "Failed to create employee");
        result = res.data;
        if (!result.success) throw new Error(result.error);
      } catch (invokeError: any) {
        console.warn("Edge function failed, using client-side fallback:", invokeError);
        
        const password = `CQ-${empId}-${Math.random().toString(36).slice(-6).toUpperCase()}`;
        
        const { createClient } = await import("@supabase/supabase-js");
        const tempClient = createClient(
          import.meta.env.VITE_SUPABASE_URL, 
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 
          { auth: { persistSession: false, autoRefreshToken: false } }
        );

        const { data: authData, error: authErr } = await tempClient.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        
        if (authErr && !authData?.user) throw new Error("Fallback failed: " + authErr.message);
        const userId = authData.user?.id || (authData as any)?.id;
        if (!userId) throw new Error("Could not create user account");

        // Use the main authenticated admin client to insert the secure roles
        const { error: roleErr } = await supabase.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
        if (roleErr) throw roleErr;

        const { error: empErr } = await supabase.from("employees").insert({
          user_id: userId,
          emp_id: empId,
          full_name: fullName,
          designation,
          department_id: departmentId || null,
          email,
          phone: phone || null,
          created_by: session.user.id,
          is_available: true,
        });
        if (empErr) throw empErr;

        result = {
          success: true,
          employee: { full_name: fullName, emp_id: empId, email, role, designation },
          credentials: { email, password },
          emailSent: false
        };
      }

      setCredentialsDialog({
        email: result.credentials.email,
        password: result.credentials.password,
        name: result.employee.full_name,
      });

      if (result.emailSent) {
        toast.success(`${fullName} added as ${role} — credentials emailed`);
      } else {
        toast.success(`${fullName} added as ${role} — share credentials manually`);
      }
      resetForm();
      setShowForm(false);
      refetchEmployees();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    const { error } = await supabase
      .from("password_reset_tickets")
      .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: session?.user?.id || null })
      .eq("id", ticketId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Ticket resolved");
      refetchTickets();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleDeleteEmployee = async (employeeId: string, name: string) => {
    try {
      const res = await supabase.functions.invoke("delete-employee", {
        body: { employee_id: employeeId },
      });
      if (res.error) throw new Error(res.error.message || "Failed to delete employee");
      const result = res.data;
      if (!result.success) throw new Error(result.error);
      toast.success(`${name} has been removed`);
      refetchEmployees();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const needsDept = role === "doctor" || role === "nurse";

  return (
    <PageTransition className="space-y-6">
      <StaggerItem>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Employee Management</h1>
            <p className="text-muted-foreground text-sm mt-1">Add and manage hospital staff</p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={() => setShowForm(!showForm)} className="gradient-primary text-primary-foreground border-0 font-semibold gap-2 rounded-xl">
              <UserPlus className="w-4 h-4" />
              Add Employee
            </Button>
          </motion.div>
        </div>
      </StaggerItem>

      {/* Add Employee Form */}
      {showForm && (
        <StaggerItem>
              <Card className="shadow-elevated border-primary/20 overflow-hidden">
                <div className="h-1.5 gradient-primary" />
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-primary" />
                    New Employee
                  </CardTitle>
                  <CardDescription>Fill in the employee details. Credentials will be auto-generated.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Full Name *</Label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Dr. John Smith" className="h-10 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Employee ID *</Label>
                      <Input value={empId} onChange={(e) => setEmpId(e.target.value)} required placeholder="EMP-001" className="h-10 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Role *</Label>
                      <Select value={role} onValueChange={(v) => setRole(v as EmployeeRole)}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((r) => {
                            const Icon = r.icon;
                            return (
                              <SelectItem key={r.value} value={r.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  {r.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Designation *</Label>
                      <Input value={designation} onChange={(e) => setDesignation(e.target.value)} required placeholder="Senior Consultant" className="h-10 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email *</Label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="john@hospital.com" className="h-10 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" className="h-10 rounded-xl" />
                    </div>
                    {needsDept && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Department *</Label>
                        <Select value={departmentId} onValueChange={setDepartmentId}>
                          <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select department" /></SelectTrigger>
                          <SelectContent>
                            {departments?.map((d) => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="md:col-span-2 flex gap-3 pt-2">
                      <Button type="submit" disabled={loading} className="gradient-primary text-primary-foreground border-0 font-semibold rounded-xl">
                        {loading ? "Creating..." : "Create Employee"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }} className="rounded-xl">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
        </StaggerItem>
      )}

      {/* Password Reset Tickets */}
      {resetTickets && resetTickets.length > 0 && (
        <StaggerItem>
          <Card className="shadow-card border-warning/20 overflow-hidden">
            <div className="h-1 bg-warning/50" />
            <CardHeader className="pb-3">
              <CardTitle className="font-display flex items-center gap-2 text-lg">
                <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-warning" />
                </div>
                Password Reset Requests
                <Badge variant="secondary" className="ml-2">{resetTickets.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {resetTickets.map((ticket: any) => (
                <div key={ticket.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/30">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{ticket.username}</p>
                    <p className="text-xs text-muted-foreground">{ticket.email} · {new Date(ticket.created_at).toLocaleString()}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleResolveTicket(ticket.id)} className="rounded-lg text-xs">
                    Mark Resolved
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </StaggerItem>
      )}

      {/* Employee List */}
      <StaggerItem>
        <Card className="shadow-card overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              All Employees
              <Badge variant="secondary" className="ml-2">{employees?.length || 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!employees || employees.length === 0 ? (
              <EmptyState icon={Users} title="No employees" description="Add your first employee above" />
            ) : (
              <div className="space-y-2">
                {employees.map((emp: any, idx: number) => (
                  <motion.div
                    key={emp.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{emp.full_name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {emp.emp_id} · {emp.designation}
                          {emp.departments?.name && ` · ${emp.departments.name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={emp.is_available ? "default" : "secondary"} className="text-xs">
                        {emp.is_available ? "Available" : "Unavailable"}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="rounded-lg text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {emp.full_name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this employee's account, role, and profile. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteEmployee(emp.id, emp.full_name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                            >
                              Remove Employee
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </StaggerItem>

      {/* Credentials Dialog */}
      <Dialog open={!!credentialsDialog} onOpenChange={() => setCredentialsDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              Employee Created!
            </DialogTitle>
            <DialogDescription>
              Share these credentials with {credentialsDialog?.name}. They can use these to log in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
                <p className="font-mono font-semibold text-foreground text-sm">{credentialsDialog?.email}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => copyToClipboard(credentialsDialog?.email || "")} className="rounded-lg">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Password</p>
                <p className="font-mono font-semibold text-foreground text-sm">{credentialsDialog?.password}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => copyToClipboard(credentialsDialog?.password || "")} className="rounded-lg">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">⚠️ This password will not be shown again. Please save or share it now.</p>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}

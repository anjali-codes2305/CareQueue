import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import { PageTransition, StaggerItem } from "@/components/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, Users, ClipboardList, Download, Stethoscope,
  CheckCircle, Copy, Phone, Calendar, FileText, Activity, Filter, Mail
} from "lucide-react";
import * as XLSX from "xlsx";

interface PatientForm {
  patient_id?: string;
  patient_name: string;
  phone: string;
  email?: string;
  purpose: string;
  appointment_date: string;
  department_id: string;
  doctor_id?: string;
  doctor_name?: string;
}

export default function ReceptionistDashboard() {
  const { session } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<PatientForm | null>(null);
  const [credentialsDialog, setCredentialsDialog] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [downloadFrom, setDownloadFrom] = useState("");
  const [downloadTo, setDownloadTo] = useState("");
  const [patientType, setPatientType] = useState<"new" | "old">("new");

  // Form state
  const [form, setForm] = useState<PatientForm>({
    patient_id: "",
    patient_name: "",
    phone: "",
    email: "",
    purpose: "",
    appointment_date: new Date().toISOString().split("T")[0],
    department_id: "",
    doctor_id: "",
  });

  const updateForm = (key: keyof PatientForm, value: string) => setForm({ ...form, [key]: value });

  // Fetch available patients from historical records
  const { data: availablePatients } = useQuery({
    queryKey: ["available-patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_records")
        .select(`
          patient_name,
          phone,
          tokens (
            patient_id
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching old patients:", error);
        return [];
      }

      const uniquePatients = new Map();
      data?.forEach((record: any) => {
        const patientId = record.tokens?.patient_id;
        if (patientId && !uniquePatients.has(patientId)) {
          uniquePatients.set(patientId, {
            user_id: patientId,
            full_name: record.patient_name,
            phone: record.phone
          });
        }
      });

      return Array.from(uniquePatients.values());
    },
  });

  // Fetch available doctors (robust fallback logic)
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      return data || [];
    },
  });

  const { data: doctorsInDept } = useQuery({
    queryKey: ["doctors", form.department_id],
    queryFn: async () => {
      if (!form.department_id) return [];
      
      const { data: emps, error } = await supabase.from("employees")
        .select("user_id, full_name, designation")
        .eq("department_id", form.department_id)
        .eq("is_available", true);
        
      if (error) {
        console.error("Error fetching doctors:", error);
        return [];
      }
      return emps || [];
    },
    enabled: !!form.department_id,
  });

  // Daily patient records
  const { data: dailyRecords, refetch: refetchRecords } = useQuery({
    queryKey: ["daily-records", dateFilter],
    queryFn: async () => {
      const { data } = await supabase
        .from("patient_records")
        .select("*")
        .gte("created_at", `${dateFilter}T00:00:00`)
        .lte("created_at", `${dateFilter}T23:59:59`)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Stats
  const { data: todayStats } = useQuery({
    queryKey: ["receptionist-stats", dateFilter],
    queryFn: async () => {
      const { count: totalToday } = await supabase
        .from("patient_records")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${dateFilter}T00:00:00`)
        .lte("created_at", `${dateFilter}T23:59:59`);

      const { count: waitingNow } = await supabase
        .from("tokens")
        .select("*", { count: "exact", head: true })
        .eq("status", "waiting");

      return { totalToday: totalToday || 0, waitingNow: waitingNow || 0 };
    },
  });

  const handleRefresh = useCallback(() => { refetchRecords(); }, [refetchRecords]);
  useRealtimeSubscription("tokens", handleRefresh);

  // Doctor patient counts for filter chips
  const doctorPatientCounts = useMemo(() => {
    if (!dailyRecords) return {};
    const counts: Record<string, { name: string; count: number }> = {};
    dailyRecords.forEach((r: any) => {
      const key = r.doctor_id;
      if (!counts[key]) counts[key] = { name: r.doctor_name || "Unknown", count: 0 };
      counts[key].count++;
    });
    return counts;
  }, [dailyRecords]);

  const filteredRecords = useMemo(() => {
    if (!dailyRecords) return [];
    if (doctorFilter === "all") return dailyRecords;
    return dailyRecords.filter((r: any) => r.doctor_id === doctorFilter);
  }, [dailyRecords, doctorFilter]);

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (patientType === "old" && !form.patient_id) {
      toast.error("Please select a returning patient");
      return;
    }
    if (!form.patient_name || !form.phone || !form.purpose || !form.appointment_date || !form.department_id || !form.doctor_id) {
      toast.error("Please fill in all required fields");
      return;
    }
    const selectedDoc = doctorsInDept?.find((d: any) => d.user_id === form.doctor_id);
    setConfirmDialog({ ...form, doctor_name: selectedDoc?.full_name });
  };

  const handleConfirmPatient = async () => {
    if (!confirmDialog || !session?.access_token) return;
    setLoading(true);
    try {
      const selectedDept = departments?.find((d: any) => d.id === confirmDialog.department_id);
      
      let result;
      let patientUserId = confirmDialog.patient_id;
      let tempUsername, tempPassword;

      try {
        const res = await supabase.functions.invoke("create-patient-account", {
          body: {
            ...confirmDialog,
            doctor_name: confirmDialog.doctor_name,
            department_id: confirmDialog.department_id,
            doctor_id: confirmDialog.doctor_id,
          },
        });

        if (res.error) throw new Error(res.error.message || "Failed to register patient");
        result = res.data;
        if (!result.success) throw new Error(result.error);
      } catch (invokeError: any) {
        console.warn("Edge function failed, using client-side fallback:", invokeError);
        
        if (patientUserId) {
          throw new Error("Edge Function must be deployed/running to generate new credentials for returning patients.");
        }

        // Fallback for NEW users when Edge Function is not deployed or fails
        const { createClient } = await import("@supabase/supabase-js");
        const tempClient = createClient(
          import.meta.env.VITE_SUPABASE_URL, 
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 
          { auth: { persistSession: false, autoRefreshToken: false } }
        );

        tempUsername = `P${Date.now().toString(36).toUpperCase()}`;
        const tempEmail = `${tempUsername.toLowerCase()}@patient.carequeue.local`;
        tempPassword = `CQ${Math.random().toString(36).slice(-8).toUpperCase()}`;

        const { data: authData, error: authErr } = await tempClient.auth.signUp({
          email: tempEmail,
          password: tempPassword,
          options: { data: { full_name: confirmDialog.patient_name } }
        });
        
        if (authErr && !authData?.user) throw new Error("Fallback failed: " + authErr.message);
        patientUserId = authData.user?.id || (authData as any)?.id;
        
        if (!patientUserId) {
          throw new Error("Could not create patient user");
        }

        // Add role
        await tempClient.from("user_roles").insert({ user_id: patientUserId, role: "patient" });
      }

      // If we don't have a result yet, we need to insert the tokens and records ourselves 
      // (because we used the client-side fallback)
      if (!result && patientUserId) {
        const resolvedDeptId = confirmDialog.department_id || (await supabase.from("departments").select("id").limit(1)).data?.[0]?.id;
        if (!resolvedDeptId) throw new Error("No departments found in the system. Registration blocked.");

        const { data: tokenData, error: tokenError } = await supabase
          .from("tokens")
          .insert({
            patient_id: patientUserId,
            department_id: resolvedDeptId,
            doctor_id: confirmDialog.doctor_id,
            queue_type: "normal",
            status: "waiting",
          })
          .select()
          .single();
          
        if (tokenError) throw tokenError;

        const { data: waitingTokens } = await supabase
          .from("tokens")
          .select("id")
          .eq("doctor_id", confirmDialog.doctor_id)
          .eq("status", "waiting")
          .order("arrival_time", { ascending: true });

        const queuePosition = waitingTokens?.findIndex((t: any) => t.id === tokenData.id) ?? 0;
        const estimatedWait = queuePosition * 12;

        const { error: recordError } = await supabase
          .from("patient_records")
          .insert({
            patient_name: confirmDialog.patient_name,
            phone: confirmDialog.phone,
            purpose: confirmDialog.purpose,
            appointment_date: confirmDialog.appointment_date,
            doctor_id: confirmDialog.doctor_id,
            doctor_name: confirmDialog.doctor_name,
            department_id: resolvedDeptId,
            token_id: tokenData.id,
            token_number: tokenData.token_number,
            queue_position: queuePosition + 1,
            estimated_wait_minutes: estimatedWait,
            temp_username: tempUsername,
            temp_password: tempPassword,
            created_by: session.user.id,
          });

        if (recordError) throw recordError;

        await supabase.from("notifications").insert({
          user_id: patientUserId,
          type: "token_created",
          title: "Welcome to CareQueue",
          message: `Your token #${tokenData.token_number} has been created. Est. wait: ${estimatedWait} min.`,
        });

        result = {
          success: true,
          patient: {
            name: confirmDialog.patient_name,
            phone: confirmDialog.phone,
            email: confirmDialog.email,
            purpose: confirmDialog.purpose,
            doctor_name: confirmDialog.doctor_name,
            token_number: tokenData.token_number,
            queue_position: queuePosition + 1,
            estimated_wait_minutes: estimatedWait,
            temp_password: tempPassword,
          }
        };
      }

      // Automatically send the email receipt if an email was provided
      if (result.patient.email) {
        try {
          fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ receipt: result.patient })
          })
          .then(res => res.json())
          .then((data) => {
            if (data.error) {
              console.error("Failed to send email receipt:", data.error);
              toast.error("Patient registered, but failed to send email: " + data.error);
            } else if (data.isTest && data.url) {
              toast.success("Test email sent! Opening preview in a new tab...");
              console.log("TEST EMAIL PREVIEW URL:", data.url);
              window.open(data.url, "_blank");
            } else {
              toast.success(`Receipt automatically sent to ${result.patient.email}`);
            }
          })
          .catch(err => {
            console.error("Fetch email error:", err);
          });
        } catch (e) {
          console.error("Error invoking /api/send-email", e);
        }
      }

      setCredentialsDialog(result.patient);
      setConfirmDialog(null);
      setPatientType("new");
      setForm({ patient_id: "", patient_name: "", phone: "", email: "", purpose: "", appointment_date: new Date().toISOString().split("T")[0], department_id: "", doctor_id: "" });
      setShowForm(false);
      refetchRecords();
      toast.success("Patient registered successfully!");
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      let query = supabase
        .from("patient_records")
        .select("*")
        .order("created_at", { ascending: false });

      if (downloadFrom) query = query.gte("created_at", `${downloadFrom}T00:00:00`);
      if (downloadTo) query = query.lte("created_at", `${downloadTo}T23:59:59`);
      if (!downloadFrom && !downloadTo) {
        query = query.gte("created_at", `${dateFilter}T00:00:00`).lte("created_at", `${dateFilter}T23:59:59`);
      }

      const { data } = await query;
      if (!data || data.length === 0) {
        toast.error("No records to download");
        return;
      }

      const exportData = data.map((r: any) => ({
        "Patient Name": r.patient_name,
        "Phone": r.phone,
        "Purpose": r.purpose,
        "Appointment Date": r.appointment_date,
        "Doctor": r.doctor_name || "N/A",
        "Token #": r.token_number,
        "Queue Position": r.queue_position,
        "Est. Wait (min)": r.estimated_wait_minutes,
        "Severity": r.severity_score || 0,
        "Status": r.status,
        "Registered At": new Date(r.created_at).toLocaleString(),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Patient Records");
      XLSX.writeFile(wb, `CareQueue_Records_${downloadFrom || dateFilter}_${downloadTo || dateFilter}.xlsx`);
      toast.success("Excel downloaded!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const selectedDepartment = departments?.find((d: any) => d.id === confirmDialog?.department_id);

  return (
    <PageTransition className="space-y-6">
      <StaggerItem>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Reception Desk</h1>
            <p className="text-muted-foreground text-sm mt-1">Register patients and manage daily records</p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={() => setShowForm(!showForm)} className="gradient-primary text-primary-foreground border-0 font-semibold gap-2 rounded-xl">
              <UserPlus className="w-4 h-4" />
              Register Patient
            </Button>
          </motion.div>
        </div>
      </StaggerItem>

      {/* Stats */}
      <StaggerItem>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Today's Patients" value={todayStats?.totalToday || 0} icon={<Users className="w-5 h-5" />} variant="primary" />
          <StatCard title="Currently Waiting" value={todayStats?.waitingNow || 0} icon={<Activity className="w-5 h-5" />} variant="warning" />
          <StatCard title="Departments" value={departments?.length || 0} icon={<Activity className="w-5 h-5" />} variant="success" />
        </div>
      </StaggerItem>

      {/* Patient Registration Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="shadow-elevated border-primary/20 overflow-hidden">
              <div className="h-1.5 gradient-primary" />
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Patient Registration
                </CardTitle>
                <CardDescription>Fill all details to onboard a new patient</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitForm} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Patient Type *</Label>
                    <Select value={patientType} onValueChange={(v) => {
                      setPatientType(v as "new" | "old");
                      setForm({ ...form, patient_id: "", patient_name: "", phone: "", email: "" });
                    }}>
                      <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New Patient</SelectItem>
                        <SelectItem value="old">Old (Returning) Patient</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {patientType === "old" && (
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Select Returning Patient *</Label>
                      <Select value={form.patient_id} onValueChange={(v) => {
                        const p = availablePatients?.find((pat: any) => pat.user_id === v);
                        if (p) {
                          setForm({ 
                            ...form, 
                            patient_id: v, 
                            patient_name: p.full_name, 
                            phone: p.phone || "", 
                            email: "" 
                          });
                        }
                      }}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Search or select patient" /></SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {availablePatients?.map((pat: any) => (
                            <SelectItem key={pat.user_id} value={pat.user_id}>
                              {pat.full_name} {pat.phone ? `- ${pat.phone}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {patientType === "new" ? (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Patient Name *</Label>
                      <Input value={form.patient_name} onChange={(e) => updateForm("patient_name", e.target.value)} required placeholder="Full name" className="h-10 rounded-xl" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Patient Name</Label>
                      <Input value={form.patient_name} disabled placeholder={form.patient_id ? "Loaded from database" : "Select patient above"} className="h-10 rounded-xl bg-secondary/50" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone Number *</Label>
                    <Input value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} required placeholder="+91 9876543210" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email Address</Label>
                    <Input type="email" value={form.email || ""} onChange={(e) => updateForm("email", e.target.value)} placeholder="patient@example.com" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Purpose of Visit *</Label>
                    <Input value={form.purpose} onChange={(e) => updateForm("purpose", e.target.value)} required placeholder="e.g. General checkup, Follow-up, Consultation..." className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Date of Appointment *</Label>
                    <Input type="date" value={form.appointment_date} onChange={(e) => updateForm("appointment_date", e.target.value)} required className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Department *</Label>
                    <Select value={form.department_id} onValueChange={(v) => updateForm("department_id", v)}>
                      <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {departments?.map((dept: any) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            <div className="flex items-center gap-2">
                              <span>{dept.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Doctor *</Label>
                    <Select value={form.doctor_id} onValueChange={(v) => updateForm("doctor_id", v)} disabled={!form.department_id}>
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue placeholder={form.department_id ? "Select doctor" : "Select department first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {doctorsInDept?.map((doc: any) => (
                          <SelectItem key={doc.user_id} value={doc.user_id}>
                            <div className="flex items-center gap-2">
                              <span>{doc.full_name}</span>
                              <span className="text-muted-foreground text-xs">({doc.designation})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 flex gap-3 pt-2">
                    <Button type="submit" className="gradient-primary text-primary-foreground border-0 font-semibold rounded-xl">
                      Review & Submit
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Doctor Filter Chips */}
      {Object.keys(doctorPatientCounts).length > 0 && (
        <StaggerItem>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <button
              onClick={() => setDoctorFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                doctorFilter === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-foreground border-border hover:bg-secondary/80"
              }`}
            >
              All ({dailyRecords?.length || 0})
            </button>
            {Object.entries(doctorPatientCounts).map(([id, info]) => (
              <button
                key={id}
                onClick={() => setDoctorFilter(id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  doctorFilter === id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-foreground border-border hover:bg-secondary/80"
                }`}
              >
                {info.name} ({info.count})
              </button>
            ))}
          </div>
        </StaggerItem>
      )}

      {/* Daily Records */}
      <StaggerItem>
        <Card className="shadow-card overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="font-display flex items-center gap-2 text-lg">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-primary" />
                </div>
                Daily Records
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-9 w-auto rounded-lg text-xs" />
                <div className="flex items-center gap-1">
                  <Input type="date" value={downloadFrom} onChange={(e) => setDownloadFrom(e.target.value)} placeholder="From" className="h-9 w-32 rounded-lg text-xs" />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input type="date" value={downloadTo} onChange={(e) => setDownloadTo(e.target.value)} placeholder="To" className="h-9 w-32 rounded-lg text-xs" />
                </div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button size="sm" variant="outline" onClick={handleDownloadExcel} className="gap-1.5 rounded-lg text-xs">
                    <Download className="w-3.5 h-3.5" /> Excel
                  </Button>
                </motion.div>
              </div>
            </div>
            <CardDescription>{filteredRecords.length} records for {dateFilter}</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredRecords.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No records" description="No patients registered for this date" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["#", "Patient", "Phone", "Purpose", "Doctor", "Token", "Queue", "Wait", "Status", "Time"].map((h) => (
                        <th key={h} className="text-left py-2.5 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r: any, idx: number) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-muted-foreground">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-medium text-foreground">{r.patient_name}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{r.phone}</td>
                        <td className="py-2.5 px-3 text-muted-foreground max-w-[150px] truncate">{r.purpose}</td>
                        <td className="py-2.5 px-3 text-foreground">{r.doctor_name || "N/A"}</td>
                        <td className="py-2.5 px-3"><Badge variant="secondary">#{r.token_number}</Badge></td>
                        <td className="py-2.5 px-3">{r.queue_position}</td>
                        <td className="py-2.5 px-3">{r.estimated_wait_minutes} min</td>
                        <td className="py-2.5 px-3">
                          <Badge variant={r.status === "registered" ? "default" : "secondary"} className="text-[10px]">{r.status}</Badge>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleTimeString()}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </StaggerItem>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Confirm Patient Registration</DialogTitle>
            <DialogDescription>Please verify all details before confirming.</DialogDescription>
          </DialogHeader>
          {confirmDialog && (
            <div className="space-y-3 p-4 rounded-xl bg-secondary/50 border border-border">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Patient Name</p>
                  <p className="font-semibold text-foreground">{confirmDialog.patient_name}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Phone</p>
                  <p className="font-semibold text-foreground">{confirmDialog.phone}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Purpose</p>
                  <p className="font-semibold text-foreground">{confirmDialog.purpose}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Date</p>
                  <p className="font-semibold text-foreground">{confirmDialog.appointment_date}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Department</p>
                  <p className="font-semibold text-foreground">{selectedDepartment?.name || "Assigned"}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleConfirmPatient} disabled={loading} className="gradient-primary text-primary-foreground border-0 font-semibold rounded-xl">
              {loading ? "Registering..." : "Confirm & Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={!!credentialsDialog} onOpenChange={() => setCredentialsDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5 text-success" />
              Patient Registered Successfully!
            </DialogTitle>
            <DialogDescription>
              Share these details with the patient via WhatsApp/SMS.
            </DialogDescription>
          </DialogHeader>
          {credentialsDialog && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Patient</p>
                    <p className="font-semibold text-foreground">{credentialsDialog.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Token #</p>
                    <p className="font-bold text-primary text-lg">#{credentialsDialog.token_number}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Doctor</p>
                    <p className="font-semibold text-foreground">{credentialsDialog.doctor_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Queue Position</p>
                    <p className="font-semibold text-foreground">{credentialsDialog.queue_position}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Est. Wait</p>
                    <p className="font-semibold text-foreground">{credentialsDialog.estimated_wait_minutes} min</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Purpose</p>
                    <p className="font-semibold text-foreground">{credentialsDialog.purpose}</p>
                  </div>
                </div>
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Username</p>
                      <p className="font-mono font-bold text-foreground">{credentialsDialog.temp_username}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(credentialsDialog.temp_username)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Password</p>
                      <p className="font-mono font-bold text-foreground">{credentialsDialog.temp_password}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(credentialsDialog.temp_password)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full rounded-xl gap-2 hover:text-green-600 hover:border-green-600"
                onClick={() => {
                  const msg = `🏥 CareQueue - Patient Registration\n\nDear ${credentialsDialog.name},\n\nYour appointment details:\n• Doctor: ${credentialsDialog.doctor_name}\n• Purpose: ${credentialsDialog.purpose}\n• Token: #${credentialsDialog.token_number}\n• Queue Position: ${credentialsDialog.queue_position}\n• Est. Wait: ${credentialsDialog.estimated_wait_minutes} min\n\nLogin Credentials:\n• Username: ${credentialsDialog.temp_username}\n• Password: ${credentialsDialog.temp_password}\n\nLogin URL: ${window.location.origin}/auth\n\nPlease keep these credentials safe.`;
                  const url = `https://wa.me/${credentialsDialog.phone?.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
                  window.open(url, "_blank");
                }}
              >
                <Phone className="w-4 h-4" /> Send via WhatsApp
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}

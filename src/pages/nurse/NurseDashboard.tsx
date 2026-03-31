import { useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { approvePriority, rejectPriority } from "@/services/queueService";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import { PageTransition, StaggerItem } from "@/components/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Clock, AlertTriangle, Users, CheckCircle, XCircle, Activity } from "lucide-react";

export default function NurseDashboard() {
  const { user } = useAuth();
  const [nurseNotes, setNurseNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const { data: pendingRequests, refetch: refetchRequests } = useQuery({
    queryKey: ["pending-priority-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("priority_requests")
        .select("*, tokens(token_number, department_id, departments(name))")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      
      // Fetch patient names separately (no FK from priority_requests to profiles)
      if (data && data.length > 0) {
        const patientIds = [...new Set(data.map((r: any) => r.patient_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", patientIds);
        const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p.full_name]) || []);
        return data.map((r: any) => ({
          ...r,
          patient_name: profileMap.get(r.patient_id) || "Unknown Patient",
        }));
      }
      return data || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["nurse-stats"],
    queryFn: async () => {
      const [pending, approved, rejected, totalWaiting] = await Promise.all([
        supabase.from("priority_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("priority_requests").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("priority_requests").select("*", { count: "exact", head: true }).eq("status", "rejected"),
        supabase.from("tokens").select("*", { count: "exact", head: true }).eq("status", "waiting"),
      ]);
      return {
        pending: pending.count || 0,
        approved: approved.count || 0,
        rejected: rejected.count || 0,
        totalWaiting: totalWaiting.count || 0,
      };
    },
  });

  const handleRefresh = useCallback(() => refetchRequests(), [refetchRequests]);
  useRealtimeSubscription("priority_requests", handleRefresh);

  const handleApprove = async (requestId: string) => {
    if (!user) return;
    setProcessing(requestId);
    try {
      await approvePriority(requestId, user.id, nurseNotes[requestId] || "");
      toast.success("Priority request approved — patient moved to priority queue");
      refetchRequests();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!user) return;
    setProcessing(requestId);
    try {
      await rejectPriority(requestId, user.id, nurseNotes[requestId] || "");
      toast.success("Priority request declined");
      refetchRequests();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const getSeverityColor = (score: number) => {
    if (score >= 70) return "text-emergency";
    if (score >= 40) return "text-warning";
    return "text-success";
  };

  const getSeverityBg = (score: number) => {
    if (score >= 70) return "bg-emergency/10 border-emergency/20";
    if (score >= 40) return "bg-warning/10 border-warning/20";
    return "bg-success/10 border-success/20";
  };

  return (
    <PageTransition className="space-y-6">
      <StaggerItem>
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Nurse Triage Panel</h1>
          <p className="text-muted-foreground text-sm mt-1">Review and manage priority verification requests</p>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Pending" value={stats?.pending || 0} icon={<Clock className="w-5 h-5" />} variant="warning" />
          <StatCard title="Approved" value={stats?.approved || 0} icon={<CheckCircle className="w-5 h-5" />} variant="success" />
          <StatCard title="Rejected" value={stats?.rejected || 0} icon={<XCircle className="w-5 h-5" />} variant="emergency" />
          <StatCard title="In Queue" value={stats?.totalWaiting || 0} icon={<Users className="w-5 h-5" />} variant="primary" />
        </div>
      </StaggerItem>

      <StaggerItem>
        <Card className="shadow-card overflow-hidden">
          <div className="h-1 gradient-accent" />
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-accent" />
              </div>
              Priority Verification Queue
            </CardTitle>
            <CardDescription>Review patient priority requests. Approve only genuine urgent cases.</CardDescription>
          </CardHeader>
          <CardContent>
            {!pendingRequests || pendingRequests.length === 0 ? (
              <EmptyState icon={ShieldCheck} title="All clear!" description="No pending priority requests at the moment" />
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {pendingRequests.map((req: any) => (
                    <motion.div
                      key={req.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="border border-border rounded-xl p-5 space-y-4 bg-card hover:shadow-card transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground font-display">
                              Token #{req.tokens?.token_number}
                            </p>
                            <Badge variant="outline" className="text-xs font-medium">
                              {req.tokens?.departments?.name}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {req.patient_name || "Unknown Patient"}
                          </p>
                        </div>
                        <div className={`px-3 py-2 rounded-xl border text-center ${getSeverityBg(req.severity_score || 0)}`}>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Severity</p>
                          <p className={`text-2xl font-bold font-display ${getSeverityColor(req.severity_score || 0)}`}>
                            {req.severity_score || 0}
                          </p>
                        </div>
                      </div>

                      {req.reason && (
                        <div className="bg-secondary rounded-lg p-3.5">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Patient's Statement</p>
                          <p className="text-sm text-foreground leading-relaxed">{req.reason}</p>
                        </div>
                      )}

                      <Textarea
                        placeholder="Add nurse notes (optional)..."
                        value={nurseNotes[req.id] || ""}
                        onChange={(e) => setNurseNotes({ ...nurseNotes, [req.id]: e.target.value })}
                        className="text-sm min-h-[60px] resize-none"
                        maxLength={500}
                      />

                      <div className="flex gap-2">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={() => handleApprove(req.id)}
                            disabled={processing === req.id}
                            className="bg-success hover:bg-success/90 text-success-foreground font-semibold gap-1.5"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={() => handleReject(req.id)}
                            disabled={processing === req.id}
                            variant="destructive"
                            className="font-semibold gap-1.5"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </StaggerItem>
    </PageTransition>
  );
}

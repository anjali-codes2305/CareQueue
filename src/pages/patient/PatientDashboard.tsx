import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import patientQueueImg from "@/assets/patient-queue.png";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { getQueuePosition, getPredictedWaitTime, requestPriority } from "@/services/queueService";
import StatCard from "@/components/StatCard";
import { QueueTypeBadge, TokenStatusBadge } from "@/components/QueueStatusBadge";
import EmptyState from "@/components/EmptyState";
import { PageTransition, StaggerItem } from "@/components/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Clock, Hash, Users, AlertTriangle, Zap, Ticket, Info } from "lucide-react";

export default function PatientDashboard() {
  const { user } = useAuth();
  const [priorityReason, setPriorityReason] = useState("");
  const [severityInput, setSeverityInput] = useState([30]);
  const [isRequesting, setIsRequesting] = useState(false);

  const { data: activeToken, refetch: refetchToken } = useQuery({
    queryKey: ["active-token", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("tokens")
        .select("*, departments(name)")
        .eq("patient_id", user.id)
        .in("status", ["waiting", "in_consultation"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: queueInfo, refetch: refetchQueue } = useQuery({
    queryKey: ["queue-info", activeToken?.id],
    queryFn: async () => {
      if (!activeToken) return null;
      const pos = await getQueuePosition(activeToken.id, activeToken.department_id, activeToken.queue_type);
      const waitTime = await getPredictedWaitTime(activeToken.department_id, pos.patientsAhead);
      return { ...pos, waitTime };
    },
    enabled: !!activeToken && activeToken.status === "waiting",
    refetchInterval: 30000,
  });

  const { data: priorityReq } = useQuery({
    queryKey: ["priority-request", activeToken?.id],
    queryFn: async () => {
      if (!activeToken) return null;
      const { data } = await supabase
        .from("priority_requests")
        .select("*")
        .eq("token_id", activeToken.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!activeToken,
  });

  const handleRefresh = useCallback(() => {
    refetchToken();
    refetchQueue();
  }, [refetchToken, refetchQueue]);

  useRealtimeSubscription("tokens", handleRefresh, user ? `patient_id=eq.${user.id}` : undefined);

  const handleRequestPriority = async () => {
    if (!user || !activeToken) return;
    setIsRequesting(true);
    try {
      await requestPriority(activeToken.id, user.id, priorityReason, {}, severityInput[0]);
      toast.success("Priority request submitted for nurse review.");
      setPriorityReason("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsRequesting(false);
    }
  };

  // No active token — show info message (patient can't self-queue)
  if (!activeToken) {
    return (
      <PageTransition className="space-y-6">
        <StaggerItem>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold font-display text-foreground">Patient Dashboard</h1>
              <p className="text-muted-foreground text-sm mt-1">Your queue status will appear here</p>
            </div>
            <motion.img
              src={patientQueueImg}
              alt="Patient Queue"
              className="w-24 h-24 object-contain hidden sm:block"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </StaggerItem>

        <StaggerItem>
          <Card className="shadow-elevated max-w-lg overflow-hidden">
            <div className="h-1.5 bg-muted" />
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Info className="w-5 h-5 text-muted-foreground" />
                </div>
                No Active Token
              </CardTitle>
              <CardDescription>
                Please visit the reception desk to register for a consultation. The receptionist will create your queue token and provide you with your position details.
              </CardDescription>
            </CardHeader>
          </Card>
        </StaggerItem>
      </PageTransition>
    );
  }

  const deptName = (activeToken as any).departments?.name || "Unknown";
  const isMyTurn = activeToken.status === "in_consultation";

  return (
    <PageTransition className="space-y-6">
      <StaggerItem>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Patient Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Track your queue status in real time</p>
          </div>
          <TokenStatusBadge status={activeToken.status} type={activeToken.queue_type as any} />
        </div>
      </StaggerItem>

      {isMyTurn && (
        <StaggerItem>
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="rounded-2xl gradient-primary p-6 text-primary-foreground relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_hsl(0,0%,100%,0.15),_transparent_60%)]" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
                <Ticket className="w-7 h-7" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">It's Your Turn!</p>
                <p className="text-primary-foreground/70 text-sm">Please proceed to the consultation room</p>
              </div>
            </div>
          </motion.div>
        </StaggerItem>
      )}

      <StaggerItem>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Token Number" value={`#${activeToken.token_number}`} icon={<Hash className="w-5 h-5" />} description={deptName} variant="primary" />
          <StatCard title="Queue Position" value={isMyTurn ? "Now!" : queueInfo?.position || "—"} icon={<Users className="w-5 h-5" />} description={isMyTurn ? "Proceed to doctor" : `${queueInfo?.patientsAhead || 0} ahead`} variant={isMyTurn ? "success" : "default"} />
          <StatCard title="Predicted Wait" value={isMyTurn ? "0 min" : queueInfo?.waitTime ? `${queueInfo.waitTime} min` : "—"} icon={<Clock className="w-5 h-5" />} description="Estimated wait" variant="warning" />
          <StatCard title="Queue Type" value={activeToken.queue_type === "priority" ? "Priority" : "Normal"} icon={<Zap className="w-5 h-5" />} variant={activeToken.queue_type === "priority" ? "warning" : "default"} />
        </div>
      </StaggerItem>

      <StaggerItem>
        <Card className="shadow-card overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-lg">Token Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</p>
                <TokenStatusBadge status={activeToken.status} type={activeToken.queue_type as any} />
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Queue</p>
                <QueueTypeBadge type={activeToken.queue_type} />
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Department</p>
                <p className="font-semibold text-foreground text-sm">{deptName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Arrival</p>
                <p className="font-semibold text-foreground text-sm">{new Date(activeToken.arrival_time).toLocaleTimeString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </StaggerItem>

      {activeToken.status === "waiting" && activeToken.queue_type === "normal" && (
        <StaggerItem>
          <Card className="shadow-card border-warning/20 overflow-hidden">
            <div className="h-1 bg-warning/30" />
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-lg">
                <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                </div>
                Request Priority
              </CardTitle>
              <CardDescription>
                Experiencing urgent symptoms? A nurse will review your request.
                {priorityReq && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="block mt-2 font-semibold">
                    {priorityReq.status === "pending" && "⏳ Your request is pending nurse review..."}
                    {priorityReq.status === "approved" && "✅ Approved! You've been moved to priority queue."}
                    {priorityReq.status === "rejected" && "❌ Request was not approved by the nurse."}
                  </motion.span>
                )}
              </CardDescription>
            </CardHeader>
            {(!priorityReq || priorityReq.status === "rejected") && (
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Symptom Severity — <span className="text-foreground font-bold">{severityInput[0]}/100</span>
                  </Label>
                  <div className="relative pt-1">
                    <Slider value={severityInput} onValueChange={setSeverityInput} max={100} step={1} />
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[10px] text-success font-medium">Mild</span>
                      <span className="text-[10px] text-warning font-medium">Moderate</span>
                      <span className="text-[10px] text-emergency font-medium">Severe</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Describe your condition</Label>
                  <Textarea value={priorityReason} onChange={(e) => setPriorityReason(e.target.value)} placeholder="Describe your symptoms in detail..." maxLength={500} className="min-h-[80px] resize-none" />
                </div>
                <Button onClick={handleRequestPriority} disabled={!priorityReason.trim() || isRequesting} variant="outline" className="border-warning text-warning hover:bg-warning/10 font-semibold">
                  {isRequesting ? "Submitting..." : "Submit Priority Request"}
                </Button>
              </CardContent>
            )}
          </Card>
        </StaggerItem>
      )}
    </PageTransition>
  );
}

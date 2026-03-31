import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { callNextPatient, completeConsultation, skipPatient, getWaitingTokens } from "@/services/queueService";
import StatCard from "@/components/StatCard";
import { QueueTypeBadge } from "@/components/QueueStatusBadge";
import EmptyState from "@/components/EmptyState";
import { PageTransition, StaggerItem } from "@/components/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Stethoscope, Clock, Users, AlertTriangle, Play, CheckCircle, Timer, ClipboardList, SkipForward } from "lucide-react";

function ConsultationTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startTime).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <div className="flex items-center gap-2">
      <Timer className="w-4 h-4 text-success animate-pulse" />
      <span className="font-mono font-bold text-lg text-foreground">
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
    </div>
  );
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [isCallingNext, setIsCallingNext] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  // Fetch the doctor's assigned department
  const { data: doctorInfo } = useQuery({
    queryKey: ["doctor-info", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("employees")
        .select("department_id")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: currentPatient, refetch: refetchCurrent } = useQuery({
    queryKey: ["current-patient", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("tokens")
        .select("*, departments(name)")
        .eq("doctor_id", user.id)
        .eq("status", "in_consultation")
        .maybeSingle();
      
      // Fetch patient name separately since there's no FK from tokens to profiles
      if (data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", data.patient_id)
          .maybeSingle();
        return { ...data, patient_name: profile?.full_name || "Patient" };
      }
      return data;
    },
    enabled: !!user,
  });

  const { data: waitingTokens, refetch: refetchWaiting } = useQuery({
    queryKey: ["waiting-tokens", doctorInfo?.department_id, user?.id],
    queryFn: async () => {
      if (!doctorInfo?.department_id || !user?.id) return [];
      return getWaitingTokens(doctorInfo.department_id, user.id);
    },
    enabled: !!doctorInfo?.department_id && !!user?.id,
  });

  const { data: avgConsultTime } = useQuery({
    queryKey: ["avg-consult-time", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from("consultation_metrics")
        .select("duration_minutes")
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!data || data.length === 0) return 12;
      const total = data.reduce((sum, m) => sum + (m.duration_minutes || 12), 0);
      return Math.round(total / data.length);
    },
    enabled: !!user,
  });

  const handleRefresh = useCallback(() => {
    refetchCurrent();
    refetchWaiting();
  }, [refetchCurrent, refetchWaiting]);

  useRealtimeSubscription("tokens", handleRefresh);

  const handleCallNext = async () => {
    if (!user || !doctorInfo?.department_id) {
      toast.error("Doctor department not assigned");
      return;
    }
    setIsCallingNext(true);
    try {
      const token = await callNextPatient(user.id, doctorInfo.department_id);
      if (token) {
        toast.success(`Calling patient — Token #${token.token_number}`);
        refetchCurrent();
        refetchWaiting();
      } else {
        toast.info("No patients assigned to you are currently waiting");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCallingNext(false);
    }
  };

  const handleComplete = async () => {
    if (!user || !currentPatient) return;
    setIsCompleting(true);
    try {
      await completeConsultation(currentPatient.id, user.id, currentPatient.department_id);
      toast.success("Consultation completed");
      refetchCurrent();
      refetchWaiting();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSkipPatient = async () => {
    if (!user || !currentPatient) return;
    setIsSkipping(true);
    try {
      await skipPatient(currentPatient.id, user.id, currentPatient.department_id);
      toast.info(`Patient #${currentPatient.token_number} skipped — moved to end of queue`);
      refetchCurrent();
      refetchWaiting();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSkipping(false);
    }
  };

  const priorityCount = waitingTokens?.filter((t: any) => t.queue_type === "priority").length || 0;

  return (
    <PageTransition className="space-y-6">
      <StaggerItem>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Doctor Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your assigned patients</p>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Waiting" value={waitingTokens?.length || 0} icon={<Users className="w-5 h-5" />} variant="primary" />
          <StatCard title="Priority" value={priorityCount} icon={<AlertTriangle className="w-5 h-5" />} variant={priorityCount > 0 ? "warning" : "default"} />
          <StatCard title="Avg Consult" value={`${avgConsultTime || 12} min`} icon={<Clock className="w-5 h-5" />} variant="default" />
          <StatCard title="Current" value={currentPatient ? `#${currentPatient.token_number}` : "—"} icon={<Stethoscope className="w-5 h-5" />} variant={currentPatient ? "success" : "default"} />
        </div>
      </StaggerItem>

      {/* Current Patient */}
      <StaggerItem>
        {currentPatient ? (
          <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }}>
            <Card className="shadow-card border-success/20 overflow-hidden">
              <div className="h-1.5 bg-success" />
              <CardHeader className="pb-3">
                <CardTitle className="font-display flex items-center gap-2 text-lg">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <Stethoscope className="w-4 h-4 text-success" />
                  </div>
                  Current Patient
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <p className="text-xl font-bold font-display text-foreground">Token #{currentPatient.token_number}</p>
                      <QueueTypeBadge type={currentPatient.queue_type} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {(currentPatient as any).patient_name || "Patient"} · {(currentPatient as any).departments?.name}
                    </p>
                    {currentPatient.consultation_start && (
                      <ConsultationTimer startTime={currentPatient.consultation_start} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={handleSkipPatient}
                        disabled={isSkipping}
                        variant="outline"
                        className="border-warning text-warning hover:bg-warning/10 font-semibold gap-2 h-11"
                      >
                        <SkipForward className="w-4 h-4" />
                        {isSkipping ? "Skipping..." : "Skip (Not Present)"}
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button onClick={handleComplete} disabled={isCompleting} className="bg-success hover:bg-success/90 text-success-foreground font-semibold gap-2 h-11">
                        <CheckCircle className="w-4 h-4" />
                        {isCompleting ? "Completing..." : "Complete Consultation"}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <Card className="shadow-card overflow-hidden">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="w-7 h-7 text-primary/40" />
              </div>
              <p className="text-muted-foreground mb-5 text-sm">No patient in consultation</p>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button onClick={handleCallNext} disabled={isCallingNext || !doctorInfo?.department_id} size="lg" className="gradient-primary text-primary-foreground border-0 gap-2 font-semibold rounded-full px-8">
                  <Play className="w-5 h-5" />
                  {isCallingNext ? "Calling..." : "Call Next Patient"}
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        )}
      </StaggerItem>

      {/* Queue List */}
      <StaggerItem>
        <Card className="shadow-card overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-primary" />
              </div>
              Queue Overview
            </CardTitle>
            <CardDescription>{waitingTokens?.length || 0} patients waiting</CardDescription>
          </CardHeader>
          <CardContent>
            {!waitingTokens || waitingTokens.length === 0 ? (
              <EmptyState icon={ClipboardList} title="Queue is empty" description="No patients currently waiting" />
            ) : (
              <div className="space-y-2">
                {waitingTokens.slice(0, 10).map((token: any, idx: number) => (
                  <motion.div
                    key={token.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{idx + 1}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">Token #{token.token_number}</p>
                        <p className="text-xs text-muted-foreground">{token.departments?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <QueueTypeBadge type={token.queue_type} />
                      {token.severity_score > 0 && (
                        <span className="text-xs text-muted-foreground font-medium">Sev: {token.severity_score}</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </StaggerItem>
    </PageTransition>
  );
}

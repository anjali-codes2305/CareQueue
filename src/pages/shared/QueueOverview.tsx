import { useQuery } from "@tanstack/react-query";
import { getWaitingTokens } from "@/services/queueService";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { QueueTypeBadge } from "@/components/QueueStatusBadge";
import EmptyState from "@/components/EmptyState";
import LiveIndicator from "@/components/LiveIndicator";
import { PageTransition, StaggerItem } from "@/components/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList } from "lucide-react";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";

export default function QueueOverview() {
  const [selectedDept, setSelectedDept] = useState<string>("all");

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      return data || [];
    },
  });

  const { data: tokens, refetch } = useQuery({
    queryKey: ["queue-overview", selectedDept],
    queryFn: () => getWaitingTokens(selectedDept === "all" ? undefined : selectedDept),
  });

  const handleRefresh = useCallback(() => refetch(), [refetch]);
  useRealtimeSubscription("tokens", handleRefresh);

  return (
    <PageTransition className="space-y-6">
      <StaggerItem>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">Queue Overview</h1>
              <p className="text-muted-foreground text-sm mt-1">{tokens?.length || 0} patients in queue</p>
            </div>
            <LiveIndicator label="Real-time" />
          </div>
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="w-[200px] h-10">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments?.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </StaggerItem>

      <StaggerItem>
        <Card className="shadow-card overflow-hidden">
          <div className="h-1 gradient-primary" />
          <CardHeader className="pb-3">
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-primary" />
              </div>
              Live Queue
            </CardTitle>
            <CardDescription>Priority patients are served first, then normal queue (FIFO)</CardDescription>
          </CardHeader>
          <CardContent>
            {!tokens || tokens.length === 0 ? (
              <EmptyState icon={ClipboardList} title="Queue is empty" description="Patients will appear here as they join" />
            ) : (
              <div className="space-y-2">
                {tokens.map((token: any, idx: number) => (
                  <motion.div
                    key={token.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{idx + 1}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">Token #{token.token_number}</p>
                        <p className="text-xs text-muted-foreground">{token.departments?.name} · {new Date(token.arrival_time).toLocaleTimeString()}</p>
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

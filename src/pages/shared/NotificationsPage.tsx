import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import EmptyState from "@/components/EmptyState";
import { PageTransition, StaggerItem } from "@/components/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check } from "lucide-react";
import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const typeColors: Record<string, string> = {
  token_created: "bg-primary/10 text-primary",
  queue_update: "bg-info/10 text-info",
  turn_near: "bg-warning/10 text-warning",
  priority_decision: "bg-accent/10 text-accent",
  doctor_calling: "bg-success/10 text-success",
  emergency_alert: "bg-emergency/10 text-emergency",
  doctor_delay: "bg-warning/10 text-warning",
};

export default function NotificationsPage() {
  const { user } = useAuth();

  const { data: notifications, refetch } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  const handleRefresh = useCallback(() => refetch(), [refetch]);
  useRealtimeSubscription("notifications", handleRefresh, user ? `user_id=eq.${user.id}` : undefined);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    refetch();
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    refetch();
  };

  return (
    <PageTransition className="space-y-6">
      <StaggerItem>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Notifications</h1>
            <p className="text-muted-foreground text-sm mt-1">Stay updated on your queue status</p>
          </div>
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5 font-medium">
            <Check className="w-4 h-4" />
            Mark all read
          </Button>
        </div>
      </StaggerItem>

      <StaggerItem>
        <Card className="shadow-card overflow-hidden">
          <CardContent className="p-0">
            {!notifications || notifications.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={Bell} title="No notifications" description="Updates will appear here in real-time" />
              </div>
            ) : (
              <div className="divide-y divide-border">
                <AnimatePresence>
                  {notifications.map((n, idx) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`p-4 flex items-start gap-3 cursor-pointer transition-colors hover:bg-secondary/50 ${!n.is_read ? "bg-primary/3" : ""}`}
                      onClick={() => !n.is_read && markAsRead(n.id)}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? "bg-primary shadow-glow-primary" : "bg-transparent"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-sm text-foreground">{n.title}</p>
                          <Badge className={`${typeColors[n.type] || "bg-muted text-muted-foreground"} text-[10px] capitalize border-0`}>
                            {n.type.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{n.message}</p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
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

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import { PageTransition, StaggerItem } from "@/components/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, Clock, Activity, TrendingUp, AlertTriangle, PieChart as PieIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

const CHART_COLORS = [
  "hsl(210, 100%, 52%)",
  "hsl(162, 72%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(152, 69%, 40%)",
  "hsl(280, 60%, 50%)",
];

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [totalTokens, waiting, completed, priorityApproved] = await Promise.all([
        supabase.from("tokens").select("*", { count: "exact", head: true }),
        supabase.from("tokens").select("*", { count: "exact", head: true }).eq("status", "waiting"),
        supabase.from("tokens").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("priority_requests").select("*", { count: "exact", head: true }).eq("status", "approved"),
      ]);
      return {
        totalTokens: totalTokens.count || 0,
        waiting: waiting.count || 0,
        completed: completed.count || 0,
        priorityApproved: priorityApproved.count || 0,
      };
    },
  });

  const { data: deptLoad } = useQuery({
    queryKey: ["dept-load"],
    queryFn: async () => {
      const { data: tokens } = await supabase
        .from("tokens")
        .select("department_id, departments(name), status")
        .eq("status", "waiting");
      const deptMap: Record<string, { name: string; count: number }> = {};
      tokens?.forEach((t: any) => {
        const name = t.departments?.name || "Unknown";
        if (!deptMap[name]) deptMap[name] = { name, count: 0 };
        deptMap[name].count++;
      });
      return Object.values(deptMap).sort((a, b) => b.count - a.count);
    },
  });

  const { data: avgConsult } = useQuery({
    queryKey: ["global-avg-consult"],
    queryFn: async () => {
      const { data } = await supabase
        .from("consultation_metrics")
        .select("duration_minutes")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!data || data.length === 0) return 0;
      const total = data.reduce((sum, m) => sum + (m.duration_minutes || 0), 0);
      return Math.round(total / data.length);
    },
  });

  const { data: queueTypeDistribution } = useQuery({
    queryKey: ["queue-type-dist"],
    queryFn: async () => {
      const [normal, priority] = await Promise.all([
        supabase.from("tokens").select("*", { count: "exact", head: true }).eq("queue_type", "normal"),
        supabase.from("tokens").select("*", { count: "exact", head: true }).eq("queue_type", "priority"),
      ]);
      return [
        { name: "Normal", value: normal.count || 0 },
        { name: "Priority", value: priority.count || 0 },
      ];
    },
  });

  const chartTooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "12px",
    color: "hsl(var(--foreground))",
    fontSize: "12px",
    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)",
  };

  return (
    <PageTransition className="space-y-6">
      <StaggerItem>
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Hospital analytics and operational insights</p>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Tokens" value={stats?.totalTokens || 0} icon={<Activity className="w-5 h-5" />} variant="primary" />
          <StatCard title="Waiting" value={stats?.waiting || 0} icon={<Users className="w-5 h-5" />} variant="warning" />
          <StatCard title="Completed" value={stats?.completed || 0} icon={<TrendingUp className="w-5 h-5" />} variant="success" />
          <StatCard title="Priority Escalated" value={stats?.priorityApproved || 0} icon={<AlertTriangle className="w-5 h-5" />} variant="emergency" />
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Load */}
          <Card className="shadow-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="font-display flex items-center gap-2 text-lg">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-primary" />
                </div>
                Department Queue Load
              </CardTitle>
              <CardDescription>Current patients waiting per department</CardDescription>
            </CardHeader>
            <CardContent>
              {deptLoad && deptLoad.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={deptLoad} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(210, 100%, 52%)" stopOpacity={1} />
                        <stop offset="100%" stopColor="hsl(162, 72%, 45%)" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <Bar dataKey="count" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={BarChart3} title="No queue data" description="Data will appear as patients join queues" />
              )}
            </CardContent>
          </Card>

          {/* Queue Type Distribution */}
          <Card className="shadow-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="font-display flex items-center gap-2 text-lg">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <PieIcon className="w-4 h-4 text-accent" />
                </div>
                Queue Distribution
              </CardTitle>
              <CardDescription>Normal vs Priority queue usage</CardDescription>
            </CardHeader>
            <CardContent>
              {queueTypeDistribution && (queueTypeDistribution[0].value > 0 || queueTypeDistribution[1].value > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={queueTypeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {queueTypeDistribution.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={PieIcon} title="No data yet" description="Queue distribution will appear here" />
              )}
            </CardContent>
          </Card>
        </div>
      </StaggerItem>

      {/* Performance Metrics */}
      <StaggerItem>
        <Card className="shadow-card overflow-hidden">
          <div className="h-1 gradient-warm" />
          <CardHeader className="pb-3">
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-warning" />
              </div>
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Avg Consultation", value: avgConsult || "—", unit: "min", color: "text-primary" },
                { label: "Current Load", value: stats?.waiting || 0, unit: "patients", color: "text-warning" },
                { label: "Priority Rate", value: stats?.totalTokens ? Math.round(((stats.priorityApproved || 0) / stats.totalTokens) * 100) : 0, unit: "%", color: "text-accent" },
              ].map((metric) => (
                <div key={metric.label} className="text-center p-5 rounded-xl bg-secondary/50 border border-border">
                  <p className={`text-3xl font-bold font-display ${metric.color}`}>{metric.value}<span className="text-base text-muted-foreground ml-1">{metric.unit}</span></p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-medium">{metric.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </StaggerItem>
    </PageTransition>
  );
}

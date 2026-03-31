import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import ForcePasswordChange from "@/components/ForcePasswordChange";
import {
  Activity, LogOut, Bell, Home, Users, ShieldCheck, BarChart3,
  ClipboardList, UserCircle, UserPlus, Stethoscope
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useCallback } from "react";
import LiveIndicator from "@/components/LiveIndicator";
const roleNavItems: Record<string, { label: string; path: string; icon: typeof Home }[]> = {
  patient: [
    { label: "Dashboard", path: "/dashboard", icon: Home },
    { label: "My Queue", path: "/dashboard/queue", icon: ClipboardList },
    { label: "Notifications", path: "/dashboard/notifications", icon: Bell },
  ],
  nurse: [
    { label: "Dashboard", path: "/dashboard", icon: Home },
    { label: "Triage", path: "/dashboard/triage", icon: ShieldCheck },
    { label: "Queue", path: "/dashboard/queue", icon: ClipboardList },
  ],
  doctor: [
    { label: "Dashboard", path: "/dashboard", icon: Home },
    { label: "Queue", path: "/dashboard/queue", icon: ClipboardList },
    { label: "Notifications", path: "/dashboard/notifications", icon: Bell },
  ],
  admin: [
    { label: "Dashboard", path: "/dashboard", icon: Home },
    { label: "Analytics", path: "/dashboard/analytics", icon: BarChart3 },
    { label: "Employees", path: "/dashboard/employees", icon: Users },
    { label: "Queue", path: "/dashboard/queue", icon: ClipboardList },
  ],
  receptionist: [
    { label: "Dashboard", path: "/dashboard", icon: Home },
    { label: "Queue", path: "/dashboard/queue", icon: ClipboardList },
    { label: "Notifications", path: "/dashboard/notifications", icon: Bell },
  ],
};

const roleGradient: Record<string, string> = {
  patient: "from-primary to-info",
  nurse: "from-accent to-success",
  doctor: "from-success to-accent",
  admin: "from-warning to-emergency",
  receptionist: "from-info to-primary",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, role, profile, signOut, mustChangePassword, setMustChangePassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: unreadCount, refetch: refetchNotifs } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      return count || 0;
    },
    enabled: !!user,
  });

  const handleRealtimeNotif = useCallback(() => { refetchNotifs(); }, [refetchNotifs]);
  useRealtimeSubscription("notifications", handleRealtimeNotif, user ? `user_id=eq.${user.id}` : undefined);

  const navItems = role ? (roleNavItems[role] || []) : [];

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <motion.div
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
                className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm group-hover:shadow-glow-primary transition-shadow"
              >
                <Activity className="w-5 h-5 text-primary-foreground" />
              </motion.div>
              <span className="text-lg font-bold font-display text-foreground hidden sm:inline tracking-tight">CareQueue</span>
            </Link>
            <div className="hidden sm:block"><LiveIndicator /></div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className={`gap-2 rounded-xl relative ${isActive ? "font-semibold shadow-sm" : "text-muted-foreground"}`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                      {item.label === "Notifications" && unreadCount && unreadCount > 0 ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emergency text-emergency-foreground text-[10px] font-bold flex items-center justify-center shadow-sm"
                        >
                          {unreadCount}
                        </motion.span>
                      ) : null}
                    </Button>
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ChangePasswordDialog />
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-secondary/60 border border-border/50">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${role ? (roleGradient[role] || "from-primary to-accent") : "from-primary to-accent"} flex items-center justify-center`}>
                <span className="text-xs font-bold text-primary-foreground">
                  {(profile?.full_name || "U").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground leading-tight">{profile?.full_name || "User"}</span>
                <span className="text-[10px] text-muted-foreground capitalize">{role}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground rounded-xl">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t border-border px-4 py-2 flex gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button variant={isActive ? "secondary" : "ghost"} size="sm" className={`gap-1.5 text-xs whitespace-nowrap rounded-xl ${isActive ? "font-semibold" : "text-muted-foreground"}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        >
          {children}
        </motion.div>
      </main>

      {user && mustChangePassword && (
        <ForcePasswordChange
          open={mustChangePassword}
          userId={user.id}
          onComplete={() => setMustChangePassword(false)}
        />
      )}
    </div>
  );
}

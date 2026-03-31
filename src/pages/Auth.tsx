import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";
import FloatingParticles from "@/components/FloatingParticles";
import { Activity, Heart, Shield, Stethoscope, Users, ClipboardList, KeyRound, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

const featureCards = [
  { icon: Heart, color: "text-primary", label: "Patient Portal", desc: "Track your queue in real-time" },
  { icon: Shield, color: "text-accent", label: "Nurse Triage", desc: "Priority verification system" },
  { icon: Stethoscope, color: "text-success", label: "Doctor Console", desc: "One-click patient management" },
  { icon: ClipboardList, color: "text-info", label: "Reception Desk", desc: "Patient onboarding & records" },
];

export default function Auth() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalEmail = loginEmail.trim();
      // If the user entered a generated patient username (lacking an '@' symbol), format it to the email Supabase expects
      if (!finalEmail.includes("@")) {
        finalEmail = `${finalEmail.toLowerCase()}@patient.carequeue.local`;
      }
      
      await signIn(finalEmail, loginPassword);
      toast.success("Welcome back!");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <FloatingParticles count={20} color="primary" />
      <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left branding */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="hidden lg:flex flex-col gap-6 p-2"
        >
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-glow-primary"
            >
              <Activity className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            <h1 className="text-3xl font-extrabold font-display text-foreground tracking-tight">CareQueue</h1>
          </div>
          <p className="text-xl font-display font-semibold text-foreground/80 leading-snug">
            Intelligent Hospital Queue<br />& Patient Flow Platform
          </p>
          <p className="text-muted-foreground leading-relaxed text-sm">
            Replace static token systems with adaptive, data-driven hospital workflows.
            Real-time queue management with role-based access for every team member.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {featureCards.map((cfg, i) => {
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={cfg.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                  whileHover={{ y: -2, scale: 1.02 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card shadow-card group hover:shadow-elevated transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{cfg.label}</p>
                    <p className="text-[11px] text-muted-foreground">{cfg.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Right form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <Card className="shadow-elevated border-border/50 overflow-hidden">
            <div className="h-1.5 gradient-primary" />
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 lg:hidden mb-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold font-display text-foreground">CareQueue</span>
              </div>
              <CardTitle className="font-display text-foreground text-2xl">Welcome</CardTitle>
              <CardDescription>Sign in to access your dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email / Username</Label>
                  <Input type="text" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required placeholder="Email or Username" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password</Label>
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">Forgot Password?</Link>
                  </div>
                  <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required placeholder="••••••••" className="h-11 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-11 gradient-primary text-primary-foreground border-0 font-semibold rounded-xl" disabled={loading}>
                  {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" /> : "Sign In"}
                </Button>
              </form>

              {/* Bottom links */}
              <div className="mt-6 pt-4 border-t border-border space-y-2">
                <Link to="/admin-register" className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group">
                  <ShieldAlert className="w-3.5 h-3.5 text-warning group-hover:text-warning" />
                  <span>Admin Registration (Authorized Only)</span>
                </Link>
                <Link to="/forgot-password" className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Forgot Password? Raise a Reset Ticket</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

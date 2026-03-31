import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";
import FloatingParticles from "@/components/FloatingParticles";
import heroImg from "@/assets/hero-illustration.png";
import nurseTriage from "@/assets/nurse-triage.png";
import doctorConsult from "@/assets/doctor-consult.png";
import analyticsDash from "@/assets/analytics-dash.png";
import patientQueue from "@/assets/patient-queue.png";
import { Activity, ArrowRight, Clock, Shield, Stethoscope, Users, Zap, BarChart3, ChevronRight, Sparkles, CheckCircle2, ArrowUpRight } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
const container = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } };

const features = [
  { icon: Clock, title: "Predictive Wait Times", desc: "Real-time estimation so patients always know when they'll be seen", color: "bg-primary/10 text-primary" },
  { icon: Shield, title: "Nurse-Verified Triage", desc: "Priority requests verified by nursing staff to prevent misuse", color: "bg-accent/10 text-accent" },
  { icon: Zap, title: "Smart Priority Queue", desc: "Severity-based dynamic queue reordering for urgent cases", color: "bg-warning/10 text-warning" },
  { icon: Stethoscope, title: "Doctor Workflow", desc: "One-click patient calling with live consultation timer", color: "bg-success/10 text-success" },
  { icon: Users, title: "Real-Time Updates", desc: "WebSocket-powered live updates across all dashboards", color: "bg-info/10 text-info" },
  { icon: BarChart3, title: "Hospital Analytics", desc: "Department load, peak hours, and doctor utilization metrics", color: "bg-emergency/10 text-emergency" },
];

const workflow = [
  { step: "01", title: "Patient Joins Queue", desc: "Selects department, gets a digital token instantly", img: patientQueue },
  { step: "02", title: "Nurse Reviews Priority", desc: "Verifies urgent cases with severity scoring", img: nurseTriage },
  { step: "03", title: "Doctor Calls Patient", desc: "One-click consultation with live timer tracking", img: doctorConsult },
  { step: "04", title: "Admin Monitors Flow", desc: "Real-time analytics and operational insights", img: analyticsDash },
];

const stats = [
  { label: "Wait Time Reduction", value: "60%", suffix: "↓" },
  { label: "Queue Throughput", value: "3x", suffix: "faster" },
  { label: "Patient Satisfaction", value: "95%", suffix: "↑" },
  { label: "Priority Accuracy", value: "99%", suffix: "" },
];

export default function Index() {
  const { user, role } = useAuth();
  if (user && role) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero */}
      <div className="gradient-hero text-primary-foreground relative min-h-[90vh] flex flex-col">
        <FloatingParticles count={30} color="primary" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 flex-1 flex flex-col">
          {/* Nav */}
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between mb-12"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold font-display tracking-tight">CareQueue</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link to="/auth">
                <Button className="glass-hero border-0 text-primary-foreground hover:bg-white/15 gap-2 rounded-full px-6">
                  Sign In <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.nav>

          {/* Hero content + illustration */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <motion.div variants={container} initial="hidden" animate="visible" className="pb-12 lg:pb-0">
              <motion.div variants={item} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-hero text-sm mb-6">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-primary-foreground/80">Intelligent Hospital Queue Management</span>
              </motion.div>

              <motion.h1 variants={item} className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold font-display leading-[1.08] mb-6">
                Transform Patient Flow
                <br />
                <span className="text-gradient-primary">Into Smart Workflows</span>
              </motion.h1>

              <motion.p variants={item} className="text-lg text-primary-foreground/55 leading-relaxed max-w-xl mb-10">
                Replace static token systems with adaptive, real-time queue intelligence. 
                Nurse-verified triage, predictive wait times, and role-based dashboards — all in one platform.
              </motion.p>

              <motion.div variants={item} className="flex flex-wrap gap-4">
                <Link to="/auth">
                  <Button size="lg" className="gradient-primary border-0 text-primary-foreground rounded-full gap-2 px-8 text-base shadow-lg hover:shadow-glow-primary transition-shadow">
                    Get Started Free <ChevronRight className="w-5 h-5" />
                  </Button>
                </Link>
                <a href="#workflow">
                  <Button size="lg" variant="ghost" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 rounded-full px-8 text-base">
                    How It Works
                  </Button>
                </a>
              </motion.div>

              {/* Mini stats row */}
              <motion.div variants={item} className="flex flex-wrap gap-6 mt-14">
                {stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-2xl font-bold font-display text-primary-foreground">{s.value}<span className="text-accent text-sm ml-1">{s.suffix}</span></p>
                    <p className="text-[11px] text-primary-foreground/40">{s.label}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Hero illustration */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease }}
              className="hidden lg:flex justify-center items-center relative"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent rounded-3xl" />
              <motion.img
                src={heroImg}
                alt="CareQueue Hospital Queue System"
                className="max-w-md w-full drop-shadow-2xl"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </div>
        </div>

        {/* Curved divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full">
            <path d="M0 80L48 74.7C96 69.3 192 58.7 288 50.7C384 42.7 480 37.3 576 40C672 42.7 768 53.3 864 56C960 58.7 1056 53.3 1152 48C1248 42.7 1344 37.3 1392 34.7L1440 32V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-3">Core Modules</span>
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-foreground">Everything Your Hospital Needs</h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Six integrated modules delivering an intelligent patient flow experience.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -4, scale: 1.01 }}
              className="group p-6 rounded-2xl border border-border bg-card shadow-card hover:shadow-elevated transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-primary/5" />
              <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold font-display text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* How It Works - Workflow */}
      <div id="workflow" className="bg-secondary/30 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-accent mb-3">How It Works</span>
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-foreground">Four Simple Steps</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">From patient arrival to admin analytics — a seamless end-to-end workflow.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {workflow.map((w, i) => (
              <motion.div
                key={w.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -3 }}
                className="bg-card border border-border rounded-2xl p-6 flex gap-5 items-center shadow-card hover:shadow-elevated transition-all duration-300 group"
              >
                <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300">
                  <img src={w.img} alt={w.title} className="w-16 h-16 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-primary font-mono">{w.step}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <h3 className="font-semibold font-display text-foreground text-lg">{w.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{w.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Roles showcase */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-warning mb-3">Role-Based Access</span>
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-foreground">Built for Every Role</h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { role: "Patient", features: ["Digital queue token", "Live wait times", "Priority request", "Real-time alerts"], color: "primary", icon: "👤" },
            { role: "Nurse", features: ["Triage panel", "Approve/reject priority", "Severity scoring", "Queue management"], color: "accent", icon: "🩺" },
            { role: "Doctor", features: ["One-click next patient", "Consultation timer", "Queue overview", "Emergency alerts"], color: "success", icon: "⚕️" },
            { role: "Admin", features: ["Department analytics", "Queue load charts", "Priority metrics", "Utilization reports"], color: "warning", icon: "📊" },
          ].map((r, i) => (
            <motion.div
              key={r.role}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="p-6 rounded-2xl border border-border bg-card shadow-card hover:shadow-elevated transition-all duration-300 group"
            >
              <div className="text-3xl mb-3">{r.icon}</div>
              <h3 className="font-bold font-display text-foreground text-lg mb-3">{r.role}</h3>
              <ul className="space-y-2">
                {r.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 text-${r.color}`} />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="gradient-hero rounded-3xl p-12 sm:p-16 text-center relative overflow-hidden"
        >
          <FloatingParticles count={15} color="accent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_hsl(210,100%,52%,0.12),_transparent_70%)]" />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-primary-foreground mb-4">Ready to Transform Patient Flow?</h2>
            <p className="text-primary-foreground/50 mb-8 max-w-md mx-auto">Experience the future of hospital queue management — intelligent, real-time, and role-aware.</p>
            <Link to="/auth">
              <Button size="lg" className="gradient-primary text-primary-foreground border-0 rounded-full gap-2 px-10 text-base shadow-lg hover:shadow-glow-primary transition-shadow">
                Start Now <ArrowUpRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold font-display text-foreground">CareQueue</span>
          </div>
          <p className="text-xs text-muted-foreground">Intelligent Hospital Queue & Patient Flow Platform</p>
        </div>
      </footer>
    </div>
  );
}

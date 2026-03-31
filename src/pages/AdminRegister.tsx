import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";
import FloatingParticles from "@/components/FloatingParticles";
import { Activity, ShieldAlert, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const ADMIN_SECRET_CODE = "CAREQUEUE-ADMIN-2026";

export default function AdminRegister() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [secretCode, setSecretCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codeVerified, setCodeVerified] = useState(false);

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretCode === ADMIN_SECRET_CODE) {
      setCodeVerified(true);
      toast.success("Access code verified");
    } else {
      toast.error("Invalid access code");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(email, password, fullName, "admin");
      toast.success("Admin account created successfully!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <FloatingParticles count={15} color="warning" />
      <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>
      <div className="absolute top-4 left-4 z-20">
        <Link to="/auth">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Button>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="shadow-elevated border-warning/20 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-warning to-emergency" />
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning to-emergency flex items-center justify-center shadow-lg"
              >
                <ShieldAlert className="w-6 h-6 text-primary-foreground" />
              </motion.div>
            </div>
            <CardTitle className="font-display text-foreground text-xl">Admin Registration</CardTitle>
            <CardDescription>Restricted access — authorized personnel only</CardDescription>
          </CardHeader>
          <CardContent>
            {!codeVerified ? (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Secret Access Code</Label>
                  <Input
                    type="password"
                    value={secretCode}
                    onChange={(e) => setSecretCode(e.target.value)}
                    required
                    placeholder="Enter the admin access code"
                    className="h-11 rounded-xl font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">Contact the system administrator for the access code.</p>
                </div>
                <Button type="submit" className="w-full h-11 bg-gradient-to-r from-warning to-emergency text-primary-foreground border-0 font-semibold rounded-xl">
                  Verify Code
                </Button>
              </form>
            ) : (
              <motion.form
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Full Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Admin Name" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@hospital.com" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" className="h-11 rounded-xl" />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-to-r from-warning to-emergency text-primary-foreground border-0 font-semibold rounded-xl">
                  {loading ? "Creating..." : "Create Admin Account"}
                </Button>
              </motion.form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";
import FloatingParticles from "@/components/FloatingParticles";
import { ArrowLeft, KeyRound, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("password_reset_tickets").insert({
        username,
        email,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Reset request submitted! An admin will review it shortly.");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <FloatingParticles count={12} color="primary" />
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
        <Card className="shadow-elevated overflow-hidden">
          <div className="h-1.5 gradient-primary" />
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center mb-3">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                <KeyRound className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="font-display text-foreground text-xl">Password Reset Request</CardTitle>
            <CardDescription>Submit a ticket and an admin will reset your password</CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-3"
              >
                <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <h3 className="font-display font-semibold text-foreground">Request Submitted!</h3>
                <p className="text-sm text-muted-foreground">An administrator will review your request and reset your password. You will receive your new credentials via email.</p>
                <Link to="/auth">
                  <Button variant="outline" className="mt-4 rounded-xl">Back to Login</Button>
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Username / Employee ID</Label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="Your username or employee ID" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Registered Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" className="h-11 rounded-xl" />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary text-primary-foreground border-0 font-semibold rounded-xl">
                  {loading ? "Submitting..." : "Submit Reset Request"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

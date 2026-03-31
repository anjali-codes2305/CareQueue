import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  trend?: { value: number; label: string };
  variant?: "default" | "primary" | "success" | "warning" | "emergency";
}

const variantStyles = {
  default: "bg-card hover:shadow-elevated",
  primary: "bg-card border-primary/20 hover:shadow-glow-primary",
  success: "bg-card border-success/20 hover:shadow-glow-success",
  warning: "bg-card border-warning/20 hover:shadow-glow-warning",
  emergency: "bg-card border-emergency/20",
};

const iconStyles = {
  default: "bg-secondary text-muted-foreground",
  primary: "gradient-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  warning: "gradient-warm text-warning-foreground",
  emergency: "bg-emergency text-emergency-foreground",
};

export default function StatCard({ title, value, icon, description, variant = "default" }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card className={`${variantStyles[variant]} shadow-card transition-all duration-300 overflow-hidden relative group`}>
        {variant !== "default" && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl ${variant === "primary" ? "bg-primary/8" : variant === "success" ? "bg-success/8" : variant === "warning" ? "bg-warning/8" : "bg-emergency/8"}`} />
          </div>
        )}
        <CardContent className="p-5 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold font-display text-foreground animate-count-up">{value}</p>
              {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${iconStyles[variant]}`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

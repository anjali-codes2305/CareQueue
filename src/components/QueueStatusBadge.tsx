import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Zap, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type QueueType = "normal" | "priority";
type TokenStatus = "waiting" | "in_consultation" | "completed" | "cancelled";

const queueConfig: Record<QueueType, { className: string; icon: typeof Zap; label: string }> = {
  normal: { className: "bg-primary/10 text-primary border-primary/20", icon: Clock, label: "Normal" },
  priority: { className: "bg-warning/10 text-warning border-warning/20", icon: Zap, label: "Priority" },
};

const statusConfig: Record<TokenStatus, { className: string; icon: typeof Clock; label: string }> = {
  waiting: { className: "bg-info/10 text-info border-info/20", icon: Loader2, label: "Waiting" },
  in_consultation: { className: "bg-success/10 text-success border-success/20", icon: CheckCircle2, label: "In Consultation" },
  completed: { className: "bg-muted text-muted-foreground border-border", icon: CheckCircle2, label: "Completed" },
  cancelled: { className: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle, label: "Cancelled" },
};

export function QueueTypeBadge({ type }: { type: QueueType }) {
  const config = queueConfig[type];
  const Icon = config.icon;
  return (
    <Badge className={`${config.className} text-xs gap-1 font-medium`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

export function TokenStatusBadge({ status, type }: { status: TokenStatus; type?: QueueType }) {
  if (status === "waiting" && type === "priority") {
    return (
      <Badge className="bg-warning/10 text-warning border-warning/20 text-xs gap-1 font-medium">
        <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
          <Zap className="w-3 h-3" />
        </motion.div>
        Priority Approved
      </Badge>
    );
  }

  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <Badge className={`${config.className} text-xs gap-1 font-medium`}>
      {status === "waiting" ? (
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
          <Icon className="w-3 h-3" />
        </motion.div>
      ) : (
        <Icon className="w-3 h-3" />
      )}
      {config.label}
    </Badge>
  );
}

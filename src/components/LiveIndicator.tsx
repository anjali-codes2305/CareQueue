import { motion } from "framer-motion";

export default function LiveIndicator({ label = "Live" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        <motion.span
          animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inline-flex h-full w-full rounded-full bg-success"
        />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
      </span>
      <span className="text-xs font-medium text-success">{label}</span>
    </div>
  );
}

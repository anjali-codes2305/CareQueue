import { motion } from "framer-motion";
import { ReactNode } from "react";

const variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], staggerChildren: 0.08 }
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export function PageTransition({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div initial="hidden" animate="visible" variants={variants} className={className}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={childVariants} className={className}>
      {children}
    </motion.div>
  );
}

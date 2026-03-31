import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import PatientDashboard from "@/pages/patient/PatientDashboard";
import NurseDashboard from "@/pages/nurse/NurseDashboard";
import DoctorDashboard from "@/pages/doctor/DoctorDashboard";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import ReceptionistDashboard from "@/pages/receptionist/ReceptionistDashboard";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";

export default function Dashboard() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mx-auto shadow-glow-primary">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
              <Activity className="w-6 h-6 text-primary-foreground" />
            </motion.div>
          </div>
          <p className="text-sm text-muted-foreground font-medium">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (!role) return <Navigate to="/auth" replace />;

  const dashboards: Record<string, React.ReactNode> = {
    patient: <PatientDashboard />,
    nurse: <NurseDashboard />,
    doctor: <DoctorDashboard />,
    admin: <AdminDashboard />,
    receptionist: <ReceptionistDashboard />,
  };

  return (
    <DashboardLayout>
      {dashboards[role] || <Navigate to="/auth" replace />}
    </DashboardLayout>
  );
}

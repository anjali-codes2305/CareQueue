import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import NotificationsPage from "@/pages/shared/NotificationsPage";
import QueueOverview from "@/pages/shared/QueueOverview";
import NurseDashboard from "@/pages/nurse/NurseDashboard";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import EmployeeManagement from "@/pages/admin/EmployeeManagement";

export function DashboardNotifications() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (!role) return <Navigate to="/auth" replace />;
  return <DashboardLayout><NotificationsPage /></DashboardLayout>;
}

export function DashboardQueue() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (!role) return <Navigate to="/auth" replace />;
  return <DashboardLayout><QueueOverview /></DashboardLayout>;
}

export function DashboardTriage() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role !== "nurse") return <Navigate to="/dashboard" replace />;
  return <DashboardLayout><NurseDashboard /></DashboardLayout>;
}

export function DashboardAnalytics() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role !== "admin") return <Navigate to="/dashboard" replace />;
  return <DashboardLayout><AdminDashboard /></DashboardLayout>;
}

export function DashboardEmployees() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role !== "admin") return <Navigate to="/dashboard" replace />;
  return <DashboardLayout><EmployeeManagement /></DashboardLayout>;
}

export function DashboardUsers() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role !== "admin") return <Navigate to="/dashboard" replace />;
  return <DashboardLayout><EmployeeManagement /></DashboardLayout>;
}

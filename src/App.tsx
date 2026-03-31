import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminRegister from "./pages/AdminRegister";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import { DashboardNotifications, DashboardQueue, DashboardTriage, DashboardAnalytics, DashboardEmployees, DashboardUsers } from "./pages/DashboardRoutes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

function AppRoutes() {
  const { user, loading } = useAuth();

  const protect = (el: React.ReactNode) => {
    if (loading) return null;
    if (!user) return <Navigate to="/auth" replace />;
    return el;
  };

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/admin-register" element={<AdminRegister />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/dashboard" element={protect(<Dashboard />)} />
      <Route path="/dashboard/notifications" element={protect(<DashboardNotifications />)} />
      <Route path="/dashboard/queue" element={protect(<DashboardQueue />)} />
      <Route path="/dashboard/triage" element={protect(<DashboardTriage />)} />
      <Route path="/dashboard/analytics" element={protect(<DashboardAnalytics />)} />
      <Route path="/dashboard/employees" element={protect(<DashboardEmployees />)} />
      <Route path="/dashboard/users" element={protect(<DashboardUsers />)} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;

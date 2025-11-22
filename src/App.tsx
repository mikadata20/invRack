import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Supply from "./pages/Supply";
import Picking from "./pages/Picking";
import Kobetsu from "./pages/Kobetsu";
import Dashboard from "./pages/Dashboard";
import BomMaster from "./pages/BomMaster";
import StockManagement from "./pages/StockManagement";
import UserManagement from "./pages/UserManagement";
import ActivityLog from "./pages/ActivityLog";
import StockTransactions from "./pages/StockTransactions";
import KdSet from "./pages/KdSet";
import KdUnset from "./pages/KdUnset";
import RackMap from "./pages/RackMap";
import StockCheck from "./pages/StockCheck";
import DailyProductionPlan from "./pages/DailyProductionPlan";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/supply" element={<Supply />} />
          <Route path="/picking" element={<Picking />} />
          <Route path="/kobetsu" element={<Kobetsu />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bom-master" element={<BomMaster />} />
          <Route path="/stock-management" element={<StockManagement />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/activity-log" element={<ActivityLog />} />
          <Route path="/stock-transactions" element={<StockTransactions />} />
          <Route path="/kd-set" element={<KdSet />} />
          <Route path="/kd-unset" element={<KdUnset />} />
          <Route path="/rack-map" element={<RackMap />} />
          <Route path="/stock-check" element={<StockCheck />} />
          <Route path="/daily-production-plan" element={<DailyProductionPlan />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
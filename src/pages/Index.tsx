import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import ProcessCard from "@/components/ProcessCard";
import StatsCard from "@/components/StatsCard";
import { PackagePlus, Package, ClipboardList, BarChart3, LogOut, Package2, Database, Users, FileText, History, Box, MinusSquare, LayoutGrid, PackageSearch, FileSpreadsheet, Network, Layers } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { ThemeToggle } from "@/components/ThemeToggle"; // Import ThemeToggle
import { Tables } from "@/integrations/supabase/types"; // Import Tables type

const Index = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading, hasRole, isAdmin, isController } = useUserRole();
  const [todayStats, setTodayStats] = useState({ supply: 0, picking: 0, total: 0, boms: 0 });

  useEffect(() => {
    if (!authLoading && !profile) {
      navigate("/auth");
    } else if (profile) {
      fetchTodayStats();
    }
  }, [authLoading, profile, navigate]);

  const fetchTodayStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: transactionData, error } = await supabase
      .from("transaction_log")
      .select("*")
      .gte("start_time", today.toISOString());

    if (error) {
      console.error("Error fetching today's stats:", error);
      return;
    }

    const data = transactionData as Tables<'transaction_log'>[];

    const { count: bomCount, error: bomError } = await supabase // Access count directly from the response
      .from("bom_master")
      .select("id", { count: "exact", head: true });

    if (bomError) {
      console.error("Error fetching BOM count:", bomError);
      return;
    }

    if (data) {
      const supply = data
        .filter((t) => t.process_type === "SUPPLY")
        .reduce((sum, t) => sum + t.qty, 0);
      const picking = data
        .filter((t) => t.process_type === "PICKING")
        .reduce((sum, t) => sum + t.qty, 0);

      setTodayStats({
        supply,
        picking,
        total: data.length,
        boms: bomCount || 0, // Use bomCount here
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (authLoading || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Package2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Rack Operation System</h1>
              <p className="text-sm text-muted-foreground">Warehouse Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle /> {/* Dark mode toggle */}
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Today's Stats */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Today's Activity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Supply Operations"
              value={todayStats.supply}
              icon={PackagePlus}
              description="Units added today"
            />
            <StatsCard
              title="Picking Operations"
              value={todayStats.picking}
              icon={Package}
              description="Units picked today"
            />
            <StatsCard
              title="Total Transactions"
              value={todayStats.total}
              icon={ClipboardList}
              description="All operations today"
            />
            <StatsCard
              title="Active BOMs"
              value={todayStats.boms}
              icon={Database}
              description="Total BOM entries"
            />
          </div>
        </section>

        {/* Process Actions */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Operations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProcessCard
              title="Supply Process"
              description="Add stock to rack location"
              icon={PackagePlus}
              variant="supply"
              onClick={() => navigate("/supply")}
            />
            <ProcessCard
              title="Supply Big Part"
              description="Supply big/partner parts"
              icon={PackagePlus}
              variant="kobetsu"
              onClick={() => navigate("/supply-big-part")}
            />
            <ProcessCard
              title="Picking Process"
              description="Pick parts with kanban"
              icon={Package}
              variant="picking"
              onClick={() => navigate("/picking")}
            />
            <ProcessCard
              title="Kobetsu Picking"
              description="Manual picking operation"
              icon={ClipboardList}
              variant="kobetsu"
              onClick={() => navigate("/kobetsu")}
            />
            <ProcessCard
              title="Analytics Dashboard"
              description="View reports & insights"
              icon={BarChart3}
              variant="dashboard"
              onClick={() => navigate("/dashboard")}
            />
            <ProcessCard
              title="Stock Check"
              description="Check stock for production"
              icon={PackageSearch}
              variant="supply"
              onClick={() => navigate("/stock-check")}
            />
            <ProcessCard
              title="Daily Plan"
              description="Manage production plan"
              icon={FileSpreadsheet}
              variant="supply"
              onClick={() => navigate("/daily-production-plan")}
            />
          </div>
        </section>

        {/* Management Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProcessCard
              title="BOM Master Data"
              description="Manage Bill of Materials"
              icon={Database}
              variant="dashboard"
              onClick={() => navigate("/bom-master")}
            />
            <ProcessCard
              title="Stock Management"
              description="View and adjust inventory"
              icon={Package}
              variant="supply"
              onClick={() => navigate("/stock-management")}
            />
            {hasRole(["admin", "controller"]) && (
              <ProcessCard
                title="User Management"
                description="Manage user roles & access"
                icon={Users}
                variant="picking"
                onClick={() => navigate("/user-management")}
              />
            )}
            <ProcessCard
              title="Activity Log"
              description="View system activities"
              icon={FileText}
              variant="kobetsu"
              onClick={() => navigate("/activity-log")}
            />
            <ProcessCard
              title="Stock Traceability"
              description="Track material movement"
              icon={History}
              variant="dashboard"
              onClick={() => navigate("/stock-transactions")}
            />
            <ProcessCard
              title="KD Set"
              description="View KD Set summary"
              icon={Box}
              variant="kobetsu"
              onClick={() => navigate("/kd-set")}
            />
            <ProcessCard
              title="KD Unset"
              description="View unset parts summary"
              icon={MinusSquare}
              variant="picking"
              onClick={() => navigate("/kd-unset")}
            />
            <ProcessCard
              title="Rack Map"
              description="Visual overview of rack contents"
              icon={LayoutGrid}
              variant="dashboard"
              onClick={() => navigate("/rack-map")}
            />
            <ProcessCard
              title="Partner Rack"
              description="Manage partner rack locations"
              icon={Network}
              variant="picking"
              onClick={() => navigate("/partner-rack")}
            />
            <ProcessCard
              title="Smart Counter"
              description="AI Object Counting"
              icon={Layers}
              variant="dashboard"
              onClick={() => navigate("/object-counter")}
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
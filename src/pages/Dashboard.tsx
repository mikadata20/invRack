import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/StatsCard";
import { ArrowLeft, Package, MapPin, TrendingUp, TrendingDown, AlertTriangle, Clock, RefreshCw, BarChart2, LayoutGrid, CalendarDays } from "lucide-react"; // Import CalendarDays for Stock Aging
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types"; // Import Tables type

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalRacks: 0,
    totalParts: 0,
    supplyToday: 0,
    pickingToday: 0,
    errorsToday: 0,
    avgRackUtilization: 0,
    stockTurnoverRate: 0,
    avgPickingTime: 0,
    avgPutAwayTime: 0,
    avgStockAge: 0, // New: Average Stock Age
  });
  const [stockByRack, setStockByRack] = useState<any[]>([]);
  const [unsetPartData, setUnsetPartData] = useState<any[]>([]);
  const [errorTrend, setErrorTrend] = useState<any[]>([]);
  const [rackUtilizationData, setRackUtilizationData] = useState<any[]>([]);
  const [mostAccessedLocations, setMostAccessedLocations] = useState<any[]>([]);
  const [stockAgingData, setStockAgingData] = useState<any[]>([]); // New: Stock Aging Data

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch stats
    const { data: inventoryRaw, error: inventoryError } = await supabase.from("rack_inventory").select("*");
    const { data: bomRaw, error: bomError } = await supabase.from("bom_master").select("*");
    const { data: transactionsTodayRaw, error: transactionsTodayError } = await supabase
      .from("transaction_log")
      .select("*")
      .gte("start_time", today.toISOString());
    const { data: allTransactionsRaw, error: allTransactionsError } = await supabase
      .from("transaction_log")
      .select("*")
      .gte("start_time", thirtyDaysAgo.toISOString());
    const { data: stockTransactions30DaysRaw, error: stockTransactions30DaysError } = await supabase
      .from("stock_transactions")
      .select("qty, transaction_type, rack_location")
      .gte("timestamp", thirtyDaysAgo.toISOString());

    if (inventoryError || bomError || transactionsTodayError || allTransactionsError || stockTransactions30DaysError) {
      toast.error("Error fetching dashboard data", {
        description: inventoryError?.message || bomError?.message || transactionsTodayError?.message || allTransactionsError?.message || stockTransactions30DaysError?.message,
      });
      return;
    }

    const inventory = inventoryRaw as Tables<'rack_inventory'>[];
    const bom = bomRaw as Tables<'bom_master'>[];
    const transactionsToday = transactionsTodayRaw as Tables<'transaction_log'>[];
    const allTransactions = allTransactionsRaw as Tables<'transaction_log'>[];
    const stockTransactions30Days = stockTransactions30DaysRaw as Tables<'stock_transactions'>[];

    if (inventory) {
      const uniqueRacks = new Set(inventory.map((i) => i.rack_location)).size;
      const totalPartsInBom = bom?.length || 0;

      const supplyToday = transactionsToday?.filter((t) => t.process_type === "SUPPLY")
        .reduce((sum, t) => sum + t.qty, 0) || 0;
      const pickingToday = transactionsToday?.filter((t) => t.process_type === "PICKING" || t.process_type === "KOBETSU")
        .reduce((sum, t) => sum + t.qty, 0) || 0;
      const errorsToday = transactionsToday?.filter((t) => t.is_error).length || 0;

      // Rack Utilization
      let totalCapacity = 0;
      let totalCurrentQty = 0;
      const rackUtilData: any[] = [];
      inventory.forEach(item => {
        totalCurrentQty += item.qty;
        totalCapacity += item.max_capacity || 100; // Use default 100 if max_capacity is null/0
        rackUtilData.push({
          rack_location: item.rack_location,
          utilization: ((item.qty / (item.max_capacity || 100)) * 100).toFixed(1),
        });
      });
      const avgRackUtilization = totalCapacity > 0 ? ((totalCurrentQty / totalCapacity) * 100) : 0;
      setRackUtilizationData(rackUtilData.sort((a, b) => b.utilization - a.utilization).slice(0, 10)); // Top 10 by utilization

      // Stock Turnover Rate (simplified: total picked qty last 30 days / current total inventory qty)
      const totalPickedQty30Days = stockTransactions30Days
        ?.filter(tx => tx.transaction_type === "PICKING" || tx.transaction_type === "KOBETSU")
        .reduce((sum, tx) => sum + Math.abs(tx.qty), 0) || 0; // Use Math.abs for picked qty
      const currentTotalInventoryQty = inventory.reduce((sum, item) => sum + item.qty, 0);
      const stockTurnoverRate = currentTotalInventoryQty > 0 ? (totalPickedQty30Days / currentTotalInventoryQty) : 0;

      // Average Picking & Put-away Time (last 30 days)
      const pickingTransactions = allTransactions?.filter(t => t.process_type === "PICKING" && t.duration_sec !== null) || [];
      const supplyTransactions = allTransactions?.filter(t => t.process_type === "SUPPLY" && t.duration_sec !== null) || [];
      const avgPickingTime = pickingTransactions.length > 0 ? (pickingTransactions.reduce((sum, t) => sum + (t.duration_sec || 0), 0) / pickingTransactions.length) : 0;
      const avgPutAwayTime = supplyTransactions.length > 0 ? (supplyTransactions.reduce((sum, t) => sum + (t.duration_sec || 0), 0) / supplyTransactions.length) : 0;

      // Stock Aging Calculation
      let totalStockAgeDays = 0;
      let totalStockQtyForAging = 0;
      const agingBuckets = {
        "0-30 Days": 0,
        "31-90 Days": 0,
        "91-180 Days": 0,
        ">180 Days": 0,
      };

      inventory.forEach(item => {
        if (item.last_supply && item.qty > 0) {
          const lastSupplyDate = new Date(item.last_supply);
          const diffTime = Math.abs(new Date().getTime() - lastSupplyDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          totalStockAgeDays += diffDays * item.qty;
          totalStockQtyForAging += item.qty;

          if (diffDays <= 30) {
            agingBuckets["0-30 Days"] += item.qty;
          } else if (diffDays <= 90) {
            agingBuckets["31-90 Days"] += item.qty;
          } else if (diffDays <= 180) {
            agingBuckets["91-180 Days"] += item.qty;
          } else {
            agingBuckets[">180 Days"] += item.qty;
          }
        }
      });

      const avgStockAge = totalStockQtyForAging > 0 ? (totalStockAgeDays / totalStockQtyForAging) : 0;
      setStockAgingData(Object.entries(agingBuckets).map(([name, value]) => ({ name, value })));

      setStats({
        totalRacks: uniqueRacks,
        totalParts: totalPartsInBom,
        supplyToday,
        pickingToday,
        errorsToday,
        avgRackUtilization: parseFloat(avgRackUtilization.toFixed(1)),
        stockTurnoverRate: parseFloat(stockTurnoverRate.toFixed(2)),
        avgPickingTime: parseFloat(avgPickingTime.toFixed(1)),
        avgPutAwayTime: parseFloat(avgPutAwayTime.toFixed(1)),
        avgStockAge: parseFloat(avgStockAge.toFixed(1)), // Set average stock age
      });

      // Stock by rack
      const rackData = inventory
        .reduce((acc: any, item) => {
          const existing = acc.find((r: any) => r.rack_location === item.rack_location);
          if (existing) {
            existing.qty += item.qty;
          } else {
            acc.push({ rack_location: item.rack_location, qty: item.qty });
          }
          return acc;
        }, [])
        .sort((a: any, b: any) => b.qty - a.qty)
        .slice(0, 10);
      setStockByRack(rackData);
    }

    // Fetch Unset Part Data
    const { data: unsetDataRaw, error: unsetError } = await supabase
      .from("unset_part")
      .select('"Child Part", "Unset"');

    if (unsetError) {
      console.error("Error fetching unset part data:", unsetError);
    } else {
      const unsetData = unsetDataRaw as Tables<'unset_part'>[];
      setUnsetPartData(unsetData?.map(item => ({
        name: item["Child Part"],
        value: Math.floor(item["Unset"] || 0), // Ensure integer value
      })) || []);
    }

    // Error trend (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    if (allTransactions) {
      const trendData = last7Days.map((date) => {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const errors = allTransactions.filter(
          (t) =>
            t.is_error &&
            new Date(t.start_time) >= dayStart &&
            new Date(t.start_time) <= dayEnd
        ).length;

        return {
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          errors,
        };
      });
      setErrorTrend(trendData);

      // Most Accessed Locations (Heatmap)
      const locationAccessCounts: { [key: string]: number } = {};
      stockTransactions30Days?.forEach(tx => {
        if (tx.rack_location) {
          locationAccessCounts[tx.rack_location] = (locationAccessCounts[tx.rack_location] || 0) + 1;
        }
      });
      const sortedLocations = Object.entries(locationAccessCounts)
        .map(([location, count]) => ({ name: location, value: count }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10 most accessed
      setMostAccessedLocations(sortedLocations);
    }
  };

  const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            title="Total Racks"
            value={stats.totalRacks}
            icon={MapPin}
            description="Active locations"
          />
          <StatsCard
            title="Total Parts"
            value={stats.totalParts}
            icon={Package}
            description="Parts in BOM"
          />
          <StatsCard
            title="Supply Today"
            value={stats.supplyToday}
            icon={TrendingUp}
            description="Units added"
          />
          <StatsCard
            title="Picking Today"
            value={stats.pickingToday}
            icon={TrendingDown}
            description="Units picked"
          />
          <StatsCard
            title="Errors Today"
            value={stats.errorsToday}
            icon={AlertTriangle}
            description="Picking errors"
          />
        </div>

        {/* New Advanced Analytics Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Avg. Rack Utilization"
            value={`${stats.avgRackUtilization}%`}
            icon={LayoutGrid}
            description="Overall capacity used"
          />
          <StatsCard
            title="Stock Turnover Rate"
            value={stats.stockTurnoverRate.toFixed(2)}
            icon={RefreshCw}
            description="Last 30 days (picked/total stock)"
          />
          <StatsCard
            title="Avg. Picking Time"
            value={`${stats.avgPickingTime} sec`}
            icon={Clock}
            description="Last 30 days"
          />
          <StatsCard
            title="Avg. Put-away Time"
            value={`${stats.avgPutAwayTime} sec`}
            icon={Clock}
            description="Last 30 days"
          />
        </div>

        {/* Stock Aging Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            title="Avg. Stock Age"
            value={`${stats.avgStockAge} days`}
            icon={CalendarDays}
            description="Average age of current stock"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6"> {/* Changed to lg:grid-cols-6 */}
          <Card>
            <CardHeader>
              <CardTitle>Stock by Rack Location</CardTitle>
              <CardDescription>Top 10 locations by quantity</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stockByRack}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rack_location" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="qty" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unset Part Distribution</CardTitle>
              <CardDescription>Top 10 unset parts by quantity</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={unsetPartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {unsetPartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rack Utilization by Location</CardTitle>
              <CardDescription>Top 10 racks by utilization percentage</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rackUtilizationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rack_location" />
                  <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value: number) => [`${value}%`, "Utilization"]} />
                  <Bar dataKey="utilization" fill="hsl(var(--kobetsu))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock Aging Distribution</CardTitle>
              <CardDescription>Distribution of stock by age categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stockAgingData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name} (${entry.value})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stockAgingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Most Accessed Rack Locations</CardTitle>
              <CardDescription>Top 10 locations by transaction count (last 30 days)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mostAccessedLocations}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--picking))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Picking Error Trend</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={errorTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="errors"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
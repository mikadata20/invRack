import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Package, AlertTriangle, Search, Download, Filter } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types"; // Import Tables type

export interface InventoryItem {
  id: number;
  part_no: string;
  part_name: string;
  rack_location: string;
  qty: number;
  safety_stock: number | null;
  last_supply: string | null;
  last_picking: string | null;
  updated_at: string | null;
  qty_bom: number | null;
  qty_per_set: number | null;
  model: string | null;
  cyl: string | null;
  parent_part: string | null;
  sets: number | null; // Changed to number | null as per view definition
}

const StockManagement = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading, hasRole } = useUserRole();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [cylFilter, setCylFilter] = useState<string>("all");
  const [distinctModels, setDistinctModels] = useState<string[]>([]);
  const [distinctCyls, setDistinctCyls] = useState<string[]>([]);
  
  // State for physical stock adjustment dialog (still needed for the dialog logic, even if not triggered by a table button)
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !profile) {
      navigate("/auth");
    } else if (profile) {
      fetchInventory();
      fetchDistinctFilters();
    }
  }, [authLoading, profile, navigate, modelFilter, cylFilter]);

  const fetchDistinctFilters = async () => {
    try {
      const { data: modelsDataRaw, error: modelsError } = await supabase
        .from("bom_master")
        .select("model")
        .neq("model", "")
        .order("model", { ascending: true });

      if (modelsError) throw modelsError;
      const modelsData = modelsDataRaw as Tables<'bom_master'>[];
      const uniqueModels = [...new Set(modelsData?.map(item => item.model).filter(Boolean))] as string[];
      setDistinctModels(uniqueModels);

      const { data: cylsDataRaw, error: cylsError } = await supabase
        .from("bom_master")
        .select("cyl")
        .neq("cyl", "")
        .order("cyl", { ascending: true });

      if (cylsError) throw cylsError;
      const cylsData = cylsDataRaw as Tables<'bom_master'>[];
      const uniqueCyls = [...new Set(cylsData?.map(item => item.cyl).filter(Boolean))] as string[];
      setDistinctCyls(uniqueCyls);

    } catch (error: any) {
      toast.error("Error loading filter options", {
        description: error.message,
      });
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("enriched_rack_inventory")
        .select("*");

      if (modelFilter !== "all") {
        query = query.eq("model", modelFilter);
      }
      if (cylFilter !== "all") {
        query = query.eq("cyl", cylFilter);
      }

      const { data, error } = await query
        .order("rack_location", { ascending: true });

      if (error) throw error;

      setInventory((data as Tables<'enriched_rack_inventory'>[]) || []);
    } catch (error: any) {
      toast.error("Error loading inventory data", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!hasRole(["admin", "controller"])) {
      toast.error("You don't have permission to adjust stock");
      return;
    }

    if (!adjustReason.trim()) {
      toast.error("Please provide a reason for adjustment");
      return;
    }

    try {
      const newStock = (selectedStock?.qty || 0) + adjustQty;

      if (newStock < 0) {
        toast.error("Stock cannot be negative");
        return;
      }

      // 1. Update inventory (only rack_inventory table)
      const updateData: TablesUpdate<'rack_inventory'> = { qty: newStock };
      const { error: updateError } = await (supabase
        .from("rack_inventory")
        .update as any)(updateData) // Cast to any
        .eq("id", selectedStock?.id);

      if (updateError) throw updateError;

      // 2. Log adjustment (stock_adjustments table)
      const logAdjustData: TablesInsert<'stock_adjustments'> = {
        part_no: selectedStock?.part_no || "",
        part_name: selectedStock?.part_name || "",
        rack_location: selectedStock?.rack_location || "",
        current_stock: selectedStock?.qty || 0,
        adjust_qty: adjustQty,
        new_stock: newStock,
        reason: adjustReason,
        adjusted_by: profile?.id || null,
      };
      const { error: logAdjustError } = await (supabase.from("stock_adjustments").insert as any)(logAdjustData); // Cast to any

      if (logAdjustError) throw logAdjustError;

      // 3. Log activity (activity_log table)
      const activityLogData: TablesInsert<'activity_log'> = {
        user_id: profile?.id || null,
        username: profile?.username || "Unknown",
        action_type: "ADJUST_STOCK",
        table_name: "rack_inventory",
        record_id: selectedStock?.id?.toString() || null,
        old_data: { qty: selectedStock?.qty || 0 },
        new_data: { qty: newStock },
        description: `Adjusted stock for ${selectedStock?.part_no}: ${adjustQty > 0 ? '+' : ''}${adjustQty} (${adjustReason})`,
      };
      await (supabase.from("activity_log").insert as any)([activityLogData]); // Cast to any

      // 4. Record stock transaction for traceability (stock_transactions table)
      const transactionId = `ADJ-${Date.now()}-${selectedStock?.part_no}`;
      const stockTransactionPayload: TablesInsert<'stock_transactions'> = {
        transaction_id: transactionId,
        transaction_type: "ADJUSTMENT",
        item_code: selectedStock?.part_no || "",
        item_name: selectedStock?.part_name || "",
        qty: adjustQty,
        rack_location: selectedStock?.rack_location || "",
        source_location: "ADJUSTMENT",
        document_ref: adjustReason,
        user_id: profile?.id || null,
        username: profile?.username || "Unknown",
        timestamp: new Date().toISOString(),
      };
      await (supabase.from("stock_transactions").insert as any)(stockTransactionPayload); // Cast to any


      toast.success("Stock adjusted successfully");
      
      setIsAdjustDialogOpen(false);
      setAdjustQty(0);
      setAdjustReason("");
      fetchInventory();
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredInventory.map((item) => ({
      "Part No": item.part_no,
      "Part Name": item.part_name,
      "Rack Location": item.rack_location,
      "Model": item.model || "-",
      "Cyl": item.cyl || "-",
      "Parent Part": item.parent_part || "-",
      "Safety Stock": item.safety_stock,
      "Stock (Pcs)": item.qty,
      "Stock (Set)": Math.floor(item.sets || 0), // Ensure sets is a number before Math.floor
      "Last Supply": item.last_supply ? format(new Date(item.last_supply), "dd/MM/yyyy HH:mm") : "-",
      "Last Picking": item.last_picking ? format(new Date(item.last_picking), "dd/MM/yyyy HH:mm") : "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Inventory");
    XLSX.writeFile(workbook, `Stock_Inventory_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast.success("Inventory data exported successfully");
  };

  const openAdjustDialog = (stock: InventoryItem) => {
    setSelectedStock(stock);
    setAdjustQty(0);
    setAdjustReason("");
    setIsAdjustDialogOpen(true);
  };

  const filteredInventory = inventory.filter((item) =>
    Object.values(item).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Stock Management</h1>
          </div>
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <Input
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="modelFilter">Model</Label>
                <Select value={modelFilter} onValueChange={setModelFilter}>
                  <SelectTrigger id="modelFilter">
                    <SelectValue placeholder="Filter by Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    {distinctModels.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cylFilter">Cyl</Label>
                <Select value={cylFilter} onValueChange={setCylFilter}>
                  <SelectTrigger id="cylFilter">
                    <SelectValue placeholder="Filter by Cyl" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cyls</SelectItem>
                    {distinctCyls.map((cyl) => (
                      <SelectItem key={cyl} value={cyl}>
                        {cyl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setModelFilter("all");
                    setCylFilter("all");
                    setSearchTerm("");
                  }}
                  className="w-full"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part No</TableHead>
                    <TableHead>Part Name</TableHead>
                    <TableHead>Rack Location</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Cyl</TableHead>
                    <TableHead>Parent Part</TableHead>
                    <TableHead>Safety Stock</TableHead>
                    <TableHead>Stock (Pcs)</TableHead>
                    <TableHead>Stock (Set)</TableHead>
                    <TableHead>Last Supply</TableHead>
                    <TableHead>Last Picking</TableHead>
                    <TableHead>Status</TableHead>
                    {/* Removed Actions TableHead */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item) => {
                    const isBelowSafety = item.qty < (item.safety_stock || 0);
                    return (
                      <TableRow 
                        key={item.id} 
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => navigate(`/stock-transactions?rack=${item.rack_location}`)}
                      >
                        <TableCell>{item.part_no}</TableCell>
                        <TableCell>{item.part_name}</TableCell>
                        <TableCell className="font-semibold text-primary">{item.rack_location}</TableCell>
                        <TableCell>{item.model || "-"}</TableCell>
                        <TableCell>{item.cyl || "-"}</TableCell>
                        <TableCell>{item.parent_part || "-"}</TableCell>
                        <TableCell>{item.safety_stock}</TableCell>
                        <TableCell className={isBelowSafety ? "text-destructive font-semibold" : ""}>
                          {item.qty}
                        </TableCell>
                        <TableCell>{Math.floor(item.sets || 0)}</TableCell>
                        <TableCell>
                          {item.last_supply ? format(new Date(item.last_supply), "dd/MM/yyyy HH:mm") : "-"}
                        </TableCell>
                        <TableCell>
                          {item.last_picking ? format(new Date(item.last_picking), "dd/MM/yyyy HH:mm") : "-"}
                        </TableCell>
                        <TableCell>
                          {isBelowSafety ? (
                            <span className="flex items-center gap-1 text-destructive">
                              <AlertTriangle className="h-4 w-4" />
                              Low Stock
                            </span>
                          ) : (
                            <span className="text-green-600">OK</span>
                          )}
                        </TableCell>
                        {/* Removed Actions TableCell */}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StockManagement;
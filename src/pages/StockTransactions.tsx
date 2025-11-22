import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Added Label import
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, History, Search, TrendingUp, TrendingDown, CalendarDays } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import { DatePicker } from "@/components/DatePicker"; // Import the new DatePicker component

interface StockTransaction {
  id: number;
  transaction_id: string;
  transaction_type: "SUPPLY" | "PICKING" | "KOBETSU" | "ADJUSTMENT";
  item_code: string;
  item_name: string;
  qty: number;
  rack_location: string;
  source_location: string | null;
  document_ref: string | null;
  username: string;
  timestamp: string;
}

const StockTransactions = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rackFilter = searchParams.get("rack");
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchTransactions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("stock-transactions-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stock_transactions",
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rackFilter, startDate, endDate]); // Re-fetch when dates change

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("stock_transactions")
        .select("*");

      // Filter by rack location if provided
      if (rackFilter) {
        query = query.eq("rack_location", rackFilter);
      }

      // Filter by start date
      if (startDate) {
        query = query.gte("timestamp", startOfDay(startDate).toISOString());
      }

      // Filter by end date
      if (endDate) {
        query = query.lte("timestamp", endOfDay(endDate).toISOString());
      }

      const { data, error } = await query
        .order("timestamp", { ascending: false })
        .limit(200);

      if (error) throw error;
      setTransactions((data as StockTransaction[]) || []);
    } catch (error: any) {
      toast.error("Error loading transactions", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDateFilter = () => {
    fetchTransactions(); // Trigger re-fetch with new date filters
  };

  const filteredTransactions = transactions.filter(
    (tx) =>
      tx.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.rack_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "SUPPLY":
        return "bg-supply text-white";
      case "PICKING":
        return "bg-picking text-white";
      case "KOBETSU":
        return "bg-kobetsu text-white";
      case "ADJUSTMENT":
        return "bg-yellow-600 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-lg">
                <History className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>
                  Stock Traceability
                  {rackFilter && <span className="text-primary"> - Rack: {rackFilter}</span>}
                </CardTitle>
                <CardDescription>
                  Record transaksi IN/OUT untuk pelacakan material
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Cari berdasarkan ID, Item Code, Nama, Lokasi, atau User..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
              <div className="space-y-1">
                <Label htmlFor="startDate">Start Date</Label>
                <DatePicker
                  date={startDate}
                  setDate={setStartDate}
                  placeholder="Pilih tanggal mulai"
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate">End Date</Label>
                <DatePicker
                  date={endDate}
                  setDate={setEndDate}
                  placeholder="Pilih tanggal akhir"
                  className="w-full"
                />
              </div>
              <Button onClick={handleApplyDateFilter} className="w-full sm:w-auto">
                <CalendarDays className="mr-2 h-4 w-4" />
                Apply Date Filter
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading transactions...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || startDate || endDate
                  ? "Tidak ada transaksi ditemukan dengan filter ini"
                  : "Belum ada transaksi"}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Rack Location</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Doc Ref</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-xs">
                          {format(new Date(tx.timestamp), "dd/MM/yy HH:mm:ss")}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {tx.transaction_id}
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeBadgeColor(tx.transaction_type)}>
                            {tx.transaction_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {tx.item_code}
                        </TableCell>
                        <TableCell>{tx.item_name}</TableCell>
                        <TableCell className="text-right font-semibold">
                          <div className="flex items-center justify-end gap-1">
                            {tx.qty > 0 ? (
                              <>
                                <TrendingUp className="h-3 w-3 text-green-600" />
                                <span className="text-green-600">+{tx.qty}</span>
                              </>
                            ) : (
                              <>
                                <TrendingDown className="h-3 w-3 text-red-600" />
                                <span className="text-red-600">{tx.qty}</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {tx.rack_location}
                        </TableCell>
                        <TableCell className="text-xs">
                          {tx.username}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tx.document_ref || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="text-xs text-muted-foreground text-center">
              Menampilkan {filteredTransactions.length} dari {transactions.length} transaksi
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StockTransactions;
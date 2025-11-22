import { useEffect, useState } from "react";
import { useNavigate }
from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Box, Search, Download } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge"; // Import Badge component
import { Tables } from "@/integrations/supabase/types"; // Import Tables type

interface KdUnsetItem {
  "Parent Part": string | null;
  "Child Part": string | null;
  "Part Name": string | null;
  "Qty Set": number | null;
  "Qty Min": number | null;
  "Unset": number | null;
  "Status": string | null;
}

const KdUnset = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useUserRole();
  const [kdUnsets, setKdUnsets] = useState<KdUnsetItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !profile) {
      navigate("/auth");
    } else if (profile) {
      fetchKdUnsets();
    }
  }, [authLoading, profile, navigate]);

  const fetchKdUnsets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("unset_part")
      .select("*")
      .order("Parent Part", { ascending: true }) as { data: Tables<'unset_part'>[] | null; error: any };

    if (error) {
      toast.error("Error loading KD Unset data", { description: error.message });
    } else {
      setKdUnsets((data as KdUnsetItem[]) || []);
    }
    setLoading(false);
  };

  const filteredKdUnsets = kdUnsets.filter((item) =>
    Object.values(item).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getStatusBadgeColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "over":
        return "bg-green-500 text-white";
      case "loss":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredKdUnsets.map((item) => ({
      "Parent Part": item["Parent Part"] || "-",
      "Child Part": item["Child Part"] || "-",
      "Part Name": item["Part Name"] || "-",
      "Qty Set": item["Qty Set"] !== null ? Math.floor(item["Qty Set"]) : "-", // Rounded for export
      "Qty Min": item["Qty Min"] !== null ? Math.floor(item["Qty Min"]) : "-", // Rounded for export
      "Unset": item["Unset"] !== null ? Math.floor(item["Unset"]) : "-", // Rounded for export
      "Status": item["Status"] || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "KD Unset Summary");
    XLSX.writeFile(workbook, `KD_Unset_Summary_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast.success("KD Unset data exported successfully");
  };

  if (authLoading || loading) {
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
            <h1 className="text-xl font-bold">KD Unset Summary</h1>
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
            <div className="flex items-center gap-4">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search KD Unsets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parent Part</TableHead>
                    <TableHead>Child Part</TableHead>
                    <TableHead>Part Name</TableHead>
                    <TableHead className="text-right">Qty Set</TableHead>
                    <TableHead className="text-right">Qty Min</TableHead>
                    <TableHead className="text-right">Unset</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKdUnsets.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item["Parent Part"] || "-"}</TableCell>
                      <TableCell>{item["Child Part"] || "-"}</TableCell>
                      <TableCell>{item["Part Name"] || "-"}</TableCell>
                      <TableCell className="text-right">{item["Qty Set"] !== null ? Math.floor(item["Qty Set"]) : "-"}</TableCell> {/* Rounded */}
                      <TableCell className="text-right">{item["Qty Min"] !== null ? Math.floor(item["Qty Min"]) : "-"}</TableCell> {/* Rounded */}
                      <TableCell className="text-right">{item["Unset"] !== null ? Math.floor(item["Unset"]) : "-"}</TableCell> {/* Rounded */}
                      <TableCell>
                        <Badge className={getStatusBadgeColor(item["Status"])}>
                          {item["Status"] || "-"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredKdUnsets.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-4">No KD Unset data found.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default KdUnset;
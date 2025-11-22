import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Box, Search, Eye } from "lucide-react"; // Import Eye icon
import { useUserRole } from "@/hooks/useUserRole";
import KdSetDetailDialog from "@/components/kd-set/KdSetDetailDialog"; // Import the new dialog component
import { Tables } from "@/integrations/supabase/types"; // Import Tables type

interface KdSetItem {
  model: string | null;
  cyl: string | null;
  parent_part: string | null;
  qty_min: number | null;
  qty_max: number | null;
}

const KdSet = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useUserRole();
  const [kdSets, setKdSets] = useState<KdSetItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedKdSetItem, setSelectedKdSetItem] = useState<KdSetItem | null>(null);

  useEffect(() => {
    if (!authLoading && !profile) {
      navigate("/auth");
    } else if (profile) {
      fetchKdSets();
    }
  }, [authLoading, profile, navigate]);

  const fetchKdSets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("kd_set_summary")
      .select("*") as { data: Tables<'kd_set_summary'>[] | null; error: any };

    if (error) {
      toast.error("Error loading KD Set data", { description: error.message });
    } else {
      setKdSets((data as KdSetItem[]) || []);
    }
    setLoading(false);
  };

  const filteredKdSets = kdSets.filter((item) =>
    Object.values(item).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleViewDetails = (item: KdSetItem) => {
    setSelectedKdSetItem(item);
    setIsDetailDialogOpen(true);
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
            <h1 className="text-xl font-bold">KD Set Summary</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search KD Sets..."
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
                    <TableHead>Model</TableHead>
                    <TableHead>Cyl</TableHead>
                    <TableHead>KD Part No.</TableHead>
                    <TableHead className="text-right">Qty Min</TableHead>
                    <TableHead className="text-right">Qty Max</TableHead>
                    <TableHead className="text-center">Actions</TableHead> {/* New Actions column */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKdSets.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.model || "-"}</TableCell>
                      <TableCell>{item.cyl || "-"}</TableCell>
                      <TableCell>{item.parent_part || "-"}</TableCell>
                      <TableCell className="text-right">{item.qty_min !== null ? Math.floor(item.qty_min) : "-"}</TableCell>
                      <TableCell className="text-right">{item.qty_max !== null ? Math.floor(item.qty_max) : "-"}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(item)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredKdSets.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-4">No KD Set data found.</p>
            )}
          </CardContent>
        </Card>
      </main>

      {/* KD Set Detail Dialog */}
      <KdSetDetailDialog
        isOpen={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        kdSetItem={selectedKdSetItem}
      />
    </div>
  );
};

export default KdSet;
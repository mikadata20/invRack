import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Import Table components
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"; // Import ToggleGroup
import { toast } from "sonner";
import { ArrowLeft, LayoutGrid, Search, Filter, List, Grid, AlertTriangle } from "lucide-react"; // Import List and Grid icons
import { useUserRole } from "@/hooks/useUserRole";
import RackCard from "@/components/rack-map/RackCard"; // Import the new RackCard component
import { cn } from "@/lib/utils"; // Import cn for conditional classNames
import { Badge } from "@/components/ui/badge"; // Import Badge for status
import { Tables } from "@/integrations/supabase/types"; // Import Tables type

interface RackItemDetail {
  parent_part: string | null;
  child_part: string | null;
  part_name: string | null;
  sets: number | null;
  qty: number | null; // Current physical quantity
  safety_stock: number | null;
  model: string | null;
  cyl: string | null;
}

interface AggregatedRackItem {
  rack_location: string;
  items: RackItemDetail[];
}

const RackMap = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useUserRole();
  const [rackData, setRackData] = useState<AggregatedRackItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [parentPartFilter, setParentPartFilter] = useState<string>("all");
  const [distinctModels, setDistinctModels] = useState<string[]>([]);
  const [distinctParentParts, setDistinctParentParts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"card" | "list">("card"); // New state for view mode

  useEffect(() => {
    if (!authLoading && !profile) {
      navigate("/auth");
    } else if (profile) {
      fetchDistinctFilters();
      fetchRackData(); // Initial fetch

      // Setup real-time subscription
      const channel = supabase
        .channel('rack_inventory_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rack_inventory'
          },
          (payload) => {
            console.log('Rack inventory change detected:', payload);
            fetchRackData(); // Re-fetch data on any change
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel); // Cleanup subscription on unmount
      };
    }
  }, [authLoading, profile, navigate, modelFilter, parentPartFilter]); // Re-fetch when filters change

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

      const { data: parentPartsDataRaw, error: parentPartsError } = await supabase
        .from("bom_master")
        .select("parent_part")
        .neq("parent_part", "")
        .order("parent_part", { ascending: true });
      if (parentPartsError) throw parentPartsError;
      const parentPartsData = parentPartsDataRaw as Tables<'bom_master'>[];
      const uniqueParentParts = [...new Set(parentPartsData?.map(item => item.parent_part).filter(Boolean))] as string[];
      setDistinctParentParts(uniqueParentParts);

    } catch (error: any) {
      toast.error("Error loading filter options", { description: error.message });
    }
  };

  const fetchRackData = async () => {
    setLoading(true);
    try {
      let query = supabase.from("enriched_rack_inventory").select("*");

      if (modelFilter !== "all") {
        query = query.eq("model", modelFilter);
      }
      if (parentPartFilter !== "all") {
        query = query.eq("parent_part", parentPartFilter);
      }

      const { data, error } = await query.order("rack_location", { ascending: true });

      if (error) throw error;

      const aggregatedData: { [key: string]: AggregatedRackItem } = {};

      (data as Tables<'enriched_rack_inventory'>[]).forEach((item) => {
        if (item.rack_location) {
          if (!aggregatedData[item.rack_location]) {
            aggregatedData[item.rack_location] = {
              rack_location: item.rack_location,
              items: [],
            };
          }
          aggregatedData[item.rack_location].items.push({
            parent_part: item.parent_part,
            child_part: item.part_no, // child_part is part_no in enriched_rack_inventory
            part_name: item.part_name,
            sets: item.sets,
            qty: item.qty,
            safety_stock: item.safety_stock,
            model: item.model,
            cyl: item.cyl,
          });
        }
      });

      const sortedAggregatedData = Object.values(aggregatedData).sort((a, b) =>
        a.rack_location.localeCompare(b.rack_location)
      );

      setRackData(sortedAggregatedData);
    } catch (error: any) {
      toast.error("Error loading rack map data", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredRackData = rackData.filter((rack) =>
    rack.rack_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rack.items.some(item =>
      (item.parent_part?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.child_part?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.part_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

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
            <h1 className="text-xl font-bold">Rack Map</h1>
          </div>
          <ToggleGroup type="single" value={viewMode} onValueChange={(value: "card" | "list") => value && setViewMode(value)} className="hidden sm:flex">
            <ToggleGroupItem value="card" aria-label="Toggle card view">
              <Grid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="Toggle list view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <Input
                placeholder="Search rack location or part..."
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
                <Label htmlFor="parentPartFilter">Parent Part</Label>
                <Select value={parentPartFilter} onValueChange={setParentPartFilter}>
                  <SelectTrigger id="parentPartFilter">
                    <SelectValue placeholder="Filter by Parent Part" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Parent Parts</SelectItem>
                    {distinctParentParts.map((parentPart) => (
                      <SelectItem key={parentPart} value={parentPart}>
                        {parentPart}
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
                    setParentPartFilter("all");
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
            {filteredRackData.length === 0 && !loading ? (
              <p className="text-center text-muted-foreground py-8">No rack data found matching your criteria.</p>
            ) : viewMode === "card" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"> {/* Changed lg:grid-cols-3 to lg:grid-cols-4 */}
                {filteredRackData.map((rack) => (
                  <RackCard key={rack.rack_location} rackLocation={rack.rack_location} items={rack.items} />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rack Location</TableHead>
                      <TableHead>Parent Part</TableHead>
                      <TableHead>Child Part</TableHead>
                      <TableHead>Part Name</TableHead>
                      <TableHead className="text-right">Sets</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Min Stock</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Cyl</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRackData.flatMap((rack) =>
                      rack.items.map((item, index) => {
                        const isLowStock = item.qty !== null && item.safety_stock !== null && item.qty < item.safety_stock;
                        return (
                          <TableRow key={`${rack.rack_location}-${item.child_part}-${index}`}>
                            <TableCell className="font-semibold">{rack.rack_location}</TableCell>
                            <TableCell>{item.parent_part || "-"}</TableCell>
                            <TableCell>{item.child_part || "-"}</TableCell>
                            <TableCell>{item.part_name || "-"}</TableCell>
                            <TableCell className="text-right">{Math.floor(item.sets || 0)}</TableCell>
                            <TableCell className={cn("text-right", isLowStock ? "text-destructive font-bold" : "")}>
                              {item.qty || 0}
                            </TableCell>
                            <TableCell className="text-right">{item.safety_stock || "-"}</TableCell>
                            <TableCell>{item.model || "-"}</TableCell>
                            <TableCell>{item.cyl || "-"}</TableCell>
                            <TableCell>
                              {isLowStock ? (
                                <Badge variant="destructive" className="flex items-center justify-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> Low
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-500 text-white flex items-center justify-center">OK</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RackMap;
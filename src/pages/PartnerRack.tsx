import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Plus, Search, Map, Download, Upload } from "lucide-react";
import PartnerRackFormDialog, { PartnerRackData } from "@/components/partner-rack/PartnerRackFormDialog";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const PartnerRack = () => {
    const [items, setItems] = useState<PartnerRackData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PartnerRackData | null>(null);
    const { toast } = useToast();

    const fetchItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("partner_rack")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setItems(data as PartnerRackData[]);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error fetching data",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleAdd = () => {
        setEditingItem(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (item: PartnerRackData) => {
        setEditingItem(item);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this entry?")) return;

        try {
            const { error } = await supabase
                .from("partner_rack")
                .delete()
                .eq("id", id);

            if (error) throw error;

            toast({
                title: "Success",
                description: "Entry deleted successfully",
            });
            fetchItems();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error deleting entry",
                description: error.message,
            });
        }
    };

    const handleSubmit = async (data: PartnerRackData) => {
        try {
            if (editingItem?.id) {
                const { error } = await supabase
                    .from("partner_rack")
                    .update({
                        part_no: data.part_no,
                        part_name: data.part_name,
                        qty_per_box: data.qty_per_box,
                        type: data.type,
                        rack_location: data.rack_location,
                        updated_at: new Date().toISOString(),
                    } as any)
                    .eq("id", editingItem.id);

                if (error) throw error;
                toast({ title: "Success", description: "Entry updated successfully" });
            } else {
                const { error } = await supabase
                    .from("partner_rack")
                    .insert({
                        part_no: data.part_no,
                        part_name: data.part_name,
                        qty_per_box: data.qty_per_box,
                        type: data.type,
                        rack_location: data.rack_location,
                    } as any);

                if (error) throw error;
                toast({ title: "Success", description: "Entry created successfully" });
            }
            fetchItems();
            return true;
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error saving entry",
                description: error.message,
            });
            return false;
        }
    };

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(
            items.map((item) => ({
                "Part No": item.part_no,
                "Part Name": item.part_name,
                "Qty/Box": item.qty_per_box,
                Type: item.type,
                Location: item.rack_location,
            }))
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Partner Rack");
        XLSX.writeFile(wb, "PartnerRack_Data.xlsx");
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                let successCount = 0;
                let failCount = 0;

                setLoading(true);

                for (const row of data as any[]) {
                    // Normalize keys
                    const partNo = row["Part No"] || row["part_no"];
                    const partName = row["Part Name"] || row["part_name"];
                    const location = row["Location"] || row["rack_location"] || row["Rack Location"];
                    const qty = row["Qty/Box"] || row["qty_per_box"] || 0;
                    const type = row["Type"] || row["type"];

                    if (!partNo || !location) {
                        failCount++;
                        continue;
                    }

                    const { error } = await supabase.from("partner_rack").insert({
                        part_no: partNo,
                        part_name: partName || "Imported Part",
                        qty_per_box: parseInt(qty) || 0,
                        type: type === "Big" || type === "Small" ? type : null,
                        rack_location: location,
                    } as any);

                    if (error) {
                        console.error("Import error:", error);
                        failCount++;
                    } else {
                        successCount++;
                    }
                }

                toast({
                    title: "Import Completed",
                    description: `Success: ${successCount}, Failed: ${failCount}`,
                    variant: failCount > 0 ? "destructive" : "default",
                });
                fetchItems();
            } catch (error: any) {
                toast({
                    variant: "destructive",
                    title: "Import Error",
                    description: error.message,
                });
            } finally {
                setLoading(false);
                // Reset input
                e.target.value = "";
            }
        };
        reader.readAsBinaryString(file);
    };

    const filteredItems = items.filter(
        (item) =>
            item.part_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.rack_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.part_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Partner Rack</h1>
                    <p className="text-muted-foreground">Manage part locations and standard packs.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleImport}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            title="Import Excel"
                        />
                        <Button variant="outline">
                            <Upload className="mr-2 h-4 w-4" /> Import Excel
                        </Button>
                    </div>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" /> Export Excel
                    </Button>
                    <Button onClick={handleAdd}>
                        <Plus className="mr-2 h-4 w-4" /> Add Entry
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Rack Entries</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by Part No, Name or Location..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Part No</TableHead>
                                    <TableHead>Part Name</TableHead>
                                    <TableHead>Qty/Box</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-4">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                                            No entries found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredItems.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.part_no}</TableCell>
                                            <TableCell>{item.part_name}</TableCell>
                                            <TableCell>{item.qty_per_box}</TableCell>
                                            <TableCell>
                                                {item.type && (
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs ${item.type === "Big"
                                                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                                            }`}
                                                    >
                                                        {item.type}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Map className="h-3 w-3 text-muted-foreground" />
                                                    {item.rack_location}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(item)}
                                                        title="Edit"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => item.id && handleDelete(item.id)}
                                                        className="text-destructive hover:text-destructive/90"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <PartnerRackFormDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingItem={editingItem}
                onSubmit={handleSubmit}
            />
        </div >
    );
};

export default PartnerRack;

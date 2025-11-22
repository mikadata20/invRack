import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Play, Plus, Trash2, AlertCircle, CheckCircle, FileSpreadsheet, Info, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { Tables } from "@/integrations/supabase/types";

interface ProductionPlanItem {
    id: string;
    date: string;
    shift: string;
    model: string;
    cyl: string;
    parentPart: string;
    qty: number;
    planStatus: "OPEN" | "CLOSE";
    status: "PENDING" | "OK" | "SHORTAGE" | "SKIPPED";
    shortageDetails?: string[];
}

const DailyProductionPlan = () => {
    const navigate = useNavigate();
    const { profile, loading: authLoading } = useUserRole();

    const [planItems, setPlanItems] = useState<ProductionPlanItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedShortageItem, setSelectedShortageItem] = useState<ProductionPlanItem | null>(null);
    const [isInputModalOpen, setIsInputModalOpen] = useState(false);

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [shift, setShift] = useState("1");
    const [model, setModel] = useState("");
    const [cyl, setCyl] = useState("");
    const [parentPart, setParentPart] = useState("");
    const [qty, setQty] = useState<number>(1);
    const [planStatus, setPlanStatus] = useState<"OPEN" | "CLOSE">("OPEN");

    useEffect(() => {
        if (!authLoading && !profile) {
            navigate("/auth");
        }
    }, [authLoading, profile, navigate]);

    const handleAddItem = () => {
        if (!parentPart || !qty || !date || !shift) {
            toast.error("Mohon lengkapi data");
            return;
        }

        const newItem: ProductionPlanItem = {
            id: crypto.randomUUID(),
            date,
            shift,
            model: model.toUpperCase(),
            cyl: cyl.toUpperCase(),
            parentPart: parentPart.toUpperCase(),
            qty,
            planStatus,
            status: "PENDING"
        };

        setPlanItems([...planItems, newItem]);
        setParentPart("");
        setQty(1);
        // Keep date, shift, model, cyl, planStatus as they might be same for next item
        toast.success("Item ditambahkan");
        setIsInputModalOpen(false);
    };

    const handleDeleteItem = (id: string) => {
        setPlanItems(planItems.filter(item => item.id !== id));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                const newItems: ProductionPlanItem[] = data.map((row: any) => ({
                    id: crypto.randomUUID(),
                    date: row['Date'] || row['Tanggal'] || new Date().toISOString().split('T')[0],
                    shift: String(row['Shift'] || "1"),
                    model: String(row['Model'] || "").toUpperCase(),
                    cyl: String(row['Cyl'] || "").toUpperCase(),
                    parentPart: String(row['Parent Part'] || row['Part No'] || "").toUpperCase(),
                    qty: Number(row['Qty'] || row['Quantity'] || 0),
                    planStatus: (row['Status'] && String(row['Status']).toUpperCase() === "CLOSE") ? "CLOSE" : "OPEN",
                    status: "PENDING" as const
                })).filter(item => item.parentPart && item.qty > 0);

                setPlanItems(prev => [...prev, ...newItems]);
                toast.success(`${newItems.length} item diimport`);
            } catch (error) {
                console.error("Error parsing Excel:", error);
                toast.error("Gagal membaca file Excel");
            }
        };
        reader.readAsBinaryString(file);
    };

    const checkStockForPlan = async () => {
        if (planItems.length === 0) return;
        setLoading(true);

        const updatedItems = [...planItems];

        try {
            for (let i = 0; i < updatedItems.length; i++) {
                const item = updatedItems[i];

                // Skip if Plan Status is CLOSE
                if (item.planStatus === "CLOSE") {
                    updatedItems[i].status = "SKIPPED";
                    updatedItems[i].shortageDetails = [];
                    continue;
                }

                // 1. Get BOM
                const { data: bomData, error: bomError } = await supabase
                    .from("bom_master")
                    .select("*")
                    .eq("parent_part", item.parentPart);

                if (bomError) {
                    console.error(`Error fetching BOM for ${item.parentPart}`, bomError);
                    continue;
                }

                if (!bomData || bomData.length === 0) {
                    updatedItems[i].status = "SHORTAGE";
                    updatedItems[i].shortageDetails = ["BOM not found"];
                    continue;
                }

                let isShortage = false;
                const missingParts: string[] = [];
                const boms = bomData as Tables<'bom_master'>[];

                // 2. Check stock for each child part
                for (const bomItem of boms) {
                    const requiredQty = bomItem.qty_per_set * item.qty;

                    const { data: stockData } = await supabase
                        .from("rack_inventory")
                        .select("qty")
                        .eq("part_no", bomItem.child_part)
                        .maybeSingle();

                    const currentStock = stockData?.qty || 0;

                    if (currentStock < requiredQty) {
                        isShortage = true;
                        // Include Part Name in the details
                        missingParts.push(`${bomItem.child_part} - ${bomItem.part_name || 'No Name'} (Butuh: ${requiredQty}, Stok: ${currentStock})`);
                    }
                }

                updatedItems[i].status = isShortage ? "SHORTAGE" : "OK";
                updatedItems[i].shortageDetails = missingParts;
            }

            setPlanItems(updatedItems);
            toast.success("Pengecekan stok selesai");

        } catch (error) {
            console.error("Error checking stock:", error);
            toast.error("Terjadi kesalahan saat mengecek stok");
        } finally {
            setLoading(false);
        }
    };

    const handleParentPartBlur = async () => {
        if (!parentPart) return;

        try {
            const { data, error } = await supabase
                .from("bom_master")
                .select("model, cyl")
                .eq("parent_part", parentPart)
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error("Error fetching part details:", error);
                return;
            }

            if (data) {
                if (data.model) setModel(data.model);
                if (data.cyl) setCyl(data.cyl);
                toast.success(`Auto-filled: ${data.model} / ${data.cyl}`);
            } else {
                // Optional: Clear model/cyl if not found? Or keep manual input?
                // toast.warning("Parent part tidak ditemukan di BOM Master");
            }
        } catch (err) {
            console.error("Error in auto-fill:", err);
        }
    };

    const handleDebug = async () => {
        const part = "B6415-69372";
        const { data, error } = await supabase
            .from("bom_master")
            .select("model, cyl")
            .eq("parent_part", part)
            .limit(1)
            .maybeSingle();

        if (data) {
            toast.info(`Debug: Model=${data.model}, Cyl=${data.cyl}`);
            console.log("Debug Data:", data);
        } else {
            toast.error("Debug: Part not found or error");
            console.error(error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <FileSpreadsheet className="h-8 w-8 text-primary" />
                                Daily Production Plan
                            </h1>
                            <p className="text-muted-foreground">
                                Input rencana produksi dan cek ketersediaan stok
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleDebug}>Debug DB</Button>
                    </div>
                </div>

                {/* Toolbar Actions */}
                <Card>
                    <CardContent className="p-4 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-2">
                            <Button onClick={() => setIsInputModalOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" /> Tambah Data
                            </Button>
                            <div className="relative">
                                <Input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                                <Button variant="outline">
                                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Import Excel
                                </Button>
                            </div>
                        </div>

                        <Button
                            onClick={checkStockForPlan}
                            disabled={loading || planItems.length === 0}
                            variant="secondary"
                            className="min-w-[150px]"
                        >
                            {loading ? "Mengecek..." : (
                                <>
                                    <Play className="h-4 w-4 mr-2" /> Cek Stok Batch
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Plan Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Daftar Rencana Produksi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Shift</TableHead>
                                    <TableHead>Model</TableHead>
                                    <TableHead>Cyl</TableHead>
                                    <TableHead>Parent Part</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead>Plan Status</TableHead>
                                    <TableHead>Stock Status</TableHead>
                                    <TableHead>Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {planItems.map((item) => (
                                    <TableRow key={item.id} className={item.status === "SHORTAGE" ? "bg-red-50 dark:bg-red-900/10" : ""}>
                                        <TableCell>{item.date}</TableCell>
                                        <TableCell>{item.shift}</TableCell>
                                        <TableCell>{item.model}</TableCell>
                                        <TableCell>{item.cyl}</TableCell>
                                        <TableCell className="font-medium">{item.parentPart}</TableCell>
                                        <TableCell>{item.qty}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.planStatus === "OPEN"
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                                }`}>
                                                {item.planStatus}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {item.status === "OK" && (
                                                <span className="inline-flex items-center gap-1 text-green-600 font-bold">
                                                    <CheckCircle className="h-4 w-4" /> OK
                                                </span>
                                            )}
                                            {item.status === "SHORTAGE" && (
                                                <div
                                                    className="flex flex-col cursor-pointer hover:opacity-80"
                                                    onClick={() => setSelectedShortageItem(item)}
                                                >
                                                    <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                                                        <AlertCircle className="h-4 w-4" /> SHORTAGE
                                                    </span>
                                                    {item.shortageDetails && (
                                                        <span className="text-xs text-red-500 mt-1 underline flex items-center gap-1">
                                                            <Info className="h-3 w-3" />
                                                            Lihat {item.shortageDetails.length} item kurang
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {item.status === "SKIPPED" && (
                                                <span className="text-muted-foreground italic">Skipped (Closed)</span>
                                            )}
                                            {item.status === "PENDING" && (
                                                <span className="text-muted-foreground">Pending</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {planItems.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                            Belum ada rencana produksi.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Input Modal */}
                <Dialog open={isInputModalOpen} onOpenChange={setIsInputModalOpen}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Input Rencana Produksi</DialogTitle>
                            <DialogDescription>
                                Masukkan detail rencana produksi baru.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tanggal</Label>
                                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Shift</Label>
                                    <Input value={shift} onChange={e => setShift(e.target.value)} />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>Parent Part</Label>
                                    <div className="relative">
                                        <Input
                                            value={parentPart}
                                            onChange={e => setParentPart(e.target.value.toUpperCase())}
                                            onBlur={handleParentPartBlur}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    handleParentPartBlur();
                                                }
                                            }}
                                            placeholder="Scan atau ketik Parent Part..."
                                            className="pr-10"
                                        />
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="absolute right-0 top-0 h-full text-muted-foreground hover:text-primary"
                                            onClick={handleParentPartBlur}
                                        >
                                            <Search className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Model</Label>
                                    <Input value={model} onChange={e => setModel(e.target.value)} placeholder="Auto-fill..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Cyl</Label>
                                    <Input value={cyl} onChange={e => setCyl(e.target.value)} placeholder="Auto-fill..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Qty</Label>
                                    <Input type="number" min="1" value={qty} onChange={e => setQty(parseInt(e.target.value) || 0)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Status Plan</Label>
                                    <Select value={planStatus} onValueChange={(v: "OPEN" | "CLOSE") => setPlanStatus(v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="OPEN">OPEN</SelectItem>
                                            <SelectItem value="CLOSE">CLOSE</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsInputModalOpen(false)}>Batal</Button>
                            <Button onClick={handleAddItem}>Simpan</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Shortage Details Dialog */}
                <Dialog open={!!selectedShortageItem} onOpenChange={(open) => !open && setSelectedShortageItem(null)}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                <AlertCircle className="h-5 w-5" />
                                Detail Kekurangan Stok
                            </DialogTitle>
                            <DialogDescription>
                                Daftar part yang kurang untuk produksi <strong>{selectedShortageItem?.parentPart}</strong> (Qty: {selectedShortageItem?.qty})
                            </DialogDescription>
                        </DialogHeader>

                        <div className="max-h-[60vh] overflow-y-auto border rounded-md p-4 bg-muted/50">
                            {selectedShortageItem?.shortageDetails && selectedShortageItem.shortageDetails.length > 0 ? (
                                <ul className="space-y-3">
                                    {selectedShortageItem.shortageDetails.map((detail, idx) => (
                                        <li key={idx} className="text-sm flex items-start gap-2 bg-background p-2 rounded border border-red-100">
                                            <div className="h-2 w-2 mt-1.5 rounded-full bg-red-500 shrink-0" />
                                            <span className="text-foreground/90">{detail}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Tidak ada detail kekurangan.
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="secondary" onClick={() => setSelectedShortageItem(null)}>
                                Tutup
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default DailyProductionPlan;

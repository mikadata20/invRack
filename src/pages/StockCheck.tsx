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
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Search, CheckCircle, AlertCircle, PackageSearch } from "lucide-react";
import QrScanner from "@/components/QrScanner";
import CountScanner from "@/components/CountScanner"; // Import CountScanner

interface StockCheckResult {
    childPart: string;
    partName: string;
    qtyPerSet: number;
    requiredQty: number;
    currentStock: number;
    rackLocation: string;
    status: "OK" | "SHORTAGE";
}

const StockCheck = () => {
    const navigate = useNavigate();
    const { profile, loading: authLoading } = useUserRole();

    const [parentPart, setParentPart] = useState("");
    const [qtyToProduce, setQtyToProduce] = useState<number>(1);
    const [isQtyDialogOpen, setIsQtyDialogOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isCountScannerOpen, setIsCountScannerOpen] = useState(false); // State for CountScanner
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<StockCheckResult[] | null>(null);
    const [checkedParentPart, setCheckedParentPart] = useState("");
    const [checkedQty, setCheckedQty] = useState(0);

    useEffect(() => {
        if (!authLoading && !profile) {
            navigate("/auth");
        }
    }, [authLoading, profile, navigate]);

    const handleScanClick = () => {
        setIsScannerOpen(true);
    };

    const handleScanSuccess = (decodedText: string) => {
        setParentPart(decodedText.toUpperCase());
        setIsScannerOpen(false);
        // Automatically open qty dialog after scan
        setIsQtyDialogOpen(true);
    };

    const handleCheckClick = () => {
        if (!parentPart.trim()) {
            toast.error("Masukkan Parent Part terlebih dahulu");
            return;
        }
        setIsQtyDialogOpen(true);
    };

    const performStockCheck = async () => {
        if (!parentPart.trim() || qtyToProduce <= 0) return;

        setLoading(true);
        setIsQtyDialogOpen(false);
        setResults(null);

        try {
            // 1. Get BOM for the parent part
            const { data: bomData, error: bomError } = await supabase
                .from("bom_master")
                .select("*")
                .eq("parent_part", parentPart);

            if (bomError) throw bomError;

            if (!bomData || bomData.length === 0) {
                toast.error("BOM tidak ditemukan untuk Parent Part ini");
                setLoading(false);
                return;
            }

            // 2. Calculate requirements and check stock
            const checkResults: StockCheckResult[] = [];
            const boms = bomData as Tables<'bom_master'>[];

            for (const item of boms) {
                const requiredQty = item.qty_per_set * qtyToProduce;

                // Get current stock from rack_inventory
                // Note: Assuming part_no in rack_inventory matches child_part in bom_master
                const { data: stockData, error: stockError } = await supabase
                    .from("rack_inventory")
                    .select("qty, rack_location")
                    .eq("part_no", item.child_part)
                    .maybeSingle();

                if (stockError) {
                    console.error(`Error checking stock for ${item.child_part}:`, stockError);
                }

                const currentStock = stockData?.qty || 0;
                const rackLocation = stockData?.rack_location || "-";

                checkResults.push({
                    childPart: item.child_part,
                    partName: item.part_name,
                    qtyPerSet: item.qty_per_set,
                    requiredQty: requiredQty,
                    currentStock: currentStock,
                    rackLocation: rackLocation,
                    status: currentStock >= requiredQty ? "OK" : "SHORTAGE",
                });
            }

            setResults(checkResults);
            setCheckedParentPart(parentPart);
            setCheckedQty(qtyToProduce);
            toast.success("Pengecekan stok selesai");

        } catch (error: any) {
            console.error("Error performing stock check:", error);
            toast.error("Terjadi kesalahan saat mengecek stok", { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleCheckClick();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <PackageSearch className="h-8 w-8 text-primary" />
                            Pengecekan Stok Produksi
                        </h1>
                        <p className="text-muted-foreground">
                            Cek ketersediaan part untuk rencana produksi
                        </p>
                    </div>
                </div>

                {/* Input Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Input Parent Part</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Scan atau ketik Parent Part..."
                                    value={parentPart}
                                    onChange={(e) => setParentPart(e.target.value.toUpperCase())}
                                    onKeyDown={handleKeyDown}
                                    className="pl-8"
                                />
                            </div>
                            <Button onClick={handleScanClick} variant="outline">
                                Scan QR
                            </Button>
                            <Button onClick={handleCheckClick} disabled={loading}>
                                {loading ? "Mengecek..." : "Cek Stok"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Results Section */}
                {results && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>Hasil Pengecekan</span>
                                <div className="text-sm font-normal text-muted-foreground text-right">
                                    <p>Parent Part: <span className="font-bold text-foreground">{checkedParentPart}</span></p>
                                    <p>Rencana Produksi: <span className="font-bold text-foreground">{checkedQty} Set</span></p>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Child Part</TableHead>
                                            <TableHead>Part Name</TableHead>
                                            <TableHead className="text-center">Qty/Set</TableHead>
                                            <TableHead className="text-center">Butuh</TableHead>
                                            <TableHead className="text-center">Stok</TableHead>
                                            <TableHead className="text-center">Lokasi</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.map((item, index) => (
                                            <TableRow key={index} className={item.status === "SHORTAGE" ? "bg-red-50 dark:bg-red-900/10" : ""}>
                                                <TableCell className="font-medium">{item.childPart}</TableCell>
                                                <TableCell>{item.partName}</TableCell>
                                                <TableCell className="text-center">{item.qtyPerSet}</TableCell>
                                                <TableCell className="text-center font-bold">{item.requiredQty}</TableCell>
                                                <TableCell className="text-center">{item.currentStock}</TableCell>
                                                <TableCell className="text-center">{item.rackLocation}</TableCell>
                                                <TableCell className="text-center">
                                                    {item.status === "OK" ? (
                                                        <span className="inline-flex items-center gap-1 text-green-600 font-bold">
                                                            <CheckCircle className="h-4 w-4" /> OK
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                                                            <AlertCircle className="h-4 w-4" /> KURANG
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {results.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    Tidak ada data child part ditemukan.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Qty Dialog */}
                <Dialog open={isQtyDialogOpen} onOpenChange={setIsQtyDialogOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Masukkan Jumlah Produksi</DialogTitle>
                            <DialogDescription>
                                Berapa set {parentPart} yang akan diproduksi?
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="qty" className="text-right">
                                    Qty
                                </Label>
                                <Input
                                    id="qty"
                                    type="number"
                                    min="1"
                                    value={qtyToProduce}
                                    onChange={(e) => setQtyToProduce(parseInt(e.target.value) || 0)}
                                    className="col-span-3"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            performStockCheck();
                                        }
                                    }}
                                />
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => setIsCountScannerOpen(true)}
                                    title="Scan to Count"
                                >
                                    <PackageSearch className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" onClick={performStockCheck}>
                                Cek Ketersediaan
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* QR Scanner */}
                <QrScanner
                    isOpen={isScannerOpen}
                    onOpenChange={setIsScannerOpen}
                    onScanSuccess={handleScanSuccess}
                    title="Scan Parent Part"
                    description="Scan QR Code pada Kanban atau Label Parent Part"
                />

                <CountScanner
                    isOpen={isCountScannerOpen}
                    onOpenChange={setIsCountScannerOpen}
                    onCountComplete={(count) => setQtyToProduce(count)}
                    initialCount={qtyToProduce}
                    title="Scan Qty Produksi"
                    description="Scan barcode item/box untuk menghitung jumlah produksi"
                />
            </div>
        </div>
    );
};

export default StockCheck;

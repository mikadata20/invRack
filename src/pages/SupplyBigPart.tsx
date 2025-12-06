import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, PackagePlus, ScanLine, Check, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QrScanner from "@/components/QrScanner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

interface PartnerRackItem {
    id: number;
    part_no: string;
    part_name: string;
    qty_per_box: number | null;
    type: "Big" | "Small" | null;
    rack_location: string;
}

const SupplyBigPart = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [step, setStep] = useState<"scan-part" | "input-details">("scan-part");
    const [partNo, setPartNo] = useState("");
    const [partData, setPartData] = useState<PartnerRackItem[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<string>("");
    const [qty, setQty] = useState("");
    const [loading, setLoading] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    const handleScanPart = async () => {
        if (!partNo) {
            toast({ variant: "destructive", title: "Error", description: "Masukkan Part Number" });
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("partner_rack")
                .select("*")
                .eq("part_no", partNo);

            if (error) throw error;

            if (!data || data.length === 0) {
                toast({ variant: "destructive", title: "Not Found", description: "Part Number tidak ditemukan di Partner Rack" });
                return;
            }

            const items = data as PartnerRackItem[];
            setPartData(items);
            setStep("input-details");
            // Default to first location if only one exists
            if (items.length === 1) {
                setSelectedLocation(items[0].rack_location);
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = async () => {
        if (!selectedLocation || !qty) {
            toast({ variant: "destructive", title: "Error", description: "Lengkapi data Qty dan Lokasi" });
            return;
        }

        setLoading(true);
        const startTime = new Date();

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const quantity = parseInt(qty);
            const currentPart = partData[0]; // All entries share same part info

            // 1. Check/Update Inventory
            const { data: existingInv, error: invError } = await supabase
                .from("rack_inventory")
                .select("*")
                .eq("part_no", currentPart.part_no)
                .eq("rack_location", selectedLocation)
                .maybeSingle();

            if (invError) throw invError;

            const inventoryItem = existingInv as any; // Cast to avoid complex type checks
            const oldStock = inventoryItem?.qty || 0;
            const newStock = oldStock + quantity;

            if (inventoryItem) {
                const updatePayload: TablesUpdate<'rack_inventory'> = {
                    qty: newStock,
                    last_supply: new Date().toISOString(),
                    part_name: currentPart.part_name,
                };
                await supabase.from("rack_inventory").update(updatePayload as any).eq("id", inventoryItem.id);
            } else {
                const insertPayload: TablesInsert<'rack_inventory'> = {
                    part_no: currentPart.part_no,
                    part_name: currentPart.part_name,
                    rack_location: selectedLocation,
                    qty: quantity,
                    last_supply: new Date().toISOString(),
                    max_capacity: 100,
                };
                await supabase.from("rack_inventory").insert(insertPayload as any);
            }

            const endTime = new Date();
            const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

            // 2. Transaction Log
            const transLog: TablesInsert<'transaction_log'> = {
                process_type: "SUPPLY",
                part_no: currentPart.part_no,
                rack_location: selectedLocation,
                qty: quantity,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                duration_sec: duration,
                user_id: user?.id || null,
            };
            await supabase.from("transaction_log").insert(transLog as any);

            // 3. Stock Transaction
            const stockTrans: TablesInsert<'stock_transactions'> = {
                transaction_id: `SUP-BIG-${Date.now()}-${currentPart.part_no}`,
                transaction_type: "SUPPLY",
                item_code: currentPart.part_no,
                item_name: currentPart.part_name,
                qty: quantity,
                rack_location: selectedLocation,
                user_id: user?.id || null,
                username: user?.email || "Unknown",
            };
            await supabase.from("stock_transactions").insert(stockTrans as any);

            toast({
                title: "Success",
                description: `Stok berhasil ditambah: ${quantity} pcs ke ${selectedLocation}`,
            });

            // Reset
            setStep("scan-part");
            setPartNo("");
            setPartData([]);
            setSelectedLocation("");
            setQty("");
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleQrScan = (text: string) => {
        setPartNo(text.toUpperCase());
        setIsScannerOpen(false);
        // Optional: auto-trigger search if you want immediate action
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-4">
            <div className="max-w-xl mx-auto space-y-4">
                <Button variant="ghost" onClick={() => navigate("/")} className="mb-2">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
                </Button>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-3 rounded-lg">
                                <PackagePlus className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Supply Big Part</CardTitle>
                                <CardDescription>Supply standard parts to rack based on Partner Rack data</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {step === "scan-part" && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Scan Part Number</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Scan or type Part No"
                                            value={partNo}
                                            onChange={(e) => setPartNo(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => e.key === "Enter" && handleScanPart()}
                                            autoFocus
                                        />
                                        <Button variant="outline" onClick={() => setIsScannerOpen(true)}>
                                            <ScanLine className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <Button className="w-full" onClick={handleScanPart} disabled={loading}>
                                    {loading ? "Searching..." : "Search Part"}
                                </Button>
                            </div>
                        )}

                        {step === "input-details" && partData.length > 0 && (
                            <div className="space-y-6">
                                <div className="bg-muted p-4 rounded-lg space-y-2">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <span className="text-muted-foreground">Part No:</span>
                                        <span className="font-medium">{partData[0].part_no}</span>
                                        <span className="text-muted-foreground">Part Name:</span>
                                        <span className="font-medium">{partData[0].part_name}</span>
                                        <span className="text-muted-foreground">Standard Pack:</span>
                                        <span className="font-medium">{partData[0].qty_per_box} pcs/box</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Quantity Supply</Label>
                                    <Input
                                        type="number"
                                        value={qty}
                                        onChange={(e) => setQty(e.target.value)}
                                        placeholder="Enter Qty"
                                        autoFocus
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label>Select Destination Location</Label>
                                    <RadioGroup value={selectedLocation} onValueChange={setSelectedLocation} className="grid grid-cols-1 gap-2">
                                        {partData.map((item) => (
                                            <div key={item.id} className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50 ${selectedLocation === item.rack_location ? 'border-primary bg-primary/5' : ''}`}>
                                                <RadioGroupItem value={item.rack_location} id={`loc-${item.id}`} />
                                                <Label htmlFor={`loc-${item.id}`} className="flex-1 cursor-pointer flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                                    {item.rack_location}
                                                    {item.type && <span className="ml-auto text-xs bg-secondary px-2 py-0.5 rounded text-secondary-foreground">{item.type}</span>}
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button variant="outline" onClick={() => { setStep("scan-part"); setPartNo(""); setQty(""); }} className="flex-1">
                                        Cancel
                                    </Button>
                                    <Button onClick={handleProcess} disabled={loading} className="flex-1">
                                        {loading ? "Processing..." : "Process Supply"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <QrScanner
                isOpen={isScannerOpen}
                onOpenChange={setIsScannerOpen}
                onScanSuccess={handleQrScan}
                title="Scan Part Number"
            />
        </div>
    );
};

export default SupplyBigPart;

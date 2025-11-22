import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ClipboardList, Search, ScanLine } from "lucide-react";
import ProcessAlert from "@/components/ProcessAlert";
import { processLabel } from "@/utils/labelProcessor";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types"; // Import Tables types
import QrScanner from "@/components/QrScanner"; // Import QrScanner


interface AlertState {
  type: "success" | "error";
  title: string;
  description?: string;
}

const Kobetsu = () => {
  const navigate = useNavigate();
  const [rackLocation, setRackLocation] = useState("");
  const [qty, setQty] = useState("");
  const [scannedLabel, setScannedLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [startTime] = useState(new Date());
  const [bomData, setBomData] = useState<Tables<'bom_master'> | null>(null);
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [step, setStep] = useState<"scan-rack" | "scan-part" | "input-qty">("scan-rack");
  const [scannedPO, setScannedPO] = useState<string | null>(null); // New state for scanned PO

  const [isScannerOpen, setIsScannerOpen] = useState(false); // State for scanner dialog
  const [scanTarget, setScanTarget] = useState<"rackLocation" | "scannedLabel" | null>(null); // To know which input to fill

  const handleScanRack = async () => {
    if (!rackLocation) {
      setAlert({ type: "error", title: "Masukkan Rack Location terlebih dahulu" });
      return;
    }
    setAlert(null);
    setStep("scan-part");
    setAlert({ type: "success", title: `Rack Location: ${rackLocation}` });
  };

  const handleScanPart = async () => {
    if (!scannedLabel) {
      setAlert({ type: "error", title: "Masukkan Label Part Number terlebih dahulu" });
      return;
    }
    setAlert(null);
    setLoading(true);

    try {
      const processed = await processLabel(scannedLabel);
      setAlert({ type: processed.StatusBOM ? "success" : "error", title: processed.Pesan });

      if (!processed.StatusBOM || !processed.PartNo) {
        setBomData(null);
        setCurrentStock(null);
        setLoading(false);
        return;
      }

      // Fetch BOM data for the processed PartNo and rack location
      const { data: bomRawData, error } = await supabase
        .from("bom_master")
        .select("*")
        .eq("child_part", processed.PartNo)
        .eq("location", rackLocation) // Filter by scanned rack location
        .maybeSingle();

      if (error || !bomRawData) {
        setAlert({ type: "error", title: "Part tidak ditemukan di Master BOM untuk Rack ini", description: `Part No: ${processed.PartNo}` });
        setBomData(null);
        setCurrentStock(null);
        setLoading(false);
        return;
      }

      const data = bomRawData as Tables<'bom_master'>;
      setBomData(data);

      // Fetch current stock for the scanned part and rack location
      const { data: inventoryData, error: inventoryError } = await supabase
          .from("rack_inventory")
          .select("qty")
          .eq("part_no", processed.PartNo)
          .eq("rack_location", rackLocation)
          .maybeSingle();

      if (inventoryError) throw inventoryError;

      const stock = (inventoryData as Tables<'rack_inventory'> | null)?.qty ?? 0; // Safely access qty
      setCurrentStock(stock);
      setScannedPO(processed.PO); // Store the scanned PO

      setStep("input-qty");
      setAlert({ 
        type: "success", 
        title: "Part ditemukan", 
        description: `Part No: ${processed.PartNo} - Item: ${data.part_name} - PO: ${processed.PO || 'N/A'}`
      });
    } catch (error: any) {
      setAlert({ type: "error", title: "Error processing label", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!bomData || !rackLocation || !qty) { // Use bomData to ensure part is selected
      setAlert({ type: "error", title: "Lengkapi semua field" });
      return;
    }

    setLoading(true);
    setAlert(null);
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    const quantity = parseInt(qty);
    const partNo = bomData.child_part; // Use partNo from bomData

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const username = user?.email || "Unknown";

      // Validate stock availability using currentStock
      if (currentStock === null || currentStock < quantity) {
        setAlert({ type: "error", title: "Stok tidak cukup", description: `Tersedia: ${currentStock ?? 0}, Diminta: ${quantity}` });
        setLoading(false);
        return;
      }

      const oldStock = currentStock;
      const newStock = oldStock - quantity;

      // Update inventory
      const updatePayload: TablesUpdate<'rack_inventory'> = { 
        qty: newStock,
        last_picking: new Date().toISOString()
      };
      const { error: updateError } = await (supabase
        .from("rack_inventory")
        .update as any)(updatePayload) // Cast to any
        .eq("part_no", partNo)
        .eq("rack_location", rackLocation);

      if (updateError) throw updateError;

      // Log transaction
      const transactionLogPayload: TablesInsert<'transaction_log'> = {
        process_type: "KOBETSU",
        part_no: partNo,
        rack_location: rackLocation,
        qty: quantity,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_sec: duration,
        user_id: user?.id || null,
      };
      const { error: logError } = await (supabase
        .from("transaction_log")
        .insert as any)(transactionLogPayload); // Cast to any

      if (logError) throw logError;

      // Log activity
      const partName = bomData?.part_name || `Part ${partNo}`;
      const activityLogPayload: TablesInsert<'activity_log'> = {
        table_name: "rack_inventory",
        action_type: "KOBETSU",
        record_id: partNo,
        user_id: user?.id || null,
        username: username,
        description: `Kobetsu picking: ${quantity} units of ${partName} from ${rackLocation}`,
        old_data: { qty: oldStock } as any,
        new_data: { qty: newStock } as any,
      };
      await (supabase.from("activity_log").insert as any)([activityLogPayload]); // Cast to any

      // Record stock transaction for traceability
      const transactionId = `KOB-${Date.now()}-${partNo}`;
      const stockTransactionPayload: TablesInsert<'stock_transactions'> = {
        transaction_id: transactionId,
        transaction_type: "KOBETSU",
        item_code: partNo,
        item_name: partName,
        qty: -quantity, // Negative for OUT transaction
        rack_location: rackLocation,
        source_location: null,
        document_ref: scannedPO, // Use the stored PO for document_ref
        user_id: user?.id || null,
        username: username,
        timestamp: new Date().toISOString(),
      };
      await (supabase.from("stock_transactions").insert as any)(stockTransactionPayload); // Cast to any

      setAlert({ type: "success", title: "Stock dikurangi", description: `${quantity} units removed from ${rackLocation} (Sisa: ${newStock})` });

      // Reset form
      setScannedLabel("");
      setRackLocation("");
      setQty("");
      setBomData(null);
      setCurrentStock(null);
      setStep("scan-rack");
      setScannedPO(null); // Reset scanned PO
    } catch (error: any) {
      setAlert({ type: "error", title: "Error processing kobetsu", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "input-qty") {
      setStep("scan-part");
      setQty("");
      setBomData(null);
      setCurrentStock(null);
      setAlert(null);
      setScannedPO(null); // Reset scanned PO
    } else if (step === "scan-part") {
      setStep("scan-rack");
      setScannedLabel("");
      setAlert(null);
    } else {
      navigate("/");
    }
  };

  const handleQrScanSuccess = (decodedText: string) => {
    if (scanTarget === "rackLocation") {
      setRackLocation(decodedText.toUpperCase());
    } else if (scanTarget === "scannedLabel") {
      setScannedLabel(decodedText.toUpperCase());
    }
    setIsScannerOpen(false);
    setScanTarget(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-kobetsu/5 via-background to-kobetsu/10 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-kobetsu/10 p-3 rounded-lg">
                <ClipboardList className="h-6 w-6 text-kobetsu" />
              </div>
              <div>
                <CardTitle>Kobetsu Picking</CardTitle>
                <CardDescription>Manual picking process</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {alert && (
              <ProcessAlert
                type={alert.type}
                title={alert.title}
                description={alert.description}
                onClose={() => setAlert(null)}
              />
            )}

            {/* Step 1: Scan Rack Location */}
            {step === "scan-rack" && (
              <>
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">Langkah 1: Scan Rack Location</p>
                  <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">Pindai lokasi rak untuk memulai picking.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rackLocation">Rack Location</Label>
                  <div className="flex gap-2">
                    <Input
                      id="rackLocation"
                      placeholder="Scan atau ketik Rack Location"
                      value={rackLocation}
                      onChange={(e) => setRackLocation(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && handleScanRack()}
                      autoFocus
                    />
                    <Button 
                      type="button"
                      onClick={() => { setIsScannerOpen(true); setScanTarget("rackLocation"); }}
                      variant="outline"
                      className="shrink-0"
                    >
                      <ScanLine className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button"
                      onClick={handleScanRack}
                      disabled={loading || !rackLocation}
                      className="shrink-0 bg-kobetsu hover:bg-kobetsu/90"
                    >
                      {loading ? "Loading..." : "Proses"}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Scan Part Number */}
            {step === "scan-part" && (
              <>
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg text-sm">
                  <p className="font-semibold text-green-900 dark:text-green-100">Langkah 2: Scan Item Label</p>
                  <p className="text-green-700 dark:text-green-300 text-xs mt-1">Rack: {rackLocation}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scannedLabel">Item Label</Label>
                  <div className="flex gap-2">
                    <Input
                      id="scannedLabel"
                      placeholder="Scan atau ketik Label Part Number"
                      value={scannedLabel}
                      onChange={(e) => setScannedLabel(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && handleScanPart()}
                      autoFocus
                    />
                    <Button 
                      type="button"
                      onClick={() => { setIsScannerOpen(true); setScanTarget("scannedLabel"); }}
                      variant="outline"
                      className="shrink-0"
                    >
                      <ScanLine className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button"
                      onClick={handleScanPart}
                      variant="outline"
                      className="shrink-0 bg-kobetsu hover:bg-kobetsu/90"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Proses
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Input Quantity */}
            {step === "input-qty" && bomData && (
              <>
                <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg text-sm">
                  <p className="font-semibold text-purple-900 dark:text-purple-100">Langkah 3: Input Quantity</p>
                  <p className="text-purple-700 dark:text-purple-300 text-xs mt-1">Rack: {rackLocation}</p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-primary">{bomData.part_name}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p>Part Number: {bomData.child_part}</p>
                    <p>Model: {bomData.model}</p>
                    <p>Parent: {bomData.parent_part}</p>
                    <p>Location: {bomData.location}</p>
                    <p>Current Stock: {currentStock ?? '-'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qty">Quantity</Label>
                  <Input
                    id="qty"
                    type="number"
                    placeholder="Enter quantity"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button
                  onClick={handleProcess}
                  disabled={loading || !qty}
                  className="w-full bg-kobetsu hover:bg-kobetsu/90"
                >
                  {loading ? "Processing..." : "Process Kobetsu"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <QrScanner
        isOpen={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScanSuccess={handleQrScanSuccess}
        title="Scan untuk Kobetsu Picking"
        description={`Memindai untuk: ${scanTarget === "rackLocation" ? "Lokasi Rak" : "Label Part"}`}
      />
    </div>
  );
};

export default Kobetsu;
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, PackagePlus, ScanLine } from "lucide-react";
import ProcessAlert from "@/components/ProcessAlert";
import { processLabel } from "@/utils/labelProcessor";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types"; // Import Tables types
import QrScanner from "@/components/QrScanner"; // Import QrScanner

interface RackItem {
  child_part: string;
  part_name: string;
  qty_per_set: number;
  location: string;
}

interface AlertState {
  type: "success" | "error";
  title: string;
  description?: string;
}

const Supply = () => {
  const navigate = useNavigate();
  const [rackLocation, setRackLocation] = useState("");
  const [rackItems, setRackItems] = useState<RackItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<RackItem | null>(null);
  const [scannedLabel, setScannedLabel] = useState("");
  const [qty, setQty] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"scan-rack" | "scan-item" | "input-qty">("scan-rack");
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [scannedPO, setScannedPO] = useState<string | null>(null); // New state for scanned PO

  const [isScannerOpen, setIsScannerOpen] = useState(false); // State for scanner dialog
  const [scanTarget, setScanTarget] = useState<"rackLocation" | "scannedLabel" | null>(null); // To know which input to fill

  const handleScanRack = async () => {
    if (!rackLocation) {
      setAlert({ type: "error", title: "Masukkan Rack Location terlebih dahulu" });
      return;
    }

    setLoading(true);
    setAlert(null);
    try {
      // Fetch items allocated to this rack from BOM master
      const { data: bomItemsRaw, error } = await supabase
        .from("bom_master")
        .select("child_part, part_name, qty_per_set, location")
        .eq("location", rackLocation);

      if (error) throw error;

      if (!bomItemsRaw || bomItemsRaw.length === 0) {
        setAlert({ type: "error", title: "Tidak ada material di BOM untuk rack ini" });
        setRackItems([]);
        return;
      }

      setRackItems((bomItemsRaw as Tables<'bom_master'>[]).map(item => ({
        child_part: item.child_part,
        part_name: item.part_name,
        qty_per_set: item.qty_per_set,
        location: item.location || '',
      })));
      setStep("scan-item");
      setAlert({ type: "success", title: `Ditemukan ${bomItemsRaw.length} item untuk rack ${rackLocation}` });
    } catch (error: any) {
      setAlert({ type: "error", title: "Error loading rack items", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleScanItem = async () => {
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
        setLoading(false);
        return;
      }

      // Validate item is in the rack's BOM list using the processed PartNo
      const item = rackItems.find(
        (i) => i.child_part.toUpperCase() === processed.PartNo?.toUpperCase()
      );

      if (!item) {
        setAlert({ type: "error", title: "Item tidak ada dalam daftar kebutuhan rack ini", description: `Part No: ${processed.PartNo}` });
        setLoading(false);
        return;
      }

      // Fetch current stock for the selected item and rack location
      const { data: inventoryData, error: inventoryError } = await supabase
          .from("rack_inventory")
          .select("qty")
          .eq("part_no", processed.PartNo)
          .eq("rack_location", rackLocation)
          .maybeSingle();

      if (inventoryError) throw inventoryError;

      const fetchedCurrentStock = (inventoryData as Tables<'rack_inventory'> | null)?.qty ?? 0;
      
      setCurrentStock(fetchedCurrentStock); // Set current stock to state
      setScannedPO(processed.PO); // Store the scanned PO

      setSelectedItem(item);
      setStep("input-qty");
      setAlert({ 
        type: "success", 
        title: "Item ditemukan", 
        description: `Part No: ${processed.PartNo} - Item: ${item.part_name} - PO: ${processed.PO || 'N/A'}`
      });
    } catch (error: any) {
      setAlert({ type: "error", title: "Error processing label or fetching inventory", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSave = async () => {
    if (!selectedItem || !qty || !rackLocation) {
      setAlert({ type: "error", title: "Lengkapi semua data terlebih dahulu" });
      return;
    }

    setLoading(true);
    setAlert(null);
    const startTime = new Date();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const quantity = parseInt(qty);
      const partNo = selectedItem.child_part;
      const partName = selectedItem.part_name;

      // Check if part exists in inventory
      const { data: existingInventoryRaw, error: fetchInventoryError } = await supabase
        .from("rack_inventory")
        .select("*")
        .eq("part_no", partNo)
        .eq("rack_location", rackLocation)
        .maybeSingle();

      if (fetchInventoryError) throw fetchInventoryError;

      const existing = existingInventoryRaw as Tables<'rack_inventory'> | null;

      const oldStock = existing?.qty || 0;
      const newStock = oldStock + quantity;

      if (existing) {
        const updatePayload: TablesUpdate<'rack_inventory'> = { 
          qty: newStock,
          last_supply: new Date().toISOString(),
          part_name: partName,
        };
        const { error: updateError } = await (supabase
          .from("rack_inventory")
          .update as any)(updatePayload) // Cast to any
          .eq("id", existing.id);
        if (updateError) throw updateError;
      } else {
        const insertPayload: TablesInsert<'rack_inventory'> = {
          part_no: partNo,
          part_name: partName,
          rack_location: rackLocation,
          qty: quantity,
          last_supply: new Date().toISOString(),
          max_capacity: 100, // Default value, adjust as needed
        };
        const { error: insertError } = await (supabase
          .from("rack_inventory")
          .insert as any)(insertPayload); // Cast to any
        if (insertError) throw insertError;
      }

      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      // Log transaction
      const transactionLogPayload: TablesInsert<'transaction_log'> = {
        process_type: "SUPPLY",
        part_no: partNo,
        rack_location: rackLocation,
        qty: quantity,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_sec: duration,
        user_id: user?.id || null,
      };
      await (supabase
        .from("transaction_log")
        .insert as any)(transactionLogPayload); // Cast to any

      // Log activity
      const activityLogPayload: TablesInsert<'activity_log'> = {
        table_name: "rack_inventory",
        action_type: "SUPPLY",
        record_id: partNo,
        user_id: user?.id || null,
        username: user?.email || "Unknown",
        description: `Supply ${quantity} units of ${partName} to ${rackLocation}`,
        old_data: { qty: oldStock } as any,
        new_data: { qty: newStock } as any,
      };
      await (supabase.from("activity_log").insert as any)([activityLogPayload]); // Cast to any

      // Record stock transaction for traceability
      const transactionId = `SUP-${Date.now()}-${partNo}`;
      const stockTransactionPayload: TablesInsert<'stock_transactions'> = {
        transaction_id: transactionId,
        transaction_type: "SUPPLY",
        item_code: partNo,
        item_name: partName,
        qty: quantity,
        rack_location: rackLocation,
        source_location: null,
        document_ref: scannedPO, // Use the stored PO for document_ref
        user_id: user?.id || null,
        username: user?.email || "Unknown",
        timestamp: new Date().toISOString(),
      };
      await (supabase.from("stock_transactions").insert as any)(stockTransactionPayload); // Cast to any

      setAlert({ type: "success", title: "Stock berhasil ditambah", description: `${quantity} units ${partName} → ${rackLocation} (Total: ${newStock})` });

      // Reset to scan rack step
      setRackLocation("");
      setRackItems([]);
      setSelectedItem(null);
      setScannedLabel("");
      setQty("");
      setStep("scan-rack");
      setCurrentStock(null);
      setScannedPO(null); // Reset scanned PO
    } catch (error: any) {
      setAlert({ type: "error", title: "Error processing supply", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleQrScanSuccess = (decodedText: string) => {
    if (scanTarget === "rackLocation") {
      setRackLocation(decodedText.toUpperCase());
      // Optionally trigger handleScanRack here, or let user click the button
    } else if (scanTarget === "scannedLabel") {
      setScannedLabel(decodedText.toUpperCase());
      // Optionally trigger handleScanItem here, or let user click the button
    }
    setIsScannerOpen(false);
    setScanTarget(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-supply/5 via-background to-supply/10 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-supply/10 p-3 rounded-lg">
                <PackagePlus className="h-6 w-6 text-supply" />
              </div>
              <div>
                <CardTitle>Supply Process</CardTitle>
                <CardDescription>Add stock to rack location</CardDescription>
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

            {/* Step 1: Scan Rack */}
            {step === "scan-rack" && (
              <>
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">Langkah 1: Scan Rack Location</p>
                  <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">Sistem akan menampilkan daftar material untuk rack tersebut</p>
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
                      className="shrink-0 bg-supply hover:bg-supply/90"
                    >
                      <ScanLine className="h-4 w-4 mr-2" />
                      Scan
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Scan Item */}
            {step === "scan-item" && (
              <>
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg text-sm">
                  <p className="font-semibold text-green-900 dark:text-green-100">Langkah 2: Scan Item dari Daftar</p>
                  <p className="text-green-700 dark:text-green-300 text-xs mt-1">Rack: {rackLocation}</p>
                </div>

                {/* Display items list */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-2 max-h-48 overflow-y-auto">
                  <p className="text-sm font-semibold mb-2">Daftar Material ({rackItems.length} items):</p>
                  {rackItems.map((item, idx) => (
                    <div key={idx} className="text-xs border-b pb-2 last:border-0">
                      <p className="font-semibold">{item.child_part}</p>
                      <p className="text-muted-foreground">{item.part_name}</p>
                      <p className="text-xs">Qty Standar: {item.qty_per_set}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scannedLabel">Scan Item Label</Label>
                  <div className="flex gap-2">
                    <Input
                      id="scannedLabel"
                      placeholder="Scan atau ketik Label Part Number"
                      value={scannedLabel}
                      onChange={(e) => setScannedLabel(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && handleScanItem()}
                      autoFocus
                    />
                    <Button 
                      type="button"
                      onClick={() => { setIsScannerOpen(true); setScanTarget("scannedLabel"); }}
                      className="shrink-0 bg-supply hover:bg-supply/90"
                    >
                      <ScanLine className="h-4 w-4 mr-2" />
                      Scan
                    </Button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("scan-rack");
                    setRackLocation("");
                    setRackItems([]);
                    setScannedLabel("");
                    setAlert(null);
                    setCurrentStock(null);
                    setScannedPO(null); // Reset scanned PO
                  }}
                  className="w-full"
                >
                  Kembali ke Scan Rack
                </Button>
              </>
            )}

            {/* Step 3: Input Qty & Verify */}
            {step === "input-qty" && selectedItem && (
              <>
                <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg text-sm">
                  <p className="font-semibold text-purple-900 dark:text-purple-100">Langkah 3: Input Qty & Verify</p>
                  <p className="text-purple-700 dark:text-purple-300 text-xs mt-1">Rack: {rackLocation}</p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-primary">{selectedItem.part_name}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p>Part Number: {selectedItem.child_part}</p>
                    <p>Current Stock: {currentStock ?? '-'}</p>
                    <p>Location: {selectedItem.location}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qty">Quantity Aktual Supply</Label>
                  <Input
                    id="qty"
                    type="number"
                    placeholder="Masukkan jumlah yang disupply"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep("scan-item");
                      setSelectedItem(null);
                      setScannedLabel("");
                      setQty("");
                      setAlert(null);
                      setCurrentStock(null);
                      setScannedPO(null); // Reset scanned PO
                    }}
                    className="flex-1"
                  >
                    Kembali
                  </Button>
                  <Button
                    onClick={handleVerifyAndSave}
                    disabled={loading || !qty}
                    className="flex-1 bg-supply hover:bg-supply/90"
                  >
                    {loading ? "Processing..." : "Verify & Simpan"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <QrScanner
        isOpen={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScanSuccess={handleQrScanSuccess}
        title="Scan untuk Supply"
        description={`Memindai untuk: ${scanTarget === "rackLocation" ? "Lokasi Rak" : "Label Part"}`}
      />
    </div>
  );
};

export default Supply;
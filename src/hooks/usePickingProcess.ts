import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { processLabel } from "@/utils/labelProcessor";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types"; // Import Tables types

export interface PickingItem {
  id: number;
  sequence: number;
  child_part: string;
  part_name: string;
  location: string; // Expected location from BOM
  qty_bom: number; // Quantity required by BOM
  scannedPartNo: string; // Actual scanned part number (from processed label)
  scannedLocation: string; // Actual scanned location
  scannedQty: number; // Actual scanned quantity
  scannedPO: string | null; // New: Actual scanned PO
  isScanned: boolean;
  isValid: boolean; // Overall validation status for the item
  errorMessage?: string;
  currentStock: number; // Current stock in the rack
}

interface AlertState {
  type: "success" | "error" | "info";
  title: string;
  description?: string;
}

export const usePickingProcess = () => {
  const [kanbanCode, setKanbanCode] = useState("");
  const [pickingItems, setPickingItems] = useState<PickingItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [alert, setAlert] = useState<AlertState | null>(null);

  // Input states for the current item being processed
  const [currentScannedLabel, setCurrentScannedLabel] = useState("");
  const [currentScannedLocation, setCurrentScannedLocation] = useState("");
  const [currentInputQty, setCurrentInputQty] = useState("");

  const partInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setKanbanCode("");
    setPickingItems([]);
    setCurrentItemIndex(0);
    setLoading(false);
    setStartTime(null);
    setCurrentScannedLabel("");
    setCurrentScannedLocation("");
    setCurrentInputQty("");
    setAlert(null);
  };

  const handleScanKanban = async () => {
    if (!kanbanCode.trim()) {
      setAlert({ type: "error", title: "Masukkan Kanban Code" });
      return;
    }

    setLoading(true);
    setAlert(null);
    try {
      const { data: bomItemsRaw, error } = await supabase
        .from("bom_master")
        .select("*")
        .eq("kanban_code", kanbanCode.toUpperCase())
        .order("sequence", { ascending: true });

      if (error) throw error;

      if (!bomItemsRaw || bomItemsRaw.length === 0) {
        setAlert({ type: "error", title: "Tidak ada item ditemukan untuk Kanban ini" });
        setLoading(false);
        return;
      }

      const bomItems = bomItemsRaw as Tables<'bom_master'>[];

      // Fetch current stock for all relevant parts/locations in one go
      const partLocationPairs = bomItems.map(item => ({ part_no: item.child_part, rack_location: item.location }));
      const { data: inventoryDataRaw, error: inventoryError } = await supabase
          .from("rack_inventory")
          .select("part_no, rack_location, qty");

      if (inventoryError) throw inventoryError;

      const inventoryData = inventoryDataRaw as Tables<'rack_inventory'>[];

      const inventoryMap = new Map<string, number>();
      inventoryData?.forEach(inv => {
          inventoryMap.set(`${inv.part_no}-${inv.rack_location}`, inv.qty);
      });

      const items: PickingItem[] = bomItems.map((item) => ({
        id: item.id,
        sequence: item.sequence || 0,
        child_part: item.child_part,
        part_name: item.part_name,
        location: item.location || "", // Expected location from BOM
        qty_bom: item.qty_bom || 1, // Quantity required by BOM
        scannedPartNo: "", // Will be populated after processing label
        scannedLocation: "",
        scannedQty: 0,
        scannedPO: null, // Initialize scanned PO
        isScanned: false,
        isValid: false,
        currentStock: inventoryMap.get(`${item.child_part}-${item.location}`) || 0, // Populate current stock
      }));

      setPickingItems(items);
      setCurrentItemIndex(0);
      setStartTime(new Date());
      setAlert({ type: "success", title: `Loaded ${items.length} items dari kanban ${kanbanCode}` });
      // Focus on the first input for the current item (now location input)
      setTimeout(() => locationInputRef.current?.focus(), 100);
    } catch (error: any) {
      setAlert({ type: "error", title: "Error loading BOM items", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessCurrentItem = async () => {
    const currentItem = pickingItems[currentItemIndex];
    if (!currentItem) return;

    if (!currentScannedLocation.trim()) { // Changed order of validation
      setAlert({ type: "error", title: "Scan Lokasi Rak terlebih dahulu" });
      return;
    }
    if (!currentScannedLabel.trim()) { // Changed order of validation
      setAlert({ type: "error", title: "Scan Label Part Number terlebih dahulu" });
      return;
    }
    if (!currentInputQty || parseInt(currentInputQty) <= 0) {
      setAlert({ type: "error", title: "Masukkan Qty yang valid" });
      return;
    }

    setAlert(null);
    let itemIsValid = true;
    let errorMessage = "";
    let processedPartNo: string | null = null;
    let processedPO: string | null = null; // Added to capture PO

    setLoading(true);
    try {
      const processed = await processLabel(currentScannedLabel);
      
      if (!processed.StatusBOM || !processed.PartNo) {
        itemIsValid = false;
        errorMessage = processed.Pesan;
      } else {
        processedPartNo = processed.PartNo;
        processedPO = processed.PO; // Capture PO
      }

      // 1. Validate Scanned Location
      if (itemIsValid && currentScannedLocation.toUpperCase() !== currentItem.location.toUpperCase()) {
        errorMessage = `Lokasi salah! Expected: ${currentItem.location}, Scanned: ${currentScannedLocation}`;
        setAlert({ type: "error", title: "Verifikasi Gagal", description: errorMessage });
        itemIsValid = false;
      }

      // 2. Validate Scanned Part Number (from processed label)
      if (itemIsValid && processedPartNo?.toUpperCase() !== currentItem.child_part.toUpperCase()) {
        errorMessage = `Part tidak sesuai! Expected: ${currentItem.child_part}, Scanned: ${processedPartNo}`;
        setAlert({ type: "error", title: "Verifikasi Gagal", description: errorMessage });
        itemIsValid = false;
      }

      const quantityToPick = parseInt(currentInputQty);

      // 3. Validate Qty BOM vs Input Qty
      if (itemIsValid && currentItem.qty_bom !== quantityToPick) {
        if (quantityToPick > currentItem.qty_bom) {
          errorMessage = `Qty melebihi standard! Expected: ${currentItem.qty_bom}, Input: ${quantityToPick}`;
        } else {
          errorMessage = `Qty kurang dari standard! Expected: ${currentItem.qty_bom}, Input: ${quantityToPick}`;
        }
        setAlert({ type: "error", title: "Verifikasi Gagal", description: errorMessage });
        itemIsValid = false;
      }

      // 4. Validate Stock Availability (using already fetched currentStock)
      if (itemIsValid) {
        if (currentItem.currentStock < quantityToPick) {
            errorMessage = `Stok tidak cukup di ${currentScannedLocation}. Tersedia: ${currentItem.currentStock}, Diminta: ${quantityToPick}`;
            setAlert({ type: "error", title: "Verifikasi Gagal", description: errorMessage });
            itemIsValid = false;
        }
      }

      const updatedItems = [...pickingItems];
      
      if (itemIsValid) {
        updatedItems[currentItemIndex] = {
          ...currentItem,
          scannedPartNo: processedPartNo || "",
          scannedLocation: currentScannedLocation.toUpperCase(),
          scannedQty: quantityToPick,
          scannedPO: processedPO, // Store the processed PO
          isScanned: true,
          isValid: true,
          errorMessage: undefined,
        };
        setPickingItems(updatedItems);

        // Updated success message for picking process
        setAlert({ 
          type: "success", 
          title: `Item Sequence ${currentItem.sequence} berhasil diproses.`, 
          description: `Part No: ${processedPartNo} - Item: ${currentItem.part_name} - PO: ${processedPO || 'N/A'}` 
        });
        // Move to next item or enable verify button
        if (currentItemIndex < pickingItems.length - 1) {
          setCurrentItemIndex(currentItemIndex + 1);
          setCurrentScannedLabel("");
          setCurrentScannedLocation("");
          setCurrentInputQty("");
          setTimeout(() => locationInputRef.current?.focus(), 100); // Focus on location input for next item
        } else {
          setAlert({ type: "info", title: "Semua item telah diproses.", description: "Klik 'Verify & Complete Picking' untuk menyelesaikan." });
        }
      } else {
        // If not valid, clear inputs and focus back on the location input for re-entry
        // Also update the pickingItems state to reflect the invalid status without storing incorrect scanned data
        updatedItems[currentItemIndex] = {
          ...currentItem,
          scannedPartNo: "", // Clear scanned data in the item itself
          scannedLocation: "", // Clear scanned data in the item itself
          scannedQty: 0, // Clear scanned data in the item itself
          scannedPO: null, // Clear scanned data in the item itself
          isScanned: true, // Mark as attempted scan
          isValid: false,
          errorMessage: errorMessage,
        };
        setPickingItems(updatedItems);

        setCurrentScannedLabel("");
        setCurrentScannedLocation("");
        setCurrentInputQty("");
        setTimeout(() => locationInputRef.current?.focus(), 100); // Focus on location input for re-entry
      }
    } catch (error: any) {
      setAlert({ type: "error", title: "Error processing label", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndCompletePicking = async () => {
    // Final validation before committing
    const invalidItems = pickingItems.filter(item => !item.isValid);
    if (invalidItems.length > 0) {
      setAlert({ 
        type: "error", 
        title: "Tidak dapat menyelesaikan picking", 
        description: `Ada ${invalidItems.length} item dengan kesalahan. Mohon perbaiki terlebih dahulu.` 
      });
      return;
    }

    setLoading(true);
    setAlert(null);
    const endTime = new Date();
    const duration = startTime ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000) : 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const username = user?.email || "Unknown";

      for (const item of pickingItems) {
        // Update inventory
        // We already validated stock, so just proceed with update
        const { data: inventoryRaw, error: fetchInventoryError } = await supabase
          .from("rack_inventory")
          .select("*")
          .eq("part_no", item.child_part)
          .eq("rack_location", item.scannedLocation)
          .maybeSingle();

        if (fetchInventoryError) throw fetchInventoryError;
        if (!inventoryRaw) throw new Error(`Inventory for ${item.child_part} at ${item.scannedLocation} not found.`);

        const inventory = inventoryRaw as Tables<'rack_inventory'>;

        const oldStock = inventory.qty;
        const newStock = oldStock - item.scannedQty;

        const updatePayload: TablesUpdate<'rack_inventory'> = {
          qty: newStock,
          last_picking: new Date().toISOString()
        };
        const { error: updateError } = await (supabase
          .from("rack_inventory")
          .update as any)(updatePayload) // Cast to any
          .eq("id", inventory.id);

        if (updateError) throw updateError;

        // Log transaction
        const transactionLogPayload: TablesInsert<'transaction_log'> = {
          process_type: "PICKING",
          part_no: item.child_part,
          rack_location: item.scannedLocation,
          qty: item.scannedQty,
          start_time: startTime?.toISOString() || new Date().toISOString(),
          end_time: endTime.toISOString(),
          duration_sec: duration,
          is_error: false,
          remarks: `Kanban: ${kanbanCode}, Seq: ${item.sequence}`,
          user_id: user?.id || null,
        };
        await (supabase
          .from("transaction_log")
          .insert as any)(transactionLogPayload); // Cast to any

        // Construct document_ref including Kanban and PO if available
        let documentRef = `Kanban: ${kanbanCode}`;
        if (item.scannedPO) {
          documentRef += `, PO: ${item.scannedPO}`;
        }

        // Record stock transaction for traceability
        const transactionId = `PICK-${Date.now()}-${item.child_part}`;
        const stockTransactionPayload: TablesInsert<'stock_transactions'> = {
          transaction_id: transactionId,
          transaction_type: "PICKING",
          item_code: item.child_part,
          item_name: item.part_name,
          qty: -item.scannedQty, // Negative for OUT transaction
          rack_location: item.scannedLocation,
          source_location: null,
          document_ref: documentRef, // Use the constructed documentRef
          user_id: user?.id || null,
          username: username,
          timestamp: new Date().toISOString(),
        };
        await (supabase.from("stock_transactions").insert as any)(stockTransactionPayload); // Cast to any
      }

      setAlert({ type: "success", title: "✅ Picking berhasil!", description: `${pickingItems.length} items telah diproses untuk Kanban ${kanbanCode}` });

      resetForm();
    } catch (error: any) {
      setAlert({ type: "error", title: "Error completing picking", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Removed goToFirstInvalidItem as it's no longer needed with the new flow

  const allItemsProcessed = pickingItems.length > 0 && pickingItems.every(item => item.isScanned);
  const allItemsValid = pickingItems.length > 0 && pickingItems.every(item => item.isValid);

  return {
    kanbanCode,
    setKanbanCode,
    pickingItems,
    currentItemIndex,
    setCurrentItemIndex,
    loading,
    alert,
    setAlert,
    currentScannedLabel,
    setCurrentScannedLabel,
    currentScannedLocation,
    setCurrentScannedLocation,
    currentInputQty,
    setCurrentInputQty,
    partInputRef,
    locationInputRef,
    qtyInputRef,
    resetForm,
    handleScanKanban,
    handleProcessCurrentItem,
    handleVerifyAndCompletePicking,
    allItemsProcessed,
    allItemsValid,
    // goToFirstInvalidItem, // No longer exported
  };
};
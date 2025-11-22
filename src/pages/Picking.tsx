import { Card, CardContent } from "@/components/ui/card";
import ProcessAlert from "@/components/ProcessAlert";
import PickingHeader from "@/components/picking/PickingHeader";
import KanbanScanStep from "@/components/picking/KanbanScanStep";
import PickingItemsTable from "@/components/picking/PickingItemsTable";
import CurrentItemProcess from "@/components/picking/CurrentItemProcess";
import PickingCompletion from "@/components/picking/PickingCompletion";
import { usePickingProcess } from "@/hooks/usePickingProcess";
import QrScanner from "@/components/QrScanner"; // Import QrScanner
import { useState } from "react"; // Import useState

const Picking = () => {
  const {
    kanbanCode,
    setKanbanCode,
    pickingItems,
    currentItemIndex,
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
    handleScanKanban,
    handleProcessCurrentItem,
    handleVerifyAndCompletePicking,
    allItemsProcessed,
    allItemsValid,
  } = usePickingProcess();

  const currentItem = pickingItems[currentItemIndex];

  const [isScannerOpen, setIsScannerOpen] = useState(false); // State for scanner dialog
  const [scanTarget, setScanTarget] = useState<"kanbanCode" | "currentScannedLocation" | "currentScannedLabel" | null>(null); // To know which input to fill

  const handleQrScanSuccess = (decodedText: string) => {
    if (scanTarget === "kanbanCode") {
      setKanbanCode(decodedText.toUpperCase());
    } else if (scanTarget === "currentScannedLocation") {
      setCurrentScannedLocation(decodedText.toUpperCase());
    } else if (scanTarget === "currentScannedLabel") {
      setCurrentScannedLabel(decodedText.toUpperCase());
    }
    setIsScannerOpen(false);
    setScanTarget(null);
  };

  const handleQrScanClickForKanban = () => {
    setIsScannerOpen(true);
    setScanTarget("kanbanCode");
  };

  const handleQrScanClickForCurrentItem = (target: "currentScannedLocation" | "currentScannedLabel") => {
    setIsScannerOpen(true);
    setScanTarget(target);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-picking/5 via-background to-picking/10 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <PickingHeader
          title="Picking Process"
          description="Scan kanban, pick parts by sequence, and verify"
        />

        <Card>
          <CardContent className="space-y-4">
            {alert && (
              <ProcessAlert
                type={alert.type === "info" ? "success" : alert.type}
                title={alert.title}
                description={alert.description}
                onClose={() => setAlert(null)}
              />
            )}

            {pickingItems.length === 0 ? (
              <KanbanScanStep
                kanbanCode={kanbanCode}
                setKanbanCode={setKanbanCode}
                handleScanKanban={handleScanKanban}
                loading={loading}
                onQrScanClick={handleQrScanClickForKanban} // Pass the new handler
              />
            ) : (
              <>
                <PickingItemsTable
                  pickingItems={pickingItems}
                  currentItemIndex={currentItemIndex}
                  kanbanCode={kanbanCode}
                />

                {/* Current item processing is shown if there's a current item AND (not all items are processed OR (all items are processed AND not all are valid)) */}
                {currentItem && (!allItemsProcessed || (allItemsProcessed && !allItemsValid)) && (
                  <CurrentItemProcess
                    currentItem={currentItem}
                    currentScannedLabel={currentScannedLabel}
                    setCurrentScannedLabel={setCurrentScannedLabel}
                    currentScannedLocation={currentScannedLocation}
                    setCurrentScannedLocation={setCurrentScannedLocation}
                    currentInputQty={currentInputQty}
                    setCurrentInputQty={setCurrentInputQty}
                    handleProcessCurrentItem={handleProcessCurrentItem}
                    loading={loading}
                    partInputRef={partInputRef}
                    locationInputRef={locationInputRef}
                    qtyInputRef={qtyInputRef}
                    onQrScanClick={handleQrScanClickForCurrentItem} // Pass the new handler
                  />
                )}

                {/* Picking completion button only shown if ALL items are processed AND ALL are valid */}
                {allItemsProcessed && allItemsValid && (
                  <PickingCompletion
                    handleVerifyAndCompletePicking={handleVerifyAndCompletePicking}
                    loading={loading}
                    allItemsValid={allItemsValid}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <QrScanner
        isOpen={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScanSuccess={handleQrScanSuccess}
        title="Scan untuk Picking"
        description={`Memindai untuk: ${
          scanTarget === "kanbanCode"
            ? "Kanban Code"
            : scanTarget === "currentScannedLocation"
            ? "Lokasi Rak"
            : "Label Part"
        }`}
      />
    </div>
  );
};

export default Picking;
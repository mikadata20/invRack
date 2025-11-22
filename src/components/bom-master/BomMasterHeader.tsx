import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Upload, Download } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import React from "react";

interface BomMasterHeaderProps {
  onImportClick: (file: File) => void;
  onExportClick: () => void;
  onAddClick: () => void;
}

const BomMasterHeader = ({ onImportClick, onExportClick, onAddClick }: BomMasterHeaderProps) => {
  const navigate = useNavigate();
  const { hasRole } = useUserRole();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportClick(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear the input after selection
    }
  };

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Master Data BOM</h1>
        </div>
        <div className="flex items-center gap-2">
          {hasRole(["admin", "controller"]) && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Import Excel
              </Button>
              <Button variant="outline" onClick={onExportClick}>
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
              <Button onClick={onAddClick}>
                <Plus className="mr-2 h-4 w-4" />
                Add BOM
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default BomMasterHeader;
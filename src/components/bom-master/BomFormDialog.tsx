import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablesInsert } from "@/integrations/supabase/types"; // Import TablesInsert for type consistency

// Define BomData interface locally or derive from Tables<'bom_master'>
export interface BomData {
  id?: number;
  unix_no: string;
  model: string;
  cyl: string | null;
  parent_part: string;
  child_part: string;
  part_name: string;
  bom: string | null;
  qty_bom: number | null;
  qty_per_set: number;
  safety_stock: number | null;
  label_code: string | null;
  rack: string | null;
  location: string | null;
  kanban_code: string | null;
  sequence: number | null;
  assy_line_no: string | null;
  source: string;
  created_at?: string;
  created_by?: string | null;
  updated_at?: string;
}

interface BomFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingBom: BomData | null;
  onSubmit: (data: BomData) => Promise<boolean>;
}

const defaultFormData: BomData = {
  unix_no: "",
  model: "",
  cyl: null,
  parent_part: "",
  child_part: "",
  part_name: "",
  bom: null,
  qty_bom: null,
  qty_per_set: 1,
  safety_stock: null,
  label_code: null,
  rack: null,
  location: null,
  kanban_code: null,
  sequence: null,
  assy_line_no: null,
  source: "KYBJ",
};

const BomFormDialog = ({ isOpen, onOpenChange, editingBom, onSubmit }: BomFormDialogProps) => {
  const [formData, setFormData] = useState<BomData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(editingBom ? { ...editingBom } : defaultFormData);
    }
  }, [isOpen, editingBom]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === "number" ? (parseInt(value) || null) : value,
    }));
  };

  const handleSelectChange = (id: keyof BomData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await onSubmit(formData);
    if (success) {
      onOpenChange(false);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingBom ? "Edit BOM" : "Add New BOM"}</DialogTitle>
          <DialogDescription>
            {editingBom ? "Edit details for the selected Bill of Materials entry." : "Fill in the details to add a new Bill of Materials entry."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unix_no">Unix No*</Label>
              <Input
                id="unix_no"
                value={formData.unix_no}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="model">Model*</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="cyl">Cyl</Label>
              <Input
                id="cyl"
                value={formData.cyl || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="parent_part">Parent Part*</Label>
              <Input
                id="parent_part"
                value={formData.parent_part}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="child_part">Child Part*</Label>
              <Input
                id="child_part"
                value={formData.child_part}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="part_name">Part Name*</Label>
              <Input
                id="part_name"
                value={formData.part_name}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="qty_bom">Picking Qty</Label> {/* Changed from 'BOM' to 'Picking Qty' */}
              <Input
                id="qty_bom"
                type="number"
                value={formData.qty_bom ?? ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="qty_per_set">Qty Per Set</Label>
              <Input
                id="qty_per_set"
                type="number"
                value={formData.qty_per_set}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="safety_stock">Safety Stock</Label>
              <Input
                id="safety_stock"
                type="number"
                value={formData.safety_stock ?? ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="label_code">Label Code</Label>
              <Input
                id="label_code"
                value={formData.label_code || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="rack">Rack</Label>
              <Input
                id="rack"
                value={formData.rack || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="kanban_code">Kanban Code</Label>
              <Input
                id="kanban_code"
                value={formData.kanban_code || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="sequence">Sequence</Label>
              <Input
                id="sequence"
                type="number"
                value={formData.sequence ?? ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="assy_line_no">Assy Line No</Label>
              <Input
                id="assy_line_no"
                value={formData.assy_line_no || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="source">Source*</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => handleSelectChange("source", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KYBJ">KYBJ</SelectItem>
                  <SelectItem value="KIMZ">KIMZ</SelectItem>
                  <SelectItem value="NSSI">NSSI</SelectItem>
                  <SelectItem value="KCMI">KCMI</SelectItem>
                  <SelectItem value="GM">GM</SelectItem>
                  <SelectItem value="YSN">YSN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : (editingBom ? "Update" : "Create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BomFormDialog;
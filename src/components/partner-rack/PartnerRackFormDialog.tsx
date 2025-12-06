import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablesInsert } from "@/integrations/supabase/types";

export interface PartnerRackData {
    id?: number;
    part_no: string;
    part_name: string;
    qty_per_box: number | null;
    type: "Big" | "Small" | null;
    rack_location: string;
    default_model_url: string | null;
}

interface PartnerRackFormDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    editingItem: PartnerRackData | null;
    onSubmit: (data: PartnerRackData) => Promise<boolean>;
}

const defaultFormData: PartnerRackData = {
    part_no: "",
    part_name: "",
    qty_per_box: 0,
    type: null,
    rack_location: "",
    default_model_url: "",
};

const PartnerRackFormDialog = ({ isOpen, onOpenChange, editingItem, onSubmit }: PartnerRackFormDialogProps) => {
    const [formData, setFormData] = useState<PartnerRackData>(defaultFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(editingItem ? { ...editingItem } : defaultFormData);
        }
    }, [isOpen, editingItem]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [id]: type === "number" ? (parseInt(value) || 0) : value,
        }));
    };

    const handleSelectChange = (id: keyof PartnerRackData, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [id]: value === "none" ? null : value,
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
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingItem ? "Edit Partner Rack" : "Add Partner Rack"}</DialogTitle>
                    <DialogDescription>
                        {editingItem ? "Edit details for the selected item." : "Add a new item location mapping."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="part_no">Part No*</Label>
                            <Input
                                id="part_no"
                                value={formData.part_no}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="part_name">Part Name*</Label>
                            <Input
                                id="part_name"
                                value={formData.part_name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="qty_per_box">Qty/Box</Label>
                                <Input
                                    id="qty_per_box"
                                    type="number"
                                    value={formData.qty_per_box || ""}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="type">Type</Label>
                                <Select
                                    value={formData.type || "none"}
                                    onValueChange={(value) => handleSelectChange("type", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="Big">Big</SelectItem>
                                        <SelectItem value="Small">Small</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="rack_location">Rack Location*</Label>
                            <Input
                                id="rack_location"
                                value={formData.rack_location}
                                onChange={handleChange}
                                required
                                placeholder="e.g. A-1-2"
                            />
                            <p className="text-xs text-muted-foreground">One part can have multiple entries for different locations.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="default_model_url">Default Model URL or File Info</Label>
                            <Input
                                id="default_model_url"
                                value={formData.default_model_url || ""}
                                onChange={handleChange}
                                placeholder="https://teachablemachine.withgoogle.com/models/..."
                            />
                            <p className="text-xs text-muted-foreground">Optional: Auto-load this model in Smart Counter.</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : (editingItem ? "Update" : "Create")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default PartnerRackFormDialog;

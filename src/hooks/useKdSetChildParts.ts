import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

export interface KdSetChildPart {
  id: number | null;
  part_no: string | null;
  part_name: string | null;
  rack_location: string | null;
  qty: number | null;
  safety_stock: number | null;
  last_supply: string | null;
  last_picking: string | null;
  updated_at: string | null;
  qty_bom: number | null;
  qty_per_set: number | null;
  model: string | null;
  cyl: string | null;
  parent_part: string | null;
  sets: number | null;
}

export const useKdSetChildParts = (
  model: string | null,
  cyl: string | null,
  parentPart: string | null,
  isEnabled: boolean
) => {
  const [childParts, setChildParts] = useState<KdSetChildPart[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEnabled && model && cyl && parentPart) {
      fetchChildParts(model, cyl, parentPart);
    } else {
      setChildParts([]);
    }
  }, [isEnabled, model, cyl, parentPart]);

  const fetchChildParts = async (model: string, cyl: string, parentPart: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("enriched_rack_inventory")
        .select("*")
        .eq("model", model)
        .eq("cyl", cyl)
        .eq("parent_part", parentPart)
        .order("rack_location", { ascending: true });

      if (error) throw error;

      setChildParts((data as Tables<'enriched_rack_inventory'>[]) || []);
    } catch (error: any) {
      toast.error("Error loading child part details", { description: error.message });
      setChildParts([]);
    } finally {
      setLoading(false);
    }
  };

  return { childParts, loading };
};
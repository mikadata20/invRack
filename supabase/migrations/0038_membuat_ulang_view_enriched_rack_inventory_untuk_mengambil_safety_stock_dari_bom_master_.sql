CREATE OR REPLACE VIEW public.enriched_rack_inventory AS
SELECT
  ri.id,
  ri.part_no,
  ri.part_name,
  ri.rack_location,
  ri.qty,
  bm.safety_stock, -- Mengambil safety_stock dari bom_master
  ri.last_supply,
  ri.last_picking,
  ri.updated_at,
  bm.bom,
  bm.qty_bom,
  bm.qty_per_set,
  bm.model,
  bm.cyl,
  bm.parent_part,
  public.get_sets_value(ri.qty, bm.qty_per_set) AS sets
FROM
  public.rack_inventory AS ri
LEFT JOIN
  public.bom_master AS bm ON ri.part_no = bm.child_part AND ri.rack_location = bm.location;
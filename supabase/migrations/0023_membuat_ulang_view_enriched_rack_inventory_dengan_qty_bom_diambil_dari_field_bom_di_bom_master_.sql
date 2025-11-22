CREATE OR REPLACE VIEW public.enriched_rack_inventory AS
SELECT
  ri.id,
  ri.part_no,
  ri.part_name,
  ri.rack_location,
  ri.qty,
  ri.safety_stock,
  ri.last_supply,
  ri.last_picking,
  ri.updated_at,
  bm.bom, -- Kolom 'bom' dari bom_master
  bm.bom AS qty_bom, -- Kolom 'qty_bom' di view sekarang diambil dari 'bom' di bom_master
  bm.qty_per_set,
  public.get_sets_value(ri.qty, bm.qty_per_set) AS sets -- Perhitungan 'sets' tetap menggunakan qty_per_set
FROM
  public.rack_inventory AS ri
LEFT JOIN
  public.bom_master AS bm ON ri.part_no = bm.child_part AND ri.rack_location = bm.location;
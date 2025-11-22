CREATE OR REPLACE VIEW public.kd_set_summary AS
SELECT
  model,
  cyl,
  parent_part,
  MIN(sets) AS qty_min,
  MAX(sets) AS qty_max
FROM
  public.enriched_rack_inventory
WHERE
  model IS NOT NULL AND cyl IS NOT NULL AND parent_part IS NOT NULL
GROUP BY
  model,
  cyl,
  parent_part
ORDER BY
  model,
  cyl,
  parent_part;
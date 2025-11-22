CREATE OR REPLACE FUNCTION public.get_sets_value(current_qty integer, bom_qty integer)
RETURNS numeric
LANGUAGE plpgsql
AS $$
BEGIN
  IF bom_qty IS NULL OR bom_qty = 0 THEN
    RETURN 0;
  ELSE
    RETURN current_qty::numeric / bom_qty::numeric;
  END IF;
END;
$$;
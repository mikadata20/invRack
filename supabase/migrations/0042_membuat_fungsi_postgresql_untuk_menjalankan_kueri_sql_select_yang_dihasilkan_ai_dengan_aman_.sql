CREATE OR REPLACE FUNCTION public.run_sql_query(query_string TEXT)
RETURNS TABLE(result JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow SELECT queries
  IF LOWER(TRIM(query_string)) LIKE 'select %' THEN
    RETURN QUERY EXECUTE query_string;
  ELSE
    RAISE EXCEPTION 'Only SELECT queries are allowed.';
  END IF;
END;
$$;

-- Grant usage to authenticated users (or specific roles if preferred)
GRANT EXECUTE ON FUNCTION public.run_sql_query(TEXT) TO authenticated;
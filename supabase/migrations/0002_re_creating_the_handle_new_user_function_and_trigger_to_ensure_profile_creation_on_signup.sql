-- 1. Re-create the function to insert profile data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = '' -- CRITICAL: Ensures function runs with elevated privileges
AS $$
BEGIN
  -- Insert the new user's ID and use their email as the default username
  INSERT INTO public.profiles (id, username, role, is_active)
  VALUES (
    new.id, 
    new.email, 
    'operator', -- Default role
    TRUE
  );
  RETURN new;
END;
$$;

-- 2. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Create the trigger to run AFTER INSERT on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
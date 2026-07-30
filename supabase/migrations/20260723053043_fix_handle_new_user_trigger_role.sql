/*
# Fix handle_new_user trigger to use correct role values

The trigger function that auto-creates profiles on signup was:
1. Defaulting role to 'admin' instead of 'administrator'
2. Not lowercasing the role value from user metadata

This updates the trigger to:
1. Default to 'administrator' (matching the profiles table convention)
2. Lowercase the role value via LOWER() to ensure consistency

1. Security
- No RLS changes. Only modifies the trigger function.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, company, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'administrator')),
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$function$;

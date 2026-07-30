/*
# Fix profiles DELETE policy role comparison

The profiles table stores roles in lowercase full form: 'administrator', 'driver', 'dispatcher', 'hospital'.
The DELETE policy was checking for `role = 'admin'` which never matches 'administrator'.
This updates the policy to check for 'administrator' instead.

1. Security
- Drop and recreate the profiles DELETE policy with correct role value.
*/

DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'administrator')
  );

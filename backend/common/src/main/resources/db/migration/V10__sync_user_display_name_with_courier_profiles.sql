-- Reconcile historical drift between users.display_name/phone_number
-- and courier_profiles.display_name/phone for courier accounts.
UPDATE users u
SET display_name = cp.display_name,
    phone_number = cp.phone
FROM courier_profiles cp
WHERE cp.user_id = u.id
  AND (
      u.display_name IS DISTINCT FROM cp.display_name
      OR u.phone_number IS DISTINCT FROM cp.phone
  );

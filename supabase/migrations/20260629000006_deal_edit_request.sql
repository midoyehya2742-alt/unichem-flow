-- Add edit_request jsonb column to deals table to track salesman edit requests
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS edit_request jsonb;

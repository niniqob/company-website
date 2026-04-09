-- Add is_top_brand column to brands table
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS is_top_brand boolean NOT NULL DEFAULT false;
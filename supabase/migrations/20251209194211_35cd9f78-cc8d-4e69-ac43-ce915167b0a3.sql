-- Add soft delete column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Add search keywords column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS search_keywords TEXT NULL;
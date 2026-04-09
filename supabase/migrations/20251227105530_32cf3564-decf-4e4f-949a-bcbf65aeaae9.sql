-- Add product_type column to products table
ALTER TABLE public.products
ADD COLUMN product_type TEXT NOT NULL DEFAULT 'part';

-- Add check constraint to validate product_type values
ALTER TABLE public.products
ADD CONSTRAINT products_product_type_check CHECK (product_type IN ('part', 'catalyst'));

-- Create index for filtering by product_type
CREATE INDEX idx_products_product_type ON public.products (product_type);
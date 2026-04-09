-- Add is_featured column to products table
ALTER TABLE public.products 
ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;
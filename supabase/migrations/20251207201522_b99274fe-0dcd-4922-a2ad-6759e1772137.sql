-- Add low_stock_threshold column to products table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'low_stock_threshold'
    ) THEN
        ALTER TABLE public.products ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 5;
    END IF;
END $$;
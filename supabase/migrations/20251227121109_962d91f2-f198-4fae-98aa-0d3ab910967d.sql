-- Create catalyst_categories table
CREATE TABLE public.catalyst_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create catalysts table
CREATE TABLE public.catalysts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.catalyst_categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on category_id for faster lookups
CREATE INDEX idx_catalysts_category_id ON public.catalysts(category_id);

-- Enable RLS on both tables
ALTER TABLE public.catalyst_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalysts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for catalyst_categories
CREATE POLICY "Catalyst categories are publicly viewable"
ON public.catalyst_categories
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert catalyst categories"
ON public.catalyst_categories
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update catalyst categories"
ON public.catalyst_categories
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete catalyst categories"
ON public.catalyst_categories
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for catalysts
CREATE POLICY "Catalysts are publicly viewable"
ON public.catalysts
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert catalysts"
ON public.catalysts
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update catalysts"
ON public.catalysts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete catalysts"
ON public.catalysts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
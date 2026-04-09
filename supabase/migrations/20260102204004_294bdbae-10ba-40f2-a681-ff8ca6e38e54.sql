-- Create vehicle_models table if not exists
CREATE TABLE IF NOT EXISTS public.vehicle_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make_id UUID NOT NULL REFERENCES public.vehicle_makes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (make_id, name)
);

-- Enable RLS on vehicle_models
ALTER TABLE public.vehicle_models ENABLE ROW LEVEL SECURITY;

-- RLS policies for vehicle_models
CREATE POLICY "Vehicle models are publicly viewable"
ON public.vehicle_models
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert vehicle models"
ON public.vehicle_models
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update vehicle models"
ON public.vehicle_models
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete vehicle models"
ON public.vehicle_models
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index on make_id for vehicle_models
CREATE INDEX IF NOT EXISTS idx_vehicle_models_make_id ON public.vehicle_models(make_id);

-- Create product_vehicle_compatibility join table
CREATE TABLE IF NOT EXISTS public.product_vehicle_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  make_id UUID NOT NULL REFERENCES public.vehicle_makes(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.vehicle_models(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, make_id, model_id)
);

-- Enable RLS on product_vehicle_compatibility
ALTER TABLE public.product_vehicle_compatibility ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_vehicle_compatibility
CREATE POLICY "Product compatibility is publicly viewable"
ON public.product_vehicle_compatibility
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert product compatibility"
ON public.product_vehicle_compatibility
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update product compatibility"
ON public.product_vehicle_compatibility
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete product compatibility"
ON public.product_vehicle_compatibility
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for product_vehicle_compatibility
CREATE INDEX IF NOT EXISTS idx_product_vehicle_compatibility_product_id ON public.product_vehicle_compatibility(product_id);
CREATE INDEX IF NOT EXISTS idx_product_vehicle_compatibility_make_id ON public.product_vehicle_compatibility(make_id);
CREATE INDEX IF NOT EXISTS idx_product_vehicle_compatibility_model_id ON public.product_vehicle_compatibility(model_id);